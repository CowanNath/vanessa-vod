import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { isSafePublicUrl } from "../../../lib/security";
import { buildFilteredPlaylist } from "../../../lib/filtered-playlist";

const DL_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface ActiveDownload {
  proc: ReturnType<typeof spawn>;
  safeName: string;
  saveDir: string;
  cancelled: boolean;
  name: string;
  progress: number;
  startedAt: number;
}

interface DownloadHistoryEntry {
  name: string;
  fileName: string;
  status: "done" | "failed" | "cancelled";
  finishedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_FILE = path.join(DATA_DIR, "downloads.json");
const HISTORY_LIMIT = 200;

function getActiveDownloads(): Map<string, ActiveDownload> {
  const g = globalThis as Record<string, unknown>;
  if (!g.__activeDownloads) {
    g.__activeDownloads = new Map<string, ActiveDownload>();
  }
  return g.__activeDownloads as Map<string, ActiveDownload>;
}

function readHistory(): DownloadHistoryEntry[] {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendHistory(entry: DownloadHistoryEntry) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const items = readHistory();
    items.unshift(entry);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(items.slice(0, HISTORY_LIMIT), null, 2), "utf-8");
  } catch {}
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

function buildFFmpegArgs(inputPath: string, outputPath: string, headerStr: string): string[] {
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

  // input: force HLS format and allow all segment extensions;
  // 部分源把分段伪装成 .jpg 等扩展名，ffmpeg 8 的 extension_picky 默认严格校验会拒载
  args.push("-f", "hls");
  args.push("-allowed_extensions", "ALL");
  args.push("-extension_picky", "0");
  args.push("-i", inputPath);

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

// 任务列表：活跃任务 + 历史记录（下载面板用）
export async function GET() {
  const active = [...getActiveDownloads().entries()].map(([id, d]) => ({
    id,
    name: d.name,
    progress: d.progress,
    startedAt: d.startedAt,
  }));
  return NextResponse.json({ active, history: readHistory() });
}

export async function POST(request: NextRequest): Promise<Response> {
  const { url, fileName, downloadId } = await request.json();

  if (!url || !fileName || !downloadId) {
    return new Response(JSON.stringify({ error: "Missing parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!isSafePublicUrl(url)) {
    return new Response(JSON.stringify({ error: "不允许的下载地址" }), {
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
  const headerStr = `User-Agent: ${DL_UA}\r\nReferer: ${parsed.origin}/\r\n`;

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

  // 去广告：预检净化播放列表可用后，把输入指向本地端点 /api/download/playlist
  // （ffmpeg 以 http 协议读取，-headers 保持合法；分段仍由 ffmpeg 直连源站拉取）
  // 任一步不可用则回退原始地址直下（与旧行为一致）
  let inputTarget = url;
  if (await buildFilteredPlaylist(url)) {
    const port = process.env.PORT || "8608";
    inputTarget = `http://127.0.0.1:${port}/api/download/playlist?url=${encodeURIComponent(url)}`;
    console.log(`[download] ad-filter enabled via local playlist endpoint`);
  } else {
    console.log(`[download] ad-filter unavailable, downloading original url directly`);
  }

  try {
    const args = buildFFmpegArgs(inputTarget, outputPath, headerStr);
    console.log(`[download] CMD   ffmpeg ${args.join(" ")}`);
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

    const ctx: ActiveDownload = {
      proc,
      safeName,
      saveDir,
      cancelled: false,
      name: fileName,
      progress: 0,
      startedAt: Date.now(),
    };
    activeDownloads.set(downloadId, ctx);

    // progress comes from -progress pipe:2 → stderr
    let totalDuration = 0;
    let stderrBuf = "";
    let progressBuf = "";

    proc.stderr.on("data", (data: Buffer) => {
      if (ctx.cancelled) return;
      const text = data.toString();

      // parse duration from ffmpeg info output
      stderrBuf += text;
      if (totalDuration === 0) {
        const m = stderrBuf.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (m) {
          totalDuration = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 100;
        }
      }

      // 按行缓冲解析进度，避免 chunk 截断行导致丢进度
      progressBuf += text;
      const lines = progressBuf.split(/\r?\n/);
      progressBuf = lines.pop() ?? "";
      for (const line of lines) {
        const timeMatch = line.match(/out_time_us=(\d+)/);
        if (timeMatch && totalDuration > 0) {
          const current = parseInt(timeMatch[1]) / 1_000_000;
          const percent = Math.min((current / totalDuration) * 100, 100);
          ctx.progress = percent;
          tryEnqueue(encoder.encode(`data: ${JSON.stringify({ type: "progress", percent, name: safeName })}\n\n`));
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
      const success = code === 0;
      if (success) {
        console.log(`[download] DONE id=${downloadId} name="${safeName}" path=${outputPath}`);
      } else {
        console.error(`[download] FAILED id=${downloadId} name="${safeName}" exitCode=${code}`);
        // 跳过 ffmpeg 启动横幅（约 2KB 配置信息），只输出有效报错
        const bannerEnd = stderrBuf.lastIndexOf("libpostproc");
        const usefulErr = bannerEnd >= 0 ? stderrBuf.slice(bannerEnd) : stderrBuf.slice(-2000);
        console.error(`[download] STDERR:\n${usefulErr}`);
        cleanupFiles(safeName, [saveDir]);
      }
      appendHistory({
        name: ctx.name,
        fileName: `${safeName}.mp4`,
        status: success ? "done" : "failed",
        finishedAt: new Date().toISOString(),
      });
      sendDone(success, success ? "下载完成" : `下载失败 (exit code: ${code})`);
    });

    proc.on("error", (err) => {
      activeDownloads.delete(downloadId);
      console.error(`[download] ERROR id=${downloadId} name="${safeName}" error=${err.message}`);
      if (ctx.cancelled) {
        try { ctrl.close(); } catch {}
        return;
      }
      appendHistory({
        name: ctx.name,
        fileName: `${safeName}.mp4`,
        status: "failed",
        finishedAt: new Date().toISOString(),
      });
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
  cleanupFiles(ctx.safeName, [ctx.saveDir]);
  activeDownloads.delete(id);

  appendHistory({
    name: ctx.name,
    fileName: `${ctx.safeName}.mp4`,
    status: "cancelled",
    finishedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  };
}
