export interface WeiboHotItem {
  rank: number;
  title: string;
  heat: string;
  url: string;
}

export function fetchWeiboHot(): Promise<WeiboHotItem[]>;
