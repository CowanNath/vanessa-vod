import { NextRequest, NextResponse } from "next/server";

const PROXY_TIMEOUT = 15000; // 15 seconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceUrl = searchParams.get("source");

  if (!sourceUrl) {
    return NextResponse.json({ error: "Missing source parameter" }, { status: 400 });
  }

  const proxyUrl = new URL(sourceUrl);
  searchParams.forEach((value, key) => {
    if (key !== "source") {
      proxyUrl.searchParams.set(key, value);
    }
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT);

    const response = await fetch(proxyUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
      },
      redirect: "follow",
    });

    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `Upstream API error: ${response.status}`, detail: text.slice(0, 200) },
        { status: 200 } // Return 200 with error in body so the UI can show it gracefully
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy request failed";
    if (message.includes("abort") || message.includes("timeout")) {
      return NextResponse.json(
        { error: "请求超时，该源服务器响应过慢，请稍后重试" },
        { status: 200 }
      );
    }
    return NextResponse.json(
      { error: message },
      { status: 200 }
    );
  }
}
