import { useCallback, useEffect, useState } from 'react';
import { fetchAllHot, fetchHotPlatform } from '../api/hot';
import type { HotList, HotPlatform, PlatformId } from '../types/hot';

const PLATFORM_ORDER: PlatformId[] = ['weibo', 'zhihu', 'bilibili'];

const PLATFORM_META: Record<PlatformId, Pick<HotPlatform, 'sourceName' | 'listName'>> = {
  weibo: { sourceName: '微博', listName: '热搜' },
  zhihu: { sourceName: '知乎', listName: '热榜' },
  bilibili: { sourceName: 'B 站', listName: '热搜' },
};

function sortByPlatformOrder(lists: HotList[]): HotList[] {
  const byPlatform = new Map(lists.map((list) => [list.platform, list]));
  return PLATFORM_ORDER.flatMap((platform) => {
    const list = byPlatform.get(platform);
    return list ? [list] : [];
  });
}

function toHotPlatform(list: HotList): HotPlatform {
  const meta = PLATFORM_META[list.platform];
  return {
    platformId: list.platform,
    sourceName: meta.sourceName,
    listName: meta.listName,
    items: list.items,
    updatedAt: list.updatedAt,
    error: list.error,
  };
}

export function useHotList() {
  const [platforms, setPlatforms] = useState<HotPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingPlatforms, setRetryingPlatforms] = useState<Set<PlatformId>>(
    () => new Set(),
  );

  useEffect(() => {
    let cancelled = false;

    fetchAllHot()
      .then((data) => {
        if (!cancelled) {
          setPlatforms(sortByPlatformOrder(data).map(toHotPlatform));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载失败');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const retryPlatform = useCallback(async (platformId: PlatformId) => {
    setRetryingPlatforms((prev) => new Set(prev).add(platformId));

    try {
      const data = await fetchHotPlatform(platformId);
      setPlatforms((prev) =>
        prev.map((platform) =>
          platform.platformId === platformId ? toHotPlatform(data) : platform,
        ),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '加载失败';
      setPlatforms((prev) =>
        prev.map((platform) =>
          platform.platformId === platformId
            ? { ...platform, error: message }
            : platform,
        ),
      );
    } finally {
      setRetryingPlatforms((prev) => {
        const next = new Set(prev);
        next.delete(platformId);
        return next;
      });
    }
  }, []);

  return { platforms, loading, error, retryPlatform, retryingPlatforms };
}
