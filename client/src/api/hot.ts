import type { HotList } from '../types/hot';
import mockData from '../mock/hot.json';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

/**
 * 获取全部平台热榜。
 * 开发阶段后端未就绪时，回退到本地 mock 数据。
 */
export async function fetchHotLists(): Promise<HotList[]> {
  try {
    const res = await fetch(`${API_BASE}/api/hot`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HotList[];
  } catch {
    return mockData as HotList[];
  }
}
