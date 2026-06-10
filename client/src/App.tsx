import { HotCard } from './components/HotCard';
import { useHotList } from './hooks/useHotList';
import type { PlatformId } from './types/hot';
import './App.css';

const PLATFORM_ORDER: PlatformId[] = ['weibo', 'zhihu', 'bilibili'];

function App() {
  const { platforms, loading, error, retryPlatform, retryingPlatforms } =
    useHotList();

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">mini-hot-hub</h1>
        <p className="subtitle">微博 · 知乎 · B 站 热榜聚合</p>
      </header>

      {error ? (
        <p className="error-banner" role="alert">
          {error}
        </p>
      ) : null}

      <main className="board-grid">
        {loading
          ? PLATFORM_ORDER.map((platformId) => (
              <article key={platformId} className="hot-card hot-card--loading">
                <p className="loading">加载中…</p>
              </article>
            ))
          : platforms.map((platform) => (
              <HotCard
                key={platform.platformId}
                platform={platform}
                retrying={retryingPlatforms.has(platform.platformId)}
                onRetry={
                  platform.error
                    ? () => retryPlatform(platform.platformId)
                    : undefined
                }
              />
            ))}
      </main>

      <footer className="footer">
        <p>个人学习项目，仅供技术研究，非商用。</p>
        <p>
          本站仅展示各平台公开热榜中的标题、排名、热度及原文链接，不存储或镜像任何正文内容；版权归原作者及原平台所有。
        </p>
        <p>React + TypeScript + Vite · Node.js + Express</p>
      </footer>
    </div>
  );
}

export default App;
