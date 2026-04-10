import type { ApiSource } from "./types";

export const DEFAULT_SOURCE: ApiSource = {
  id: "default-360zy",
  name: "360资源",
  url: "https://360zyzz.com/api.php/provide/vod",
  enabled: true,
  addedAt: new Date().toISOString(),
};

export const STORAGE_KEYS = {
  SOURCES: "video-app-sources",
  ACTIVE_SOURCE_ID: "video-app-active-source-id",
  THEME: "video-app-theme",
  FAVORITES: "video-app-favorites",
} as const;

export const PAGE_SIZE = 20;
