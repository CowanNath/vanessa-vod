import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

interface ActiveDownload {
  proc: ReturnType<typeof spawn>;
  safeName: string;
  saveDir: string;
  cancelled: boolean;
}

function getActiveDownloads(): Map<string, ActiveDownload> {
  const g = globalThis as Record<string, unknown>;
  if (!g.__activeDownloads) {
    g.__activeDownloads = new Map<string, ActiveDownload>();
  }
  return g.__activeDownloads as Map<string, ActiveDownload>;
}

function cleanupFiles(safeName: string, dirs: string[]) {
  for (const dir of dirs) {
    try {
      for (const entry of fs.readdirSync(dir)) {
        if (entry.startsWith(safeName)) {
          fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
        }
      }
    } catch {}
  }
}

function buildFFmpegArgs(url: string, outputPath: string, headerStr: string): string[] {
  const proxy = process.env.DOWNLOAD_PROXY || process.env.HTTP_PROXY || process.env.HTTPS_PROXY || "";
  const args: string[] = [];

  // proxy
  if (proxy) {
    args.push("-http_proxy", proxy);
  }

  // headers
  args.push("-headers", headerStr);

  // timeout & reconnect
  args.push("-timeout", "30000000");
  args.push("-reconnect", "1");
  args.push("-reconnect_streamed", "1");
  args.push("-reconnect_delay_max", "5");

  // input
  args.push("-i", url);

  // progress & log level (must be before output)
  args.push("-progress", "pipe:2");
  args.push("-loglevel", "info");

  // output: copy streams, no re-encode
  args.push("-c", "copy");
  args.push("-y");
  args.push("-movflags", "+faststart");
  args.push("-threads", "8");
  args.push(outputPath);

  return args;
}

export async function POST(request: NextRequest): Promise<Response> {
  const { url, fileName, downloadId } = await request.json();

  if (!url || !fileName || !downloadId) {
    return new Response(JSON.stringify({ error: "Missing parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const safeName = fileName.replace(/[<>:"/\\|?*]/g, "_");
  const saveDir = path.join(process.cwd(), "downloads");
  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
  const outputPath = path.join(saveDir, `${safeName}.mp4`);

  console.log(`[download] START id=${downloadId} name="${safeName}" output=${outputPath}`);

  const parsed = new URL(url);
  const headerStr = `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36\r\nReferer: ${parsed.origin}/\r\n`;

  let ctrl: ReadableStreamDefaultController;
  const stream = new ReadableStream({ start(c) { ctrl = c; } });
  const encoder = new TextEncoder();
  const activeDownloads = getActiveDownloads();

  const tryEnqueue = (data: Uint8Array) => {
    try { ctrl.enqueue(data); } catch {}
  };

  const sendDone = (success: boolean, message: string) => {
    tryEnqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", success, message })}\n\n`));
    try { ctrl.close(); } catch {}
  };

  try {
    const args = buildFFmpegArgs(url, outputPath, headerStr);
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

    const ctx: ActiveDownload = { proc, safeName, saveDir, cancelled: false };
    activeDownloads.set(downloadId, ctx);

    // progress comes from -progress pipe:2 → stderr
    let totalDuration = 0;
    let stderrBuf = "";

    proc.stderr.on("data", (data: Buffer) => {
      if (ctx.cancelled) return;
      const text = data.toString();

      // parse progress output
      const timeMatch = text.match(/out_time_us=(\d+)/);
      if (timeMatch && totalDuration > 0) {
        const current = parseInt(timeMatch[1]) / 1_000_000;
        const percent = Math.min((current / totalDuration) * 100, 100);
        tryEnqueue(encoder.encode(`data: ${JSON.stringify({ type: "progress", percent, name: safeName })}\n\n`));
      }

      // parse duration from ffmpeg info output
      stderrBuf += text;
      if (totalDuration === 0) {
        const m = stderrBuf.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (m) {
          totalDuration = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 100;
        }
      }
    });

    proc.stdout.on("data", () => {});

    proc.on("close", (code) => {
      activeDownloads.delete(downloadId);
      if (ctx.cancelled) {
        console.log(`[download] CANCELLED id=${downloadId} name="${safeName}"`);
        try { ctrl.close(); } catch {}
        return;
      }
      if (code !== 0) {
        console.error(`[download] FAILED id=${downloadId} name="${safeName}" exitCode=${code}`);
        cleanupFiles(safeName, [process.cwd(), saveDir]);
      } else {
        console.log(`[download] DONE id=${downloadId} name="${safeName}" path=${outputPath}`);
      }
      const success = code === 0;
      sendDone(success, success ? "下载完成" : `下载失败 (exit code: ${code})`);
    });

    proc.on("error", (err) => {
      activeDownloads.delete(downloadId);
      console.error(`[download] ERROR id=${downloadId} name="${safeName}" error=${err.message}`);
      if (ctx.cancelled) {
        try { ctrl.close(); } catch {}
        return;
      }
      sendDone(false, `ffmpeg 不可用: ${err.message}`);
    });
  } catch (err) {
    sendDone(false, (err as Error).message);
  }

  return new Response(stream, { headers: sseHeaders() });
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const activeDownloads = getActiveDownloads();

  if (!id || !activeDownloads.has(id)) {
    return NextResponse.json({ error: "Download not found" }, { status: 404 });
  }

  const ctx = activeDownloads.get(id)!;
  ctx.cancelled = true;
  console.log(`[download] CANCEL id=${id} name="${ctx.safeName}"`);

  if (!ctx.proc.killed) {
    ctx.proc.kill("SIGKILL");
  }

  await new Promise<void>((resolve) => {
    if (ctx.proc.exitCode !== null) resolve();
    else ctx.proc.on("close", () => resolve());
  });

  await new Promise((r) => setTimeout(r, 300));
  cleanupFiles(ctx.safeName, [process.cwd(), ctx.saveDir]);
  activeDownloads.delete(id);

  return NextResponse.json({ success: true });
}

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  };
}
