# mini-hot-hub

聚合微博、知乎、B 站热榜的轻量 Web 应用。Monorepo 结构：`client/`（React + Vite）· `server/`（Node.js + Express）。

## 环境要求

- [Node.js](https://nodejs.org/) **18+**（推荐 20 LTS）
- npm（随 Node 安装）

## 安装依赖

前后端各自独立管理依赖。推荐在**项目根目录**一次性安装：

```bash
npm install          # 根目录 dev 工具（concurrently）
npm run install:all  # 安装 server/ 与 client/ 依赖
```

也可分别在子目录安装：

```bash
cd server && npm install
cd ../client && npm install
```

## 本地开发

开发时需要**同时**启动后端与前端。

### 方式一：根目录一条命令（推荐）

```bash
npm run dev
```

`concurrently` 会并行启动后端（`:3001`）与前端（`:5173`）。

### 方式二：分开两个终端

**终端 1 — 后端**（默认 `http://localhost:3001`）：

```bash
npm run dev:server
# 或 cd server && npm run dev
```

看到 `[server] listening on :3001` 即表示后端已就绪。

**终端 2 — 前端**（默认 `http://localhost:5173`）：

```bash
npm run dev:client
# 或 cd client && npm run dev
```

浏览器访问 [http://localhost:5173](http://localhost:5173)。前端通过 Vite 开发代理将 `/api/*` 转发到后端，无需额外配置。

### 根目录脚本一览

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端 |
| `npm run dev:server` | 仅启动后端 |
| `npm run dev:client` | 仅启动前端 |
| `npm run build` | 构建前后端 |
| `npm run build:server` | 仅构建后端 |
| `npm run build:client` | 仅构建前端 |
| `npm run start:server` | 启动已构建的后端（生产） |
| `npm run install:all` | 安装 server 与 client 依赖 |

## 部署

### Railway（后端，从根目录启动）

在 Railway 新建服务并关联本仓库后，**Root Directory 保持为空**（使用仓库根目录），在 Settings → Deploy 中配置：

| 配置项 | 值 |
|--------|-----|
| **Build Command** | `npm install --prefix server && npm run build:server` |
| **Start Command** | `npm run start:server` |

说明：

- Railway 检测到根目录 `package.json` 时会先执行 `npm install`，安装 `concurrently` 等根级 dev 依赖；Build Command 再为 `server/` 安装生产依赖并执行 `tsc` 编译。
- `start:server` 等价于 `cd server && node dist/index.js`（即 `server/package.json` 的 `start` 脚本）。
- 环境变量示例：`CORS_ORIGIN`（前端域名）、`CRON_INTERVAL`（默认 12）、`CACHE_TTL`（默认 1800）。`PORT` 由 Railway 自动注入，无需手动设置。

**备选**：将 Railway 的 Root Directory 设为 `server`，则 Build / Start 可简化为 `npm install && npm run build` 与 `npm start`，无需根目录脚本。

### Vercel（前端）

| 配置项 | 值 |
|--------|-----|
| **Build Command** | `cd client && npm install && npm run build` |
| **Output Directory** | `client/dist` |
| **Environment** | `VITE_API_BASE` = Railway 后端公网地址 |

### 验证接口

```bash
# 健康检查
curl http://localhost:3001/api/health

# 全部平台热榜
curl http://localhost:3001/api/hot

# 单平台（weibo | zhihu | bilibili）
curl http://localhost:3001/api/hot/weibo
```

## 常见问题

### 端口被占用

默认端口：

| 服务 | 端口 | 配置位置 |
|------|------|----------|
| 前端 (Vite) | 5173 | `client/vite.config.ts` → `server.port` |
| 后端 (Express) | 3001 | 环境变量 `PORT`，或 `server/src/index.ts` |

**macOS / Linux** 查看占用进程：

```bash
lsof -i :5173
lsof -i :3001
```

结束进程（将 `PID` 替换为实际进程号）：

```bash
kill PID
# 仍无法释放时
kill -9 PID
```

**修改端口：**

- 后端：启动时指定 `PORT=3002 npm run dev`
- 前端：修改 `client/vite.config.ts` 中的 `server.port`，并同步更新 `client/vite.config.ts` 里 `proxy` 的目标地址（若后端端口也改了）

> 若修改了前端端口，需同步设置后端 CORS，否则浏览器可能拦截跨域请求：
>
> ```bash
> CORS_ORIGIN=http://localhost:新端口 npm run dev
> ```

### 代理不生效 / 接口请求失败

开发环境下，前端请求走 Vite 代理（`client/vite.config.ts`）：

```ts
proxy: {
  '/api': 'http://localhost:3001',
}
```

按以下顺序排查：

1. **确认后端已启动**  
   代理只是把请求转发到 `localhost:3001`，后端未运行时会报连接失败。先用 `curl http://localhost:3001/api/health` 验证。

2. **确认使用 `npm run dev` 启动前端**  
   Vite 代理仅在开发模式生效。`npm run build` + `npm run preview` 或部署静态文件时，没有开发代理，需自行配置反向代理或设置 `VITE_API_BASE`。

3. **不要误设 `VITE_API_BASE`**  
   本地开发应保持未设置（或为空），让请求走相对路径 `/api/...` 经代理转发。若设置了指向其他地址的 `VITE_API_BASE`，会绕过 Vite 代理。

4. **后端端口与代理目标一致**  
   若用 `PORT=3002` 改了后端端口，需同步修改 `client/vite.config.ts` 中 `proxy['/api']` 的目标 URL。

5. **CORS 跨域（直连后端时）**  
   若前端未走代理、直接请求 `http://localhost:3001`，需保证后端 `CORS_ORIGIN` 与前端地址一致（默认 `http://localhost:5173`）。

## 数据来源说明

本项目的榜单数据由后端从各平台 **公开 JSON 接口** 抓取，经内存缓存后通过 `/api/hot` 提供给前端；**不解析 HTML 页面**。

| 平台 | 接口 | 主要字段 |
|------|------|----------|
| 微博 | `https://weibo.com/ajax/side/hotSearch` | `data.realtime[]` → 标题、热度、排名 |
| 知乎 | `https://api.zhihu.com/topstory/hot-lists/total?limit=20` | `data[].target` → 标题、链接；`detail_text` → 热度 |
| B 站 | `https://api.bilibili.com/x/web-interface/wbi/search/square?limit=20` | `data.trending.list[]` → 关键词、热度 |

各平台缓存 key 相互独立（`hot:weibo`、`hot:zhihu`、`hot:bilibili`）。单平台刷新使用 `GET /api/hot/:platform?refresh=1`，不会影响其他平台的缓存。

### 更新频率

- 后端对成功抓取的结果做内存缓存，默认 **TTL 为 600 秒（10 分钟）**，可通过环境变量 `CACHE_TTL`（单位：秒）调整。
- 缓存有效期内重复访问 `/api/hot` 返回缓存数据，`updatedAt` 保持不变属正常现象。
- 缓存过期后，下一次 API 请求会重新抓取对应平台；失败时不写入缓存，并返回带 `error` 的降级响应。

### 免责声明

本项目仅供 **个人学习与技术交流**，非商业产品，与各平台（微博、知乎、哔哩哔哩）**无任何官方关联或授权**。所展示的热榜内容版权归原作者及相应平台所有；链接跳转至第三方网站，请遵守各平台服务条款。接口字段可能随时变更，数据仅供参考，不保证实时性与完整性。

## 相关文档

- [PRD](docs/PRD.md) · [技术设计](docs/TECH_DESIGN.md) · [开发指令](docs/AGENTS.md)
