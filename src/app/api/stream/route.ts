import { NextRequest, NextResponse } from "next/server";
import { rewriteM3u8 } from "../../../lib/m3u8";
import { isSafePublicUrl } from "../../../lib/security";

const STREAM_TIMEOUT = 15000; // 15s，仅约束"拿到响应头"阶段，不中断正常的流式传输

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get("url");

  if (!streamUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  if (!isSafePublicUrl(streamUrl)) {
    return NextResponse.json({ error: "不允许的地址" }, { status: 400 });
  }

  try {
    const parsed = new URL(streamUrl);
    const origin = parsed.origin;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT);

    let response: Response;
    try {
      const range = request.headers.get("range");
      response = await fetch(streamUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Referer": origin + "/",
          "Origin": origin,
          "Accept": "*/*",
          ...(range ? { Range: range } : {}),
        },
        signal: controller.signal,
        cache: "no-cache",
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok && response.status !== 206) {
      return new NextResponse("Stream fetch failed", { status: response.status });
    }

    let contentType = response.headers.get("content-type") || "application/octet-stream";

    // 如果是 .ts 文件，强制设置正确的 Content-Type
    if (streamUrl.toLowerCase().split("?")[0].endsWith(".ts")) {
      contentType = "video/mp2t";
    }

    const ct = contentType.toLowerCase();
    // 如果是 m3u8 播放列表，改写 URL 走代理，并按域名投票剔除广告分段
    if (ct.includes("mpegurl") || ct.includes("m3u8") || streamUrl.split("?")[0].toLowerCase().endsWith(".m3u8")) {
      const text = await response.text();
      const { body, droppedAds } = rewriteM3u8(text, streamUrl);
      if (droppedAds > 0) {
        console.log(`[stream] filtered ${droppedAds} ad segment(s) from ${parsed.host}`);
      }
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          // 源站广告分段是每次请求动态注入的，播放列表绝不能被浏览器缓存，
          // 否则过滤结果会过期（分段本身仍可长缓存）
          "Cache-Control": "no-store",
        },
      });
    }

    // 媒体分段/直链：流式转发，透传 Range 相关响应头，保证 mp4 直链可 seek
    const headers = new Headers({
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    });
    // fetch 会自动解压 gzip 响应，此时上游 content-length 描述的是压缩前体积，
    // 与实际转发字节数不符，必须丢弃（否则浏览器报 ERR_CONTENT_LENGTH_MISMATCH，
    // 典型受害者是 AES-128 的 key 拉取 → 正片无法解密播放）
    const compressed = !!response.headers.get("content-encoding");
    for (const h of ["content-length", "content-range", "accept-ranges"]) {
      if (h === "content-length" && compressed) continue;
      const v = response.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new NextResponse(response.body, { status: response.status, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort") || msg.includes("timeout")) {
      return NextResponse.json({ error: "流请求超时" }, { status: 504 });
    }
    console.error("Stream Proxy Error:", err);
    return NextResponse.json({ error: "Stream fetch failed" }, { status: 502 });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
