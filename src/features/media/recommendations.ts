import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MediaItem } from "./types";

const KEY = "advent-pro:media-preferences:v1";
type Signal = "view" | "like";
type Preferences = { categories: Record<string, number>; watched: Record<string, number> };

const EMPTY: Preferences = { categories: {}, watched: {} };

async function readPreferences(): Promise<Preferences> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    if (!value) return EMPTY;
    const parsed = JSON.parse(value) as Partial<Preferences>;
    return { categories: parsed.categories ?? {}, watched: parsed.watched ?? {} };
  } catch {
    return EMPTY;
  }
}

/** Persist only lightweight content signals; no sensitive profile data leaves the device. */
export async function recordMediaPreference(item: MediaItem, signal: Signal) {
  const preferences = await readPreferences();
  const category = item.category.trim().toLowerCase();
  const weight = signal === "like" ? 5 : 1;
  if (category) preferences.categories[category] = Math.min(50, (preferences.categories[category] ?? 0) + weight);
  preferences.watched[item.id] = Date.now();

  const recent = Object.entries(preferences.watched).sort((a, b) => b[1] - a[1]).slice(0, 250);
  preferences.watched = Object.fromEntries(recent);
  await AsyncStorage.setItem(KEY, JSON.stringify(preferences));
}

/** Rank a fetched page using likes, watch history, popularity and freshness. */
export async function rankMediaForViewer(items: MediaItem[]): Promise<MediaItem[]> {
  const preferences = await readPreferences();
  const now = Date.now();
  return items
    .map((item, index) => {
      const categoryAffinity = preferences.categories[item.category.trim().toLowerCase()] ?? 0;
      const watchedAt = preferences.watched[item.id];
      const seenPenalty = watchedAt ? Math.max(2, 14 - (now - watchedAt) / 86_400_000) : 0;
      const ageDays = Math.max(0, (now - new Date(item.publishedAt).getTime()) / 86_400_000);
      const freshness = Math.max(0, 8 - Math.log2(ageDays + 1));
      const popularity = Math.log10(item.viewCount + item.likeCount * 4 + item.commentCount * 6 + 1);
      return { item, index, score: categoryAffinity * 2.4 + popularity * 2 + freshness + (item.isFeatured ? 5 : 0) - seenPenalty };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}
