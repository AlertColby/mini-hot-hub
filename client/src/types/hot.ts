/** 支持的热榜平台标识 */
export type PlatformId = 'weibo' | 'zhihu' | 'bilibili';

/** 单条热点 */
export interface HotItem {
  rank: number;
  title: string;
  heat: string;
  url: string;
  platform: PlatformId;
}

/** 单平台热榜（API 响应结构） */
export interface HotList {
  platform: PlatformId;
  items: HotItem[];
  updatedAt: string;
  error?: string;
}

/** 热榜卡片展示数据 */
export interface HotPlatform {
  platformId: PlatformId;
  sourceName: string;
  listName: string;
  items: HotItem[];
  updatedAt: string;
  error?: string;
}
