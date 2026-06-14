import { useNow } from '../hooks/useNow';
import type { HotPlatform } from '../types/hot';
import { formatRelativeTime } from '../utils/formatTime';
import './HotCard.css';

interface HotCardProps {
  platform: HotPlatform;
  retrying?: boolean;
  onRetry?: () => void;
}

export function HotCard({ platform, retrying = false, onRetry }: HotCardProps) {
  const now = useNow();
  const { sourceName, listName, items, updatedAt, error } = platform;
  const isEmpty = items.length === 0;

  return (
    <article className="hot-card">
      <header className="hot-card__header">
        <h2 className="hot-card__source">{sourceName}</h2>
        <span className="hot-card__list-name">{listName}</span>
      </header>

      {error ? (
        <div className="hot-card__error" role="alert">
          <p className="hot-card__message hot-card__message--error">{error}</p>
          {onRetry ? (
            <button
              type="button"
              className="hot-card__retry"
              onClick={onRetry}
              disabled={retrying}
            >
              {retrying ? '重试中…' : '重试'}
            </button>
          ) : null}
        </div>
      ) : null}

      {isEmpty && !error ? (
        <p className="hot-card__message">暂无数据</p>
      ) : (
        <ol className="hot-card__list">
          {items.map((item) => (
            <li key={item.rank} className="hot-card__item">
              <span className={`hot-card__rank hot-card__rank--${item.rank}`}>
                {item.rank}
              </span>
              <a
                className="hot-card__title"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.title}
              </a>
              {item.heat ? (
                <span className="hot-card__heat">{item.heat}</span>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      <footer className="hot-card__footer">
        <time dateTime={updatedAt} title="服务端缓存期间为上次抓取时间，不会随页面刷新更新">
          更新于 {formatRelativeTime(updatedAt, now)}
        </time>
        <p className="hot-card__cache-hint">缓存期内时间不变属正常现象</p>
      </footer>
    </article>
  );
}
