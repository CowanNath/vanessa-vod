// m3u8 播放列表代理改写 + 简易去广告
//
// 去广告原理（两条规则，命中任一即剔除）：
// 1. 域名投票：广告通常以"插入分段"方式混进正片，且来自不同 CDN 域名。统计媒体
//    播放列表里所有分段 URL 的域名，若存在一个占绝对多数（>=80% 且分段数 >=6）
//    的域名，则视为正片域名，其余域名的分段按广告剔除。正片多 CDN 负载均衡时
//    各域名占比接近，不会触发过滤，避免误杀。
// 2. 路径明牌：部分源的广告与正片同域名，但路径里带显式广告目录（如 /AD/、/ads/），
//    按路径段精确匹配剔除。
// 局限：烧进画面里的广告无法识别。设 AD_FILTER=off 可关闭。

const SELF_MARKER = "__proxied__";
const MIN_SEGMENTS = 6;
const MAJORITY_RATIO = 0.8;
const AD_PATH_PARTS = new Set(["ad", "ads"]);

function isAdPath(url: string): boolean {
  try {
    return new URL(url)
      .pathname.split("/")
      .some((part) => AD_PATH_PARTS.has(part.toLowerCase()));
  } catch {
    return false;
  }
}

function resolveSegmentUrl(uri: string, origin: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(uri)) return uri;
  if (uri.startsWith("//")) return `https:${uri}`;
  if (uri.startsWith("/")) return `${origin}${uri}`;
  return `${baseUrl}${uri}`;
}

// 从主播放列表（多码率）里选出带宽最高的子播放列表地址，下载用
export function pickBestVariant(text: string, playlistUrl: string): string | null {
  const origin = new URL(playlistUrl).origin;
  const baseUrl = playlistUrl.substring(0, playlistUrl.lastIndexOf("/") + 1);
  const lines = text.split("\n");
  let best: { url: string; bandwidth: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith("#EXT-X-STREAM-INF")) continue;
    const m = trimmed.match(/BANDWIDTH=(\d+)/i);
    const bandwidth = m ? parseInt(m[1], 10) : 0;
    // 子播放列表地址紧跟在 #EXT-X-STREAM-INF 的下一个非注释行
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].trim();
      if (!next) continue;
      if (next.startsWith("#")) break;
      if (!best || bandwidth > best.bandwidth) {
        best = { url: resolveSegmentUrl(next, origin, baseUrl), bandwidth };
      }
      break;
    }
  }
  return best?.url ?? null;
}

export function rewriteM3u8(
  text: string,
  playlistUrl: string,
  opts: { proxyRewrite?: boolean } = {}
): { body: string; droppedAds: number } {
  // proxyRewrite=true（播放）：分段地址包一层 /api/stream 代理
  // proxyRewrite=false（下载）：只输出绝对地址，让 ffmpeg 直连源站拉分段
  const wrapUrl = (url: string) =>
    opts.proxyRewrite === false ? url : `/api/stream?url=${encodeURIComponent(url)}`;
  const origin = new URL(playlistUrl).origin;
  const baseUrl = playlistUrl.substring(0, playlistUrl.lastIndexOf("/") + 1);
  const lines = text.split("\n");

  const rewriteUriLine = (line: string, trimmed: string): string => {
    if (trimmed.includes("/api/stream")) return line;
    const abs = resolveSegmentUrl(trimmed, origin, baseUrl);
    return line.replace(trimmed, wrapUrl(abs));
  };

  const rewriteTagUris = (line: string): string => {
    if (!line.includes("URI=")) return line;
    return line.replace(/URI="([^"]*)"/g, (match, uri: string) => {
      if (uri.includes("/api/stream")) return match;
      const abs = resolveSegmentUrl(uri, origin, baseUrl);
      return `URI="${wrapUrl(abs)}"`;
    });
  };

  // 主播放列表（多码率）：只做地址改写，不做广告过滤
  if (lines.some((l) => l.trim().startsWith("#EXT-X-STREAM-INF"))) {
    const body = lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        if (trimmed.startsWith("#")) return rewriteTagUris(line);
        return rewriteUriLine(line, trimmed);
      })
      .join("\n");
    return { body, droppedAds: 0 };
  }

  // 媒体播放列表：统计每个分段所属域名 + 是否命中广告路径
  const segHosts = new Map<number, string>();
  const segAdPaths = new Map<number, boolean>();
  const hostCount = new Map<string, number>();
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    if (trimmed.includes("/api/stream")) {
      segHosts.set(i, SELF_MARKER);
      segAdPaths.set(i, false);
      return;
    }
    const abs = resolveSegmentUrl(trimmed, origin, baseUrl);
    let host = "";
    try {
      host = new URL(abs).host;
    } catch {}
    segHosts.set(i, host);
    segAdPaths.set(i, isAdPath(abs));
    hostCount.set(host, (hostCount.get(host) ?? 0) + 1);
  });

  let majorityHost = "";
  let majorityCount = 0;
  for (const [host, count] of hostCount) {
    if (count > majorityCount) {
      majorityCount = count;
      majorityHost = host;
    }
  }

  const adHosts = new Set<string>();
  let droppedAds = 0;
  const total = segHosts.size;
  if (
    process.env.AD_FILTER !== "off" &&
    total >= MIN_SEGMENTS &&
    majorityCount / total >= MAJORITY_RATIO
  ) {
    for (const [host, count] of hostCount) {
      if (host !== SELF_MARKER && host !== majorityHost) {
        adHosts.add(host);
        droppedAds += count;
      }
    }
  }

  const out: string[] = [];
  let pathAdCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const host = segHosts.get(i);
    const dropByHost = !!host && adHosts.has(host);
    const dropByPath = segAdPaths.get(i) === true;
    if (dropByPath) pathAdCount++;
    if (dropByHost || dropByPath) {
      // 广告分段：连同紧邻的 #EXTINF 时长行一并剔除
      if (out.length > 0 && out[out.length - 1].trim().startsWith("#EXTINF")) {
        out.pop();
      }
      continue;
    }
    if (!trimmed) {
      out.push(line);
      continue;
    }
    if (trimmed.startsWith("#")) {
      out.push(rewriteTagUris(line));
      continue;
    }
    out.push(rewriteUriLine(line, trimmed));
  }

  return { body: out.join("\n"), droppedAds: droppedAds + pathAdCount };
}
