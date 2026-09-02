// 服务端存储路径（仅限服务端引用）：
// - DATA_DIR：收藏/源配置/观看历史/下载历史等 JSON 数据目录，默认 <cwd>/data
// - DOWNLOAD_DIR：视频保存目录，默认 <cwd>/downloads
// NAS 等 Docker 场景下挂载目录可能对容器用户只读，可用环境变量指到可写位置
import fs from "fs";
import path from "path";

export const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const downloadsDir =
  process.env.DOWNLOAD_DIR || path.join(process.cwd(), "downloads");

let warnedUnwritable = false;

export function ensureDataDir(): void {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    if (!warnedUnwritable) {
      fs.accessSync(dataDir, fs.constants.W_OK);
      warnedUnwritable = true;
    }
  } catch (err) {
    // 只告警一次，避免刷屏；错误继续抛给调用方（路由会以 error JSON 返回）
    if (!warnedUnwritable) {
      warnedUnwritable = true;
      console.error(
        `[storage] 数据目录不可写: ${dataDir} (${(err as Error).message})。` +
          `收藏/源配置/观看历史/下载历史将无法保存。` +
          `修复: 给该目录开放写权限(如 chmod 777)，或设置环境变量 DATA_DIR 指向可写目录。`
      );
    }
    throw err;
  }
}
