export interface ZhihuHotItem {
  rank: number;
  title: string;
  heat: string;
  url: string;
}

export function fetchZhihuHot(): Promise<ZhihuHotItem[]>;
