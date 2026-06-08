import { useEffect, useState } from 'react';
import { fetchHotLists } from './api/hot';
import type { HotList } from './types/hot';

const PLATFORM_NAMES: Record<string, string> = {
  weibo: '微博热搜',
  zhihu: '知乎热榜',
  bilibili: 'B 站热搜',
};

function App() {
  const [lists, setLists] = useState<HotList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchHotLists()
      .then((data) => {
        if (!cancelled) setLists(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <h1 className="logo">mini-hot-hub</h1>
        </header>
        <main className="main">
          <p className="loading">加载中…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">mini-hot-hub</h1>
        <p className="subtitle">微博 · 知乎 · B 站 热榜聚合</p>
      </header>

      <main className="board-grid">
        {lists.map((list) => (
          <section key={list.platform} className="board">
            <h2 className="board-title">
              {PLATFORM_NAMES[list.platform] ?? list.platform}
            </h2>
            <ol className="hot-list">
              {list.items.map((item) => (
                <li key={item.rank} className="hot-item">
                  <span className={`rank rank-${item.rank}`}>{item.rank}</span>
                  <a
                    className="title"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title}
                  </a>
                  <span className="heat">{item.heat}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </main>

      <footer className="footer">
        <p>学习项目 · 非商用 · React + TypeScript + Vite</p>
      </footer>
    </div>
  );
}

export default App;
