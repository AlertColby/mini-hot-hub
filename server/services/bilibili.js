/** B 站热搜 JSON 接口（非 HTML 页面） */
const BILIBILI_HOT_SEARCH_URL =
  'https://api.bilibili.com/x/web-interface/wbi/search/square?limit=20';

/** 移动端 User-Agent */
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

const MOBILE_REFERER = 'https://www.bilibili.com/';

const FETCH_TIMEOUT_MS = 15_000;

const TOP_N = 20;

/**
 * @typedef {{ rank: number; title: string; heat: string; url: string }} BilibiliHotItem
 */

/**
 * 将接口原始热度数值格式化为展示文案。
 * 字段来源：data.trending.list[].heat_score（整数）
 *
 * @param {number} score
 * @returns {string}
 */
function formatHeat(score) {
  if (!Number.isFinite(score) || score <= 0) return '—';
  if (score >= 10_000) return `${(score / 10_000).toFixed(1)}万`;
  return String(score);
}

/**
 * 根据热搜词构造搜索页链接。
 * 接口 list[] 条目通常 uri 为空，需用 keyword 自行拼接。
 *
 * @param {string} keyword
 * @returns {string}
 */
function buildSearchUrl(keyword) {
  return `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`;
}

/**
 * 将单条 trending 记录映射为统一结构。
 *
 * 字段映射（接口变更时重点核对此处）：
 * - rank  ← data.trending.list[] 数组下标 + 1
 * - title ← data.trending.list[].show_name（展示名；缺失时退化为 keyword）
 * - heat  ← data.trending.list[].heat_score（热度数值，经 formatHeat 格式化）
 * - url   ← 由 data.trending.list[].keyword 拼接搜索链接（非接口直出字段）
 *
 * @param {Record<string, unknown>} item
 * @param {number} index
 * @returns {BilibiliHotItem | null}
 */
function mapTrendingItem(item, index) {
  const keyword = typeof item.keyword === 'string' ? item.keyword.trim() : '';
  if (!keyword) return null;

  const showName = typeof item.show_name === 'string' ? item.show_name.trim() : '';
  const title = showName || keyword;

  const heatScore = typeof item.heat_score === 'number' ? item.heat_score : 0;

  return {
    rank: index + 1,
    title,
    heat: formatHeat(heatScore),
    url: buildSearchUrl(keyword),
  };
}

/**
 * 请求 B 站热搜 JSON 接口并解析为统一条目列表。
 *
 * 响应结构（接口变更时重点核对此处）：
 * - code: 0 表示成功
 * - data.trending.list: 热搜条目数组
 *
 * @returns {Promise<BilibiliHotItem[]>}
 */
export async function fetchBilibiliHot() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let response;
    try {
      response = await fetch(BILIBILI_HOT_SEARCH_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': MOBILE_USER_AGENT,
          Referer: MOBILE_REFERER,
          Accept: 'application/json',
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`B 站热搜请求超时（>${FETCH_TIMEOUT_MS / 1000}s）`);
      }
      throw new Error(`B 站热搜网络请求失败: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!response.ok) {
      throw new Error(`B 站热搜接口返回 HTTP ${response.status}`);
    }

    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error('B 站热搜接口响应不是合法 JSON');
    }

    if (body?.code !== 0) {
      const detail = typeof body?.message === 'string' ? body.message : '未知错误';
      throw new Error(`B 站热搜接口业务失败: ${detail}`);
    }

    const list = body?.data?.trending?.list;
    if (!Array.isArray(list)) {
      throw new Error('B 站热搜接口缺少 data.trending.list 数组，可能已变更字段结构');
    }

    const items = list
      .map((item, index) => mapTrendingItem(item, index))
      .filter((item) => item !== null)
      .slice(0, TOP_N);

    if (items.length === 0) {
      throw new Error('B 站热搜接口返回空列表');
    }

    return items;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('B 站热搜')) {
      throw err;
    }
    throw new Error(`B 站热搜解析失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
