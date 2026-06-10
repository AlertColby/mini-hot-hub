/** 单条热点 */
export interface HotItem {
  rank: number;
  title: string;
  heat: string;
  url: string;
  platform: 'weibo' | 'zhihu' | 'bilibili';
}

export type PlatformId = 'weibo' | 'zhihu' | 'bilibili';

/** 单平台热榜 */
export interface HotList {
  platform: PlatformId;
  items: HotItem[];
  updatedAt: string;
  error?: string;
}

/** 全平台热榜聚合响应 */
export interface HotListAggregate {
  platforms: HotList[];
}
