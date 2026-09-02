// 服务端发起外部请求前的 URL 安全校验：
// 仅允许 http/https，拒绝环回、私有和保留地址，防止被当作内网跳板（SSRF）

const BLOCKED_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.local$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^\[?::$/,
  /^\[?f[cd][0-9a-f]{2}:/i, // IPv6 unique local fc00::/7
  /^\[?fe[89ab][0-9a-f]{2}:/i, // IPv6 link-local fe80::/10
];

export function isSafePublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return !BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host));
  } catch {
    return false;
  }
}
