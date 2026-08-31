import { useCallback, useEffect, useState } from "react";

import { getCachedMedia, listMediaPage, searchMedia } from "./mediaService";
import type { MediaCursor, MediaFeedType, MediaItem } from "./types";
import { rankMediaForViewer } from "./recommendations";
import { mediaDescriptionToPlainText } from "./utils";

export function useMediaFeed(type: MediaFeedType, searchQuery = "") {
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
      const term = searchQuery.trim();
      if (term) {
        setItems(await searchMedia(type, term));
        setCursor(null);
        setOfflineCache(false);
        return;
      }
      const page = await listMediaPage(type);
      setItems(await rankMediaForViewer(page.items));
      setCursor(page.nextCursor);
      setOfflineCache(false);
    } catch (reason) {
      const cached = await getCachedMedia(type);
      const term = searchQuery.trim().toLocaleLowerCase();
      setItems(term ? cached.filter((item) => `${item.title} ${item.category} ${mediaDescriptionToPlainText(item.description)}`.toLocaleLowerCase().includes(term)) : cached);
      setCursor(null);
      setOfflineCache(cached.length > 0);
      setError((reason as Error)?.message || "Unable to load media.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, type]);

  useEffect(() => { void loadFirst(); }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (searchQuery.trim() || !cursor || loadingMore || offlineCache) return;
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
  }, [cursor, loadingMore, offlineCache, searchQuery, type]);

  const patchItem = useCallback((id: string, patch: Partial<MediaItem>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }, []);

  return {
    items, loading, loadingMore, refreshing, error, offlineCache, hasMore: Boolean(cursor),
    refresh: () => loadFirst(true), loadMore, patchItem,
  };
}
