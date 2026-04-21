import { NextRequest, NextResponse } from "next/server";

const IMAGE_TIMEOUT = 8000;
const CONTENT_TYPE_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
};

function guessContentType(url: string): string {
  const path = url.split("?")[0].split("#")[0].toLowerCase();
  const ext = path.split(".").pop() || "";
  return CONTENT_TYPE_MAP[ext] || "image/jpeg";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timer);

    if (!response.ok) {
      return new NextResponse("Image fetch failed", { status: response.status });
    }

    const contentType = response.headers.get("content-type") || guessContentType(imageUrl);

    if (!response.body) {
      return NextResponse.json({ error: "No response body" }, { status: 502 });
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    return NextResponse.json(
      { error: isTimeout ? "图片加载超时" : "图片加载失败" },
      { status: 502 }
    );
  }
}
