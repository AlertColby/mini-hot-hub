import express from 'express';
import cors from 'cors';
import { fetchBilibiliHot } from '../services/bilibili.js';
import { fetchWeiboHot } from '../services/weibo.js';
import { fetchZhihuHot } from '../services/zhihu.js';
import { getCache, setCache } from '../utils/cache.js';
import type {
  HotItem,
  HotList,
  HotListAggregate,
  HotListFailure,
  PlatformId,
} from './types.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').replace(
  /\/$/,
  '',
);

const PLATFORMS: PlatformId[] = ['weibo', 'zhihu', 'bilibili'];

function isPlatformId(value: string): value is PlatformId {
  return (PLATFORMS as string[]).includes(value);
}

const WEIBO_FETCH_ERROR_MESSAGE = '微博热搜暂时无法获取，请稍后再试';
const ZHIHU_FETCH_ERROR_MESSAGE = '知乎热榜暂时无法获取，请稍后再试';
const BILIBILI_FETCH_ERROR_MESSAGE = 'B 站热搜暂时无法获取，请稍后再试';

const PLATFORM_ERROR_MESSAGES: Record<PlatformId, string> = {
  weibo: WEIBO_FETCH_ERROR_MESSAGE,
  zhihu: ZHIHU_FETCH_ERROR_MESSAGE,
  bilibili: BILIBILI_FETCH_ERROR_MESSAGE,
};

function buildHotListFailure(platform: PlatformId, message: string): HotListFailure {
  return {
    platform,
    error: true,
    items: [],
    message,
    updatedAt: new Date().toISOString(),
  };
}

async function buildZhihuHotList(skipCache: boolean): Promise<HotList | HotListFailure> {
  const cacheKey = 'hot:zhihu';

  if (!skipCache) {
    const cached = getCache<HotList>(cacheKey);
    if (cached) {
      console.log('[cache hit]', 'zhihu');
      return cached;
    }
  }

  try {
    const rawItems = await fetchZhihuHot();
    const items: HotItem[] = rawItems.map((item) => ({
      ...item,
      platform: 'zhihu',
    }));
    const data: HotList = {
      platform: 'zhihu',
      items,
      updatedAt: new Date().toISOString(),
    };
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error('[zhihu fetch failed]', err instanceof Error ? err.message : err);
    return buildHotListFailure('zhihu', ZHIHU_FETCH_ERROR_MESSAGE);
  }
}

async function buildBilibiliHotList(skipCache: boolean): Promise<HotList | HotListFailure> {
  const cacheKey = 'hot:bilibili';

  if (!skipCache) {
    const cached = getCache<HotList>(cacheKey);
    if (cached) {
      console.log('[cache hit]', 'bilibili');
      return cached;
    }
  }

  try {
    const rawItems = await fetchBilibiliHot();
    const items: HotItem[] = rawItems.map((item) => ({
      ...item,
      platform: 'bilibili',
    }));
    const data: HotList = {
      platform: 'bilibili',
      items,
      updatedAt: new Date().toISOString(),
    };
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error('[bilibili fetch failed]', err instanceof Error ? err.message : err);
    return buildHotListFailure('bilibili', BILIBILI_FETCH_ERROR_MESSAGE);
  }
}

async function buildWeiboHotList(skipCache: boolean): Promise<HotList | HotListFailure> {
  const cacheKey = 'hot:weibo';

  if (!skipCache) {
    const cached = getCache<HotList>(cacheKey);
    if (cached) {
      console.log('[cache hit]', 'weibo');
      return cached;
    }
  }

  try {
    const rawItems = await fetchWeiboHot();
    const items: HotItem[] = rawItems.map((item) => ({
      ...item,
      platform: 'weibo',
    }));
    const data: HotList = {
      platform: 'weibo',
      items,
      updatedAt: new Date().toISOString(),
    };
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error('[weibo fetch failed]', err instanceof Error ? err.message : err);
    return buildHotListFailure('weibo', WEIBO_FETCH_ERROR_MESSAGE);
  }
}

async function buildPlatformHotList(
  platform: PlatformId,
  skipCache: boolean,
): Promise<HotList | HotListFailure> {
  if (platform === 'weibo') {
    return buildWeiboHotList(skipCache);
  }
  if (platform === 'zhihu') {
    return buildZhihuHotList(skipCache);
  }

  return buildBilibiliHotList(skipCache);
}

async function buildPlatformHotListSafe(
  platform: PlatformId,
  skipCache: boolean,
): Promise<HotList | HotListFailure> {
  try {
    return await buildPlatformHotList(platform, skipCache);
  } catch (err) {
    console.error(`[${platform} fetch failed]`, err instanceof Error ? err.message : err);
    return buildHotListFailure(platform, PLATFORM_ERROR_MESSAGES[platform]);
  }
}

app.use(
  cors({
    origin: CORS_ORIGIN,
  }),
);

app.use((req, _res, next) => {
  console.log(req.path);
  next();
});

app.get('/', (_req, res) => {
  res.json({
    name: 'mini-hot-hub API',
    endpoints: ['/api/health', '/api/hot', '/api/hot/:platform'],
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/hot', async (_req, res) => {
  const platforms = await Promise.all(
    PLATFORMS.map((platform) => buildPlatformHotListSafe(platform, false)),
  );

  const data: HotListAggregate = { platforms };
  res.json(data);
});

app.get('/api/hot/:platform', async (req, res) => {
  const { platform } = req.params;
  const skipCache = req.query.refresh === '1';

  if (!isPlatformId(platform)) {
    res.status(404).json({ error: `Unknown platform: ${platform}` });
    return;
  }

  const data = await buildPlatformHotListSafe(platform, skipCache);
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
