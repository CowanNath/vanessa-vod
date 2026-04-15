import { NextRequest, NextResponse } from "next/server";

const IMAGE_TIMEOUT = 8000; // 8s

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  console.log(`[image] fetching: ${imageUrl}`);

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
      console.warn(`[image] upstream ${response.status}: ${imageUrl}`);
      return new NextResponse("Image fetch failed", { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/webp";
    const buffer = await response.arrayBuffer();

    console.log(`[image] ok ${buffer.byteLength}B ${contentType}: ${imageUrl}`);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    console.warn(`[image] ${isTimeout ? "timeout" : "error"}: ${msg} — ${imageUrl}`);
    return NextResponse.json(
      { error: isTimeout ? "图片加载超时" : "图片加载失败" },
      { status: 502 }
    );
  }
}
