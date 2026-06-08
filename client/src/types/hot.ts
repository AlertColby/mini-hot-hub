/** 支持的热榜平台标识 */
export type HotPlatform = 'weibo' | 'zhihu' | 'bilibili';

/** 单条热点 */
export interface HotItem {
  rank: number;
  title: string;
  heat: string;
  url: string;
  platform: HotPlatform;
}

/** 单平台热榜（API 响应结构） */
export interface HotList {
  platform: HotPlatform;
  items: HotItem[];
  updatedAt: string;
  error?: string;
}
