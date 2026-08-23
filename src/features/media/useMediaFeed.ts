import { useCallback, useEffect, useState } from "react";

import { getCachedMedia, listMediaPage } from "./mediaService";
import type { MediaCursor, MediaItem, MediaType } from "./types";

export function useMediaFeed(type: MediaType) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [cursor, setCursor] = useState<MediaCursor | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineCache, setOfflineCache] = useState(false);

  const loadFirst = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const page = await listMediaPage(type);
      setItems(page.items);
      setCursor(page.nextCursor);
      setOfflineCache(false);
    } catch (reason) {
      const cached = await getCachedMedia(type);
      setItems(cached);
      setCursor(null);
      setOfflineCache(cached.length > 0);
      setError((reason as Error)?.message || "Unable to load media.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type]);

  useEffect(() => { void loadFirst(); }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || offlineCache) return;
    setLoadingMore(true);
    try {
      const page = await listMediaPage(type, cursor);
      setItems((current) => {
        const existing = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !existing.has(item.id))];
      });
      setCursor(page.nextCursor);
    } catch (reason) {
      setError((reason as Error)?.message || "Unable to load more media.");
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, offlineCache, type]);

  const patchItem = useCallback((id: string, patch: Partial<MediaItem>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }, []);

  return {
    items, loading, loadingMore, refreshing, error, offlineCache, hasMore: Boolean(cursor),
    refresh: () => loadFirst(true), loadMore, patchItem,
  };
}
