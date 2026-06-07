# HotNews 技术设计文档

> v1.1 · 2026-06-07 · 阶段：技术设计
>
> 依据：`PRD.md` v1.1（2026-06-01）
>
> 技术栈：React + TypeScript + Vite · Node.js + Express · Vercel + Railway
>
> 相关文档：`PRD.md`（需求）· `RESEARCH.md`（调研）· `../AGENTS.md`（Agent 开发指令，冲突时以本文为准）

---

## 1. 架构总览

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                      用户浏览器                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │               React SPA (Vite)                     │  │
│  │  Header │ HotBoard ×3 (weibo/zhihu/bilibili)        │  │
│  │  ─────────────────────────────────────────────     │  │
│  │  fetch('/api/hot') ──────────────────────┐         │  │
│  └──────────────────────────────────────────┼─────────┘  │
└─────────────────────────────────────────────┼────────────┘
                                              │
                    HTTPS (Vercel 静态托管)     │   /api/*
                                              ▼
┌─────────────────────────────────────────────────────────┐
│                  Express Server (Railway)                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Routes  │  │   Adapters   │  │   Scheduler      │  │
│  │          │  │              │  │                   │  │
│  │ GET /api │  │ IAdapter     │  │ node-cron        │  │
│  │  /hot    │──▶│  ├─ Weibo    │◀─│ CRON_INTERVAL  │  │
│  │  /health │  │  ├─ Zhihu    │  │ 默认 12 分钟      │  │
│  │          │  │  └─ Bilibili │  │                   │  │
│  └──────────┘  └──────┬───────┘  └──────────────────┘  │
│                        │                                 │
│  ┌─────────────────────▼──────────────────────────────┐ │
│  │                 Cache Layer                         │ │
│  │  Map<platform, { data: HotList, ts: number }>      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
                        │ HTTP (axios)
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    第三方数据源                           │
│   weibo.com  │  zhihu.com  │  bilibili.com               │
└─────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

| 原则 | 说明 |
|------|------|
| **关注点分离** | 抓取 / 缓存 / API / UI 各自独立，互不侵入 |
| **Adapter 模式** | 每平台一个 Adapter，统一接口，插拔式扩展 |
| **无状态 API** | 服务端无会话状态，所有请求只读缓存 |
| **渐进增强** | 先内存缓存跑通，再按需引入 Redis/DB |
| **防御性设计** | 单平台失败 = 降级展示，非全局崩溃 |

---

## 2. 技术栈明细

### 2.1 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.x | UI 框架 |
| TypeScript | ^5.x | 类型安全 |
| Vite | ^6.x | 开发服务器 + 构建 |
| CSS (纯) | — | 样式；不引入 CSS-in-JS 或组件库 |
| `date-fns` | ^4.x | 相对时间格式化（"3 分钟前"） |

### 2.2 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥20 LTS | 运行时 |
| Express | ^4.x | HTTP 框架 |
| TypeScript | ^5.x | 类型安全 |
| tsx | ^4.x | 开发模式直接运行 .ts |
| axios | ^1.x | HTTP 客户端（抓取） |
| cheerio | ^1.x | HTML 解析 |
| node-cron | ^3.x | 定时任务（替代裸 setInterval） |
| cors | ^2.x | CORS 中间件 |

### 2.3 部署

| 平台 | 部署内容 | 说明 |
|------|---------|------|
| Vercel | 前端静态资源 | `vite build` 产物；自动 HTTPS |
| Railway | Express 服务 | Node.js 运行时；环境变量注入 |

### 2.4 开发工具

| 工具 | 用途 |
|------|------|
| ESLint | 代码规范 |
| Prettier | 格式化 |
| concurrently | monorepo 并行启动前后端 |

---

## 3. 项目结构

```
HotNews/
├── client/                     # 前端 SPA
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.tsx            # 入口
│       ├── App.tsx             # 根组件
│       ├── App.css             # 全局样式
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── Header.css
│       │   ├── HotBoard.tsx    # 单平台热榜面板
│       │   ├── HotBoard.css
│       │   ├── HotItem.tsx     # 单条热点行
│       │   ├── HotItem.css
│       │   ├── Skeleton.tsx    # 骨架屏
│       │   ├── Skeleton.css
│       │   ├── ErrorBanner.tsx # 全局错误提示
│       │   ├── ErrorBanner.css
│       │   ├── Footer.tsx      # 页脚声明
│       │   └── Footer.css
│       ├── hooks/
│       │   └── useHotData.ts   # 数据获取 hook
│       ├── types/
│       │   └── index.ts        # 共享类型定义
│       └── utils/
│           └── formatTime.ts   # 时间格式化
│
├── server/                     # 后端 API
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── index.ts            # 入口：Express 启动
│       ├── routes/
│       │   └── hot.ts          # /api/hot 路由
│       ├── adapters/
│       │   ├── IAdapter.ts     # Adapter 接口定义
│       │   ├── weibo.ts        # 微博 Adapter
│       │   ├── zhihu.ts        # 知乎 Adapter
│       │   └── bilibili.ts     # B 站 Adapter
│       ├── cache/
│       │   └── store.ts        # 内存缓存层
│       ├── scheduler/
│       │   └── index.ts        # 定时抓取调度
│       └── types/
│           └── index.ts        # 共享类型定义
│
├── shared/                     # 前后端共享类型（可选 symlink）
│   └── types.ts
│
├── package.json                # 根 workspace
└── docs/
    ├── RESEARCH.md
    ├── PRD.md
    └── TECH_DESIGN.md
```

---

## 4. 后端设计

### 4.1 Express 应用结构

```typescript
// server/src/index.ts
import express from 'express';
import cors from 'cors';
import { hotRouter } from './routes/hot';
import { startScheduler } from './scheduler';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use('/api', hotRouter);

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  startScheduler();  // 启动后立即抓取 + 定时
});
```

### 4.2 路由定义

```typescript
// server/src/routes/hot.ts
import { Router } from 'express';
import { cache } from '../cache/store';

export const hotRouter = Router();

// GET /api/hot          → 所有平台
// GET /api/hot/weibo    → 微博
// GET /api/hot/zhihu    → 知乎
// GET /api/hot/bilibili → B 站
// GET /api/health       → 健康检查
```

**路由逻辑：**

- `GET /api/hot` — 返回 `HotList[]`，遍历所有已注册平台
- `GET /api/hot/:platform` — 返回单个 `HotList`；`platform` 为 `weibo` | `zhihu` | `bilibili`，未知标识返回 404
- `GET /api/health` — 返回 `{ status: "ok", updatedAt: <最新抓取时间> }`
- 所有端点**只读缓存**，不触发实时抓取

### 4.3 Adapter 模式

#### 接口定义

```typescript
// server/src/adapters/IAdapter.ts
import { HotList } from '../types';

export interface IAdapter {
  /** 平台标识，如 "weibo" */
  readonly platform: string;
  /** 平台中文名，如 "微博热搜" */
  readonly displayName: string;
  /** 执行抓取，返回统一 HotList */
  fetch(): Promise<HotList>;
}
```

#### Adapter 注册表

```typescript
// server/src/adapters/index.ts
import { weiboAdapter } from './weibo';
import { zhihuAdapter } from './zhihu';
import { bilibiliAdapter } from './bilibili';
import { IAdapter } from './IAdapter';

export const adapters: IAdapter[] = [
  weiboAdapter,
  zhihuAdapter,
  bilibiliAdapter,
];
```

#### 各平台抓取方案

| 平台 | 目标 URL | 解析方式 | 字段提取 |
|------|---------|---------|---------|
| 微博 | `https://weibo.com/ajax/side/hotSearch` | JSON 响应 | `data.realtime[]` → rank, word, num, url |
| 知乎 | `https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=20` | JSON 响应 | `data[].target` → rank, title, metrics, url |
| B 站 | `https://api.bilibili.com/x/web-interface/wbi/search/square?limit=20` | JSON 响应 | `data.trending.list[]` → rank, keyword, heat, url |

**微博 Adapter 示例：**

```typescript
// server/src/adapters/weibo.ts
import axios from 'axios';
import { IAdapter } from './IAdapter';
import { HotList, HotItem } from '../types';

export const weiboAdapter: IAdapter = {
  platform: 'weibo',
  displayName: '微博热搜',

  async fetch(): Promise<HotList> {
    const { data } = await axios.get(
      'https://weibo.com/ajax/side/hotSearch',
      { headers: { 'User-Agent': 'Mozilla/5.0 ...' }, timeout: 15_000 }
    );
    const items: HotItem[] = data.data.realtime
      .slice(0, 20)
      .map((item: any, i: number) => ({
        rank: i + 1,
        title: item.word,
        heat: `${(item.num / 10000).toFixed(0)}万`,
        url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word)}`,
        platform: 'weibo',
      }));

    return { platform: 'weibo', items, updatedAt: new Date().toISOString() };
  },
};
```

> **注意：** 以上 URL 和字段路径为设计时的参考值，实际抓取接口以开发阶段实测为准。若 JSON API 不稳定，降级为 HTML 页面 + cheerio 解析。

### 4.4 缓存层

```typescript
// server/src/cache/store.ts
import { HotList } from '../types';

interface CacheEntry {
  data: HotList;
  timestamp: number;        // Date.now() 写入时间
}

const store = new Map<string, CacheEntry>();

/** 默认 1800 秒（30 分钟）；须大于 CRON_INTERVAL，避免两轮抓取间缓存真空 */
const CACHE_TTL_MS =
  Number(process.env.CACHE_TTL ?? 1800) * 1000;

export const cache = {
  /** 抓取成功：写入新数据并清除 error */
  set(platform: string, data: HotList): void {
    const { error: _removed, ...rest } = data;
    store.set(platform, { data: rest, timestamp: Date.now() });
  },

  /** 抓取失败：保留旧 items，写入 error（PRD 失败降级） */
  markError(platform: string, message: string): void {
    const entry = store.get(platform);
    if (!entry) return;
    store.set(platform, {
      data: { ...entry.data, error: message },
      timestamp: entry.timestamp, // 保留上次成功抓取时间
    });
  },

  /** 读取缓存（可能为 undefined） */
  get(platform: string): HotList | undefined {
    const entry = store.get(platform);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      store.delete(platform);
      return undefined;
    }
    return entry.data;
  },

  /** 获取所有未过期缓存 */
  getAll(): HotList[] {
    const result: HotList[] = [];
    for (const platform of store.keys()) {
      const entry = this.get(platform);
      if (entry) result.push(entry);
    }
    return result;
  },
};
```

**缓存策略：**

| 参数 | 默认值 | 环境变量 | 说明 |
|------|--------|---------|------|
| 存储介质 | 内存 `Map` | — | MVP 无外部依赖 |
| 抓取间隔 | 12 分钟 | `CRON_INTERVAL` | Scheduler 触发频率（PRD：10–15 分钟） |
| 缓存 TTL | 1800 秒（30 分钟） | `CACHE_TTL` | API 可读的最长缓存时间 |
| 写入时机 | 抓取成功 | — | `cache.set()` 覆盖并清 error |
| 失败处理 | 保留旧数据 | — | `cache.markError()` 写入 `HotList.error` |
| 读取策略 | 只读缓存 | — | API 不触发上游；用户刷新不打第三方 |

> **约束：** `CACHE_TTL`（秒）应 **大于** `CRON_INTERVAL`（分钟）× 60，确保两轮抓取之间缓存不过期。默认 1800 > 12×60 = 720，满足要求。

### 4.5 定时调度器

```typescript
// server/src/scheduler/index.ts
import cron from 'node-cron';
import { adapters } from '../adapters';
import { cache } from '../cache/store';

const INTERVAL_MINUTES = Number(process.env.CRON_INTERVAL ?? 12);

function formatReason(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

async function fetchAll(): Promise<void> {
  console.log(`[scheduler] fetch start at ${new Date().toISOString()}`);

  const results = await Promise.allSettled(
    adapters.map((adapter) => adapter.fetch())
  );

  results.forEach((result, i) => {
    const { platform } = adapters[i];
    if (result.status === 'fulfilled') {
      cache.set(platform, result.value);
      console.log(`[scheduler] ${platform}: OK (${result.value.items.length} items)`);
    } else {
      const message = formatReason(result.reason);
      console.error(`[scheduler] ${platform}: FAIL — ${message}`);
      cache.markError(platform, message); // 旧数据 + error，供 API 降级返回
    }
  });
}

export function startScheduler(): void {
  fetchAll(); // 启动时立即执行一次
  cron.schedule(`*/${INTERVAL_MINUTES} * * * *`, fetchAll);
  console.log(`[scheduler] scheduled every ${INTERVAL_MINUTES} min`);
}
```

**调度机制：**

- 使用 `node-cron`，而非裸 `setInterval`（更可靠、可读）
- 间隔由 `CRON_INTERVAL` 控制，默认 12 分钟（符合 PRD 10–15 分钟）
- 启动时**立即执行**首轮抓取，避免冷启动长时间无数据
- **`Promise.allSettled`** 并发抓取三个平台，单平台失败不阻塞其余
- 失败时调用 `cache.markError()`：保留旧 `items`，写入 `HotList.error`

---

## 5. 前端设计

### 5.1 组件树

```
<App>
  ├── <Header>                         // Logo + 全局更新时间
  │     └── "最后更新：3 分钟前"
  │
  ├── <main.board-grid>                // CSS Grid 三栏
  │     ├── <HotBoard platform="weibo">
  │     │     ├── <h2>"微博热搜"</h2>
  │     │     ├── <span>"更新于 3 分钟前"</span>
  │     │     └── <ol>
  │     │           └── <HotItem> ×20
  │     │                 ├── <span.rank>  (排名)
  │     │                 ├── <a.title>    (标题 + 外链)
  │     │                 └── <span.heat>  (热度)
  │     ├── <HotBoard platform="zhihu">   …
  │     └── <HotBoard platform="bilibili">…
  │
  ├── <ErrorBanner>                     // 仅全局错误（API 不可达）
  │
  ├── <Footer>                          // 学习项目、非商用声明
  │
  └── <Skeleton>                        // 加载中骨架屏（与内容互斥）
```

### 5.2 状态管理与数据流

不引入 Redux/Zustand 等状态库 — 单个 `useHotData` hook + props 透传足够。

```typescript
// client/src/hooks/useHotData.ts
import { useState, useEffect } from 'react';
import { HotList } from '../types';

interface HotDataState {
  data: HotList[] | null;
  loading: boolean;
  error: string | null;
}

export function useHotData() {
  const [state, setState] = useState<HotDataState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await fetch('/api/hot');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: HotList[] = await res.json();
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (err: any) {
        if (!cancelled) setState({ data: null, loading: false, error: err.message });
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  return state;
}
```

**数据流：**

```
useHotData()                    ← 单次 fetch /api/hot
  │
  ├── loading=true  → <Skeleton />
  ├── error         → <ErrorBanner />（全局错误）
  └── data: HotList[]
        │
        ├── HotList (OK)      → <HotBoard data={list} />
        ├── HotList (error)   → <HotBoard data={list} />  内部显示 error 提示
        └── null              → 不渲染该平台（数据缺失）
```

### 5.3 组件规格

#### `<App>`

- 根组件，调用 `useHotData()`
- 根据状态渲染 Skeleton / ErrorBanner / 三栏布局
- **不**做客户端轮询 — 用户手动刷新浏览器即可获取新数据

#### `<Header>`

- Props：`updatedAt: string | null`（全局最新时间）
- 展示 Logo 文字 "HotNews" + 相对时间
- 无数据时不显示时间

#### `<HotBoard>`

- Props：`hotList: HotList`（单个平台的数据）
- 渲染平台标题、本平台更新时间、Top 20 列表
- 若 `hotList.error` 存在，在面板内显示错误提示（不阻塞其他平台）

#### `<HotItem>`

- Props：`item: HotItem`
- 渲染排名（前 3 名特殊高亮）、标题（`<a>` 外链 `target="_blank"`）、热度
- URL 安全检查：`rel="noopener noreferrer"`

#### `<Skeleton>`

- 三栏骨架占位，每栏 20 行灰色脉冲条
- CSS `@keyframes pulse` 动画

#### `<ErrorBanner>`

- Props：`message: string`
- **仅**全局错误时显示（如 `GET /api/hot` 完全不可达）
- 单平台失败由 `<HotBoard>` 读取 `hotList.error` 在面板内展示，不使用 ErrorBanner

#### `<Footer>`

- 固定页脚文案：学习项目、非商用
- 可附带技术栈简述（React + Express）

### 5.4 响应式设计

| 断点 | 宽度 | 布局 |
|------|------|------|
| Desktop | ≥ 1024px | CSS Grid 三列并排 |
| Tablet | 768–1023px | CSS Grid 两列 + 第三列换行 |
| Mobile | < 768px | 单列堆叠 + Tab 按钮切换平台 |

**Mobile Tab 实现：**
- 状态：`const [activeTab, setActiveTab] = useState<'weibo'|'zhihu'|'bilibili'>('weibo')`
- 三个 Tab 按钮固定在顶部
- 仅渲染 `activeTab` 对应的 `<HotBoard>`

### 5.5 Vite 配置

```typescript
// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',  // 开发代理
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

---

## 6. 前后端契约（API Contract）

### 6.1 共享类型定义

此类型文件前后端一致，可复制或使用 workspace 共享：

```typescript
// shared/types.ts

/** 单条热点 */
export interface HotItem {
  rank: number;           // 排名 1–20
  title: string;          // 标题
  heat: string;           // 热度（格式化字符串，如 "95.6万"）
  url: string;            // 原文链接（绝对 URL）
  platform: 'weibo' | 'zhihu' | 'bilibili';
}

/** 单平台热榜 */
export interface HotList {
  platform: 'weibo' | 'zhihu' | 'bilibili';
  items: HotItem[];       // 热点列表（0–20 条）
  updatedAt: string;      // ISO 8601 时间戳
  error?: string;         // 抓取失败时的错误信息（有此字段时 items 可能为空）
}
```

### 6.2 API 端点详述

#### `GET /api/hot`

获取全部平台热榜数据。

**Response 200** — `HotList[]`

```json
[
  {
    "platform": "weibo",
    "items": [
      { "rank": 1, "title": "xxx", "heat": "95.6万",
        "url": "https://s.weibo.com/weibo?q=xxx", "platform": "weibo" }
    ],
    "updatedAt": "2026-06-01T12:00:00.000Z"
  },
  {
    "platform": "zhihu",
    "items": [],
    "updatedAt": "2026-06-01T11:48:00.000Z",
    "error": "知乎接口返回 502"
  }
]
```

#### `GET /api/hot/:platform`

获取指定平台热榜。

**Path Parameters：** `platform` — `"weibo"` | `"zhihu"` | `"bilibili"`

**Response 200** — `HotList`（同上单个对象）

**Response 404：**

```json
{ "error": "Unknown platform: douyin" }
```

#### `GET /api/health`

健康检查。

**Response 200：**

```json
{
  "status": "ok",
  "uptime": 3600,
  "updatedAt": "2026-06-01T12:00:00.000Z"
}
```

`updatedAt` 为所有平台中最新的抓取时间。

### 6.3 错误响应规范

所有错误响应统一格式：

```typescript
interface ApiError {
  error: string;          // 人类可读错误信息
}
```

| HTTP 状态码 | 场景 |
|------------|------|
| 200 | 正常（含降级，见 `HotList.error`） |
| 404 | 未知平台标识 |
| 500 | 服务端内部错误（缓存崩溃等极端情况） |

**关键约定：** 单个平台抓取失败**不**返回非 2xx 状态码。错误信息写入 `HotList.error` 字段，前端据此展示降级 UI。

### 6.4 CORS

- 开发环境：`Access-Control-Allow-Origin: *`
- 生产环境：锁定为 Vercel 部署域名

---

## 7. 数据流时序

### 7.1 正常流程

```
 Scheduler          Adapter           Cache           API Route        Browser
    │                  │                 │                │               │
    │── cron tick ────▶│                 │                │               │
    │                  │── fetch() ─────▶│ (外部源)        │               │
    │                  │◀── raw data ────│                │               │
    │                  │── 转换为        │                │               │
    │                  │   HotItem[]     │                │               │
    │                  │── cache.set() ─▶│                │               │
    │                  │                 │                │               │
    │                  │                 │◀── GET /api ───│◀── fetch() ──│
    │                  │                 │── HotList[] ───▶── JSON ─────▶│
    │                  │                 │                │               │
```

### 7.2 降级流程（单平台失败）

```
 Scheduler          Weibo             Cache           API Route        Browser
    │                  │                 │                │               │
    │── cron tick ────▶│                 │                │               │
    │                  │── fetch() ✕     │                │               │
    │                  │   (超时/502)     │                │               │
    │                  │── markError() ─▶│ 旧 items + error│               │
    │                  │                 │  (不清空 items) │               │
    │                  │                 │                │               │
    │                  │                 │◀── GET /api ───│◀── fetch() ──│
    │                  │                 │── 微博: 旧数据+error 字段        │
    │                  │                 │   知乎: 最新数据                │
    │                  │                 │   B 站: 最新数据               │
```

---

## 8. 部署架构

### 8.1 环境变量

| 变量 | 服务 | 说明 | 默认值 | 示例 |
|------|------|------|--------|------|
| `PORT` | Server | Express 监听端口 | `3001` | `3001` |
| `CORS_ORIGIN` | Server | 允许的前端域名 | — | `https://hotnews.vercel.app` |
| `CRON_INTERVAL` | Server | 上游抓取间隔（分钟） | `12` | `12` |
| `CACHE_TTL` | Server | API 可读缓存 TTL（秒） | `1800` | `1800` |
| `VITE_API_BASE` | Client | 生产环境后端 API 地址 | — | `https://hotnews-api.railway.app` |

> `CACHE_TTL` 须大于 `CRON_INTERVAL × 60`，见 §4.4 缓存策略。

### 8.2 Vercel（前端）

```
Vercel
  ├── Framework: Vite
  ├── Build Command: cd client && npm run build
  ├── Output Directory: client/dist
  ├── Environment:
  │     VITE_API_BASE = https://hotnews-api.railway.app
  └── 自动 HTTPS + CDN
```

### 8.3 Railway（后端）

```
Railway
  ├── Runtime: Node.js
  ├── Build Command: cd server && npm install && npm run build
  ├── Start Command: cd server && node dist/index.js
  ├── Environment:
  │     PORT = 3001
  │     CORS_ORIGIN = https://hotnews.vercel.app
  │     CRON_INTERVAL = 12
  │     CACHE_TTL = 1800
  └── 自动 HTTPS
```

### 8.4 备选：单机 Docker 部署

```dockerfile
# 一体化镜像
FROM node:20-alpine
COPY server/dist /app/server
COPY client/dist /app/client
# Express 同时 serve 静态文件 + API
```

适用场景：不想用两个平台时，一个 VPS 跑完整服务。

---

## 9. 开发工作流

### 9.1 本地开发

```bash
# 根目录
npm install

# 终端 1：启动后端（端口 3001）
cd server && npm run dev       # tsx watch src/index.ts

# 终端 2：启动前端（端口 5173，自动代理 /api → :3001）
cd client && npm run dev       # vite
```

### 9.2 可用脚本

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "npm run build:server && npm run build:client",
    "build:server": "cd server && npm run build",
    "build:client": "cd client && npm run build"
  }
}
```

### 9.3 开发顺序建议

| 阶段 | 内容 | 验证方式 |
|------|------|---------|
| 1 | 后端：类型定义 + 缓存层 + 一个 Adapter | `curl /api/hot/weibo` 返回 JSON |
| 2 | 后端：补全三个 Adapter + 调度器 | 观察日志 12 分钟自动刷新 |
| 3 | 前端：类型 + useHotData + Skeleton | 页面显示骨架屏 |
| 4 | 前端：HotBoard + HotItem | 三栏展示真实数据 |
| 5 | 前端：响应式 + ErrorBanner + 移动端 Tab | 手机测试 |
| 6 | 部署：Vercel + Railway | 公网可访问 |

---

## 10. 附加约束

### 10.1 不引入的依赖

| 不引入 | 原因 |
|--------|------|
| UI 组件库（MUI/Antd） | MVP 样式简单，纯 CSS 足够 |
| 状态管理库（Redux/Zustand） | 单页、单次请求，无需 |
| React Router | 单页应用，无路由 |
| Redis / 数据库 | MVP 内存缓存足够 |
| Docker（初版） | 直接用 Vercel + Railway |
| 用户认证（Auth0 等） | 无账号系统 |

### 10.2 代码规范

- TypeScript **strict mode**
- ESLint `recommended` + `typescript` 规则集
- Prettier 默认配置
- 样式：**纯 CSS**（同目录 `.tsx` + `.css` 配对）；不引入 CSS Modules / CSS-in-JS
- 命名：组件 PascalCase，函数 camelCase，文件 kebab-case（组件 `.tsx` 除外）

---

## 附录 A：类型对照速查

| 类型 | 定义位置 | 使用方 |
|------|---------|--------|
| `HotItem` | `shared/types.ts` | Server Adapter 输出 / Client 渲染 |
| `HotList` | `shared/types.ts` | Server API 响应 / Client useHotData |
| `IAdapter` | `server/adapters/IAdapter.ts` | Server 内部 |
| `CacheEntry` | `server/cache/store.ts` | Server 内部（含 `markError`） |
| `HotDataState` | `client/hooks/useHotData.ts` | Client 内部 |

---

## 附录 B：变更记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.1 | 2026-06-07 | 统一 `CRON_INTERVAL` / `CACHE_TTL`；架构图改为 node-cron；补充 `cache.markError` 失败降级；新增 Footer 组件；修正 ErrorBanner 职责 |
| v1.0 | 2026-06-01 | 基于 PRD v1.1 创建技术设计文档 |

---

*本文档基于 [PRD.md](./PRD.md) v1.1 编写，所有技术决策均可追溯到 PRD 中的需求条目。*
