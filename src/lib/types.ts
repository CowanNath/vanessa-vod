export interface VodItem {
  vod_id: number;
  vod_name: string;
  type_id: number;
  type_id_1: number;
  type_name: string;
  vod_pic: string;
  vod_remarks: string;
  vod_year: string;
  vod_area: string;
  vod_lang: string;
  vod_score: string;
  vod_douban_score: string;
  vod_actor: string;
  vod_director: string;
  vod_content: string;
  vod_play_from: string;
  vod_play_url: string;
  vod_time?: string;
  vod_continu?: string;
}

export interface CategoryItem {
  type_id: number;
  type_pid: number;
  type_name: string;
}

export interface VodListResponse {
  code: number;
  msg: string;
  page: number;
  pagecount: number;
  limit: string;
  total: number;
  list: VodItem[];
  class?: CategoryItem[];
}

export interface Episode {
  name: string;
  url: string;
  index: number;
}

export interface PlaySourceGroup {
  sourceName: string;
  episodes: Episode[];
}

export interface ApiSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  addedAt: string;
}

export interface CategoryTreeNode extends CategoryItem {
  children: CategoryItem[];
}
