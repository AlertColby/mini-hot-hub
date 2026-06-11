export interface BilibiliHotItem {
  rank: number;
  title: string;
  heat: string;
  url: string;
}

export function fetchBilibiliHot(): Promise<BilibiliHotItem[]>;
