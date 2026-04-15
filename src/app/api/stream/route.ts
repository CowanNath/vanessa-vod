import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get("url");

  if (!streamUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const parsed = new URL(streamUrl);
    const origin = parsed.origin;

    const response = await fetch(streamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": origin + "/", 
        "Origin": origin,
        "Accept": "*/*",
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      return new NextResponse("Stream fetch failed", { status: response.status });
    }

    let contentType = response.headers.get("content-type") || "application/octet-stream";

    // 如果是 .ts 文件，强制设置正确的 Content-Type
    if (streamUrl.toLowerCase().split('?')[0].endsWith(".ts")) {
      contentType = "video/mp2t";
    }

    const ct = contentType.toLowerCase();
    // If this is an m3u8 playlist, rewrite URLs to go through our proxy
    if (ct.includes("mpegurl") || ct.includes("m3u8") || streamUrl.split('?')[0].endsWith(".m3u8")) {
      const text = await response.text();
      const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf("/") + 1);
      
      const rewritten = text
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          const wrapUrl = (url: string) => `/api/stream?url=${encodeURIComponent(url)}`;

          // 1. 处理包含 URI="..." 的标签
          if (trimmed.startsWith("#")) {
            if (trimmed.includes("URI=")) {
              return line.replace(/URI="([^"]*)"/g, (match, uri) => {
                if (uri.includes("/api/stream")) return match;
                let abs = uri;
                if (uri.startsWith("http")) abs = uri;
                else if (uri.startsWith("//")) abs = "https:" + uri;
                else if (uri.startsWith("/")) abs = origin + uri;
                else abs = baseUrl + uri;
                return `URI="${wrapUrl(abs)}"`;
              });
            }
            return line;
          }

          // 2. 处理地址行
          if (trimmed.includes("/api/stream")) return line;
          
          let absoluteUrl = trimmed;
          if (trimmed.startsWith("http")) absoluteUrl = trimmed;
          else if (trimmed.startsWith("//")) absoluteUrl = "https:" + trimmed;
          else if (trimmed.startsWith("/")) absoluteUrl = origin + trimmed;
          else absoluteUrl = baseUrl + trimmed;
          
          return line.replace(trimmed, wrapUrl(absoluteUrl));
        })
        .join("\n");

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 媒体分段：流式转发，避免全量缓冲导致延迟和音画不同步
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
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
