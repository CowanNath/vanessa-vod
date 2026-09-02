import { pickBestVariant, rewriteM3u8 } from "./m3u8";
import { isSafePublicUrl } from "./security";

// 拉取播放列表（主列表则选最高码率子列表），做域名投票去广告后
// 返回分段为绝对地址的净化版 m3u8 文本；任一步失败返回 null
export async function buildFilteredPlaylist(url: string): Promise<string | null> {
  try {
    if (!isSafePublicUrl(url)) return null;

    const fetchPlaylist = async (playlistUrl: string): Promise<string> => {
      const res = await fetch(playlistUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Referer: new URL(playlistUrl).origin + "/",
          Accept: "*/*",
        },
        signal: AbortSignal.timeout(15000),
        cache: "no-cache",
      });
      if (!res.ok) throw new Error(`playlist HTTP ${res.status}`);
      return res.text();
    };

    let playlistUrl = url;
    let text = await fetchPlaylist(playlistUrl);

    // 主播放列表 → 选最高码率的媒体列表
    if (text.includes("#EXT-X-STREAM-INF")) {
      const variant = pickBestVariant(text, playlistUrl);
      if (!variant || !isSafePublicUrl(variant)) return null;
      playlistUrl = variant;
      text = await fetchPlaylist(playlistUrl);
    }

    const { body } = rewriteM3u8(text, playlistUrl, { proxyRewrite: false });
    return body.includes("#EXTINF") ? body : null;
  } catch {
    return null;
  }
}
