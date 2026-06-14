import type { HotList, PlatformId } from '../types/hot';

// 生产环境走同源 /api（Vercel rewrite 代理到 Railway）；开发环境走 Vite 代理。
const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_BASE ?? '');

interface HotListAggregate {
  platforms: HotList[];
}

async function fetchFromApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`请求失败: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** 获取指定平台热榜 */
export async function fetchHotPlatform(platform: PlatformId): Promise<HotList> {
  return fetchFromApi<HotList>(`/api/hot/${platform}`);
}

/** 获取全部平台热榜 */
export async function fetchAllHot(): Promise<HotList[]> {
  const data = await fetchFromApi<HotListAggregate>('/api/hot');
  return data.platforms;
}
