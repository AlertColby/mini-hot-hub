import express from 'express';
import cors from 'cors';
import { bilibiliMockItems } from './mock/bilibili.js';
import { weiboMockItems } from './mock/weibo.js';
import { zhihuMockItems } from './mock/zhihu.js';
import type { HotItem, HotList, HotListAggregate, PlatformId } from './types.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

const PLATFORMS: PlatformId[] = ['weibo', 'zhihu', 'bilibili'];

const MOCK_ITEMS: Record<PlatformId, HotItem[]> = {
  weibo: weiboMockItems,
  zhihu: zhihuMockItems,
  bilibili: bilibiliMockItems,
};

function buildHotList(platform: PlatformId): HotList {
  return {
    platform,
    items: MOCK_ITEMS[platform],
    updatedAt: new Date().toISOString(),
  };
}

function isPlatformId(value: string): value is PlatformId {
  return (PLATFORMS as string[]).includes(value);
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/hot', (_req, res) => {
  const data: HotListAggregate = {
    platforms: PLATFORMS.map((platform) => buildHotList(platform)),
  };
  res.json(data);
});

app.get('/api/hot/:platform', (req, res) => {
  const { platform } = req.params;

  if (!isPlatformId(platform)) {
    res.status(404).json({ error: `Unknown platform: ${platform}` });
    return;
  }

  res.json(buildHotList(platform));
});

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
