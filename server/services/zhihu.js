/**
 * 知乎热榜 JSON 接口（非 HTML 页面）
 *
 * TECH_DESIGN 文档路径为
 * https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=20
 * 该域名当前需登录；无登录时可访问等价端点 api.zhihu.com/topstory/hot-lists/total，
 * 响应同为 data[]，字段结构一致。
 */
const ZHIHU_HOT_LIST_URL =
  'https://api.zhihu.com/topstory/hot-lists/total?limit=20&reverse_order=0';

/** 移动端 User-Agent */
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

const MOBILE_REFERER = 'https://www.zhihu.com/hot';

const FETCH_TIMEOUT_MS = 15_000;

const TOP_N = 20;

/**
 * @typedef {{ rank: number; title: string; heat: string; url: string }} ZhihuHotItem
 */

/**
 * 将 target.url 转为可访问的知乎问题页链接。
 * 字段来源：target.url（api.zhihu.com/questions/{id}）
 *
 * @param {Record<string, unknown>} target
 * @returns {string}
 */
function buildQuestionUrl(target) {
  if (typeof target.url === 'string') {
    const match = target.url.match(/questions\/(\d+)/);
    if (match) {
      return `https://www.zhihu.com/question/${match[1]}`;
    }
  }

  if (typeof target.id === 'string' || typeof target.id === 'number') {
    return `https://www.zhihu.com/question/${target.id}`;
  }

  return '';
}

/**
 * 将单条热榜记录映射为统一结构。
 *
 * 字段映射（接口变更时重点核对此处）：
 * - rank  ← data[] 数组下标 + 1（接口无独立 rank 字段）
 * - title ← data[].target.title（问题标题）
 * - heat  ← data[].detail_text（热度文案，如「440 万热度」；TECH_DESIGN 所称 metrics）
 * - url   ← 由 data[].target.url 转为 www.zhihu.com/question/{id}
 *
 * @param {Record<string, unknown>} item
 * @param {number} index
 * @returns {ZhihuHotItem | null}
 */
function mapHotListItem(item, index) {
  const target =
    item.target && typeof item.target === 'object' ? /** @type {Record<string, unknown>} */ (item.target) : null;
  if (!target) return null;

  const title = typeof target.title === 'string' ? target.title.trim() : '';
  if (!title) return null;

  const url = buildQuestionUrl(target);
  if (!url) return null;

  const detailText = typeof item.detail_text === 'string' ? item.detail_text.trim() : '';
  const heat = detailText || '—';

  return {
    rank: index + 1,
    title,
    heat,
    url,
  };
}

/**
 * 请求知乎热榜 JSON 接口并解析为统一条目列表。
 *
 * 响应结构（接口变更时重点核对此处）：
 * - data: 热榜条目数组
 * - data[].target: 问题元数据（title、url、id 等）
 * - data[].detail_text: 热度展示文案
 *
 * @returns {Promise<ZhihuHotItem[]>}
 */
export async function fetchZhihuHot() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let response;
    try {
      response = await fetch(ZHIHU_HOT_LIST_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': MOBILE_USER_AGENT,
          Referer: MOBILE_REFERER,
          Accept: 'application/json',
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`知乎热榜请求超时（>${FETCH_TIMEOUT_MS / 1000}s）`);
      }
      throw new Error(`知乎热榜网络请求失败: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!response.ok) {
      throw new Error(`知乎热榜接口返回 HTTP ${response.status}`);
    }

    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error('知乎热榜接口响应不是合法 JSON');
    }

    const data = body?.data;
    if (!Array.isArray(data)) {
      throw new Error('知乎热榜接口缺少 data 数组，可能已变更字段结构');
    }

    const items = data
      .map((item, index) => mapHotListItem(item, index))
      .filter((item) => item !== null)
      .slice(0, TOP_N);

    if (items.length === 0) {
      throw new Error('知乎热榜接口返回空列表');
    }

    return items;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('知乎热榜')) {
      throw err;
    }
    throw new Error(`知乎热榜解析失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
