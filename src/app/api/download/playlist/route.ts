import { NextRequest, NextResponse } from "next/server";
import { buildFilteredPlaylist } from "../../../../lib/filtered-playlist";
import { isSafePublicUrl } from "../../../../lib/security";

// 供 ffmpeg 使用的"去过广告"播放列表端点：
// GET /api/download/playlist?url=<m3u8>
// 返回分段为绝对地址的净化媒体列表，ffmpeg 以 http 协议读取（-headers 选项保持可用），
// 分段由 ffmpeg 直连源站拉取，不经过本服务转发
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url || !isSafePublicUrl(url)) {
    return NextResponse.json({ error: "不允许的地址" }, { status: 400 });
  }

  const body = await buildFilteredPlaylist(url);
  if (!body) {
    return NextResponse.json({ error: "播放列表不可用" }, { status: 404 });
  }

  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "application/vnd.apple.mpegurl" },
  });
}
