# 今日热搜 · 开发指令

## 项目概述
使用 React + TypeScript + Vite + CSS 开发前端；
使用 Node.js + Express 开发后端，聚合微博/知乎/B 站热榜 Top 20。
Monorepo 结构：`client/` · `server/` · `shared/types.ts`；部署目标 Vercel + Railway。
细节以 `docs/TECH_DESIGN.md` 为准（与 PRD 冲突时亦以 TECH_DESIGN 为准）。

## 开发规范
- 使用 TypeScript strict，前后端类型与 `shared/types.ts` / TECH_DESIGN 一致
- 使用函数式组件 + Hooks；不引入 Redux、React Router、UI 组件库
- 样式使用纯 CSS（`.tsx` + 同目录 `.css`），保持简洁
- 核心组件：`App`、`Header`、`HotBoard`、`HotItem`、`Skeleton`、`ErrorBanner`、`Footer`
- 后端 Adapter 模式：每平台独立模块，Scheduler 定时抓取，API 只读缓存

## 代码风格
- 组件名 PascalCase，函数 camelCase
- 接口路径：`GET /api/hot`、`GET /api/hot/:platform`（`weibo` | `zhihu` | `bilibili`）、`GET /api/health`
- 禁止在前端 fetch 微博/知乎/B 站原始域名；仅请求 `/api/*`
- 单平台失败写 `HotList.error` 并保留旧数据，HTTP 仍 200

## 设计要求
- 参考今日热榜的信息密度，清爽易读
- 桌面 ≥1024px 三列；平板 768–1023px 两列；移动端 Tab 切换单平台
- 排名 1～3 可视觉强调
- 单平台失败在 `HotBoard` 内显示错误文案，不拖垮整页；`ErrorBanner` 仅用于 API 完全不可达

## 注意事项
- 上游请求加合理 User-Agent、Referer（按平台文档）
- 抓取间隔 `CRON_INTERVAL` 默认 12 分钟；缓存 TTL `CACHE_TTL` 默认 1800 秒（须大于 `CRON_INTERVAL × 60`）
- API 只读缓存，不做客户端轮询；用户刷新不打上游
- 不要把敏感信息提交到公开 GitHub
- 页脚注明：学习项目、非商用

## 测试要求
- 每完成一个平台，手动验证 ≥10 条数据（如 `curl /api/hot/weibo`）
- 测试：单平台挂掉时其他平台仍正常，失败平台有 `error` 且保留旧数据
- 测试：10 分钟内重复刷新不会疯狂打上游（仅 Scheduler 触发抓取）
