/** 微博热搜 JSON 接口（非 HTML 页面） */
const WEIBO_HOT_SEARCH_URL = 'https://weibo.com/ajax/side/hotSearch';

/** 移动端 User-Agent，模拟微博客户端请求 */
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Weibo (iPhone14,3__weibo__13.10.0__iphone__os16.0)';

/** 移动端来源 Referer（wap 入口；m.weibo.cn 域名的 Referer 对此接口会 403） */
const MOBILE_REFERER = 'https://weibo.com/?from=wap';

const FETCH_TIMEOUT_MS = 15_000;

const TOP_N = 20;

/**
 * @typedef {{ rank: number; title: string; heat: string; url: string }} WeiboHotItem
 */

/**
 * 将接口原始热度数值格式化为展示文案。
 * 字段来源：realtime[].num（整数，表示讨论量/热度值）
 *
 * @param {number} num
 * @returns {string}
 */
function formatHeat(num) {
  if (!Number.isFinite(num) || num <= 0) return '—';
  if (num >= 10_000) return `${Math.round(num / 10_000)}万`;
  return String(num);
}

/**
 * 根据热搜词构造搜索页链接。
 * 接口 realtime[] 条目通常不含 url 字段，需用 word 自行拼接。
 *
 * @param {string} word
 * @returns {string}
 */
function buildSearchUrl(word) {
  return `https://s.weibo.com/weibo?q=${encodeURIComponent(word)}`;
}

/**
 * 将单条 realtime 记录映射为统一结构。
 *
 * 字段映射（接口变更时重点核对此处）：
 * - rank  ← realtime[].realpos（实际榜单名次；缺失时退化为数组下标 + 1）
 * - title ← realtime[].word（热搜关键词/标题）
 * - heat  ← realtime[].num（热度数值，经 formatHeat 格式化）
 * - url   ← 由 realtime[].word 拼接搜索链接（非接口直出字段）
 *
 * @param {Record<string, unknown>} item
 * @param {number} index
 * @returns {WeiboHotItem | null}
 */
function mapRealtimeItem(item, index) {
  if (item.is_ad) return null;

  const word = typeof item.word === 'string' ? item.word.trim() : '';
  if (!word) return null;

  const realpos = typeof item.realpos === 'number' ? item.realpos : index + 1;
  const num = typeof item.num === 'number' ? item.num : 0;

  return {
    rank: realpos,
    title: word,
    heat: formatHeat(num),
    url: buildSearchUrl(word),
  };
}

/**
 * 请求微博热搜 JSON 接口并解析为统一条目列表。
 *
 * 响应结构（接口变更时重点核对此处）：
 * - ok: 1 表示成功
 * - data.realtime: 热搜条目数组
 *
 * @returns {Promise<WeiboHotItem[]>}
 */
export async function fetchWeiboHot() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let response;
    try {
      response = await fetch(WEIBO_HOT_SEARCH_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': MOBILE_USER_AGENT,
          Referer: MOBILE_REFERER,
          Accept: 'application/json',
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`微博热搜请求超时（>${FETCH_TIMEOUT_MS / 1000}s）`);
      }
      throw new Error(`微博热搜网络请求失败: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!response.ok) {
      throw new Error(`微博热搜接口返回 HTTP ${response.status}`);
    }

    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error('微博热搜接口响应不是合法 JSON');
    }

    if (body?.ok !== 1) {
      const detail = typeof body?.msg === 'string' ? body.msg : '未知错误';
      throw new Error(`微博热搜接口业务失败: ${detail}`);
    }

    const realtime = body?.data?.realtime;
    if (!Array.isArray(realtime)) {
      throw new Error('微博热搜接口缺少 data.realtime 数组，可能已变更字段结构');
    }

    const items = realtime
      .map((item, index) => mapRealtimeItem(item, index))
      .filter((item) => item !== null)
      .slice(0, TOP_N);

    if (items.length === 0) {
      throw new Error('微博热搜接口返回空列表');
    }

    return items;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('微博热搜')) {
      throw err;
    }
    throw new Error(`微博热搜解析失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
