import Constants from "expo-constants";

/**
 * Content delivery configuration.
 *
 * The app is offline-first: it ships with a small "starter" set of content baked
 * into the binary and ALWAYS works with zero infrastructure. When `contentBaseUrl`
 * is configured (via app config `extra.contentBaseUrl` or the EXPO_PUBLIC_CONTENT_URL
 * env var), the app additionally pulls a remote manifest from a CDN and hydrates the
 * local SQLite cache on demand. SQLite becomes a cache, not the source of truth.
 *
 * This is the seam that lets the project move from "everything bundled" to
 * "edge-delivered, device-as-cache" WITHOUT rewriting any screens — screens keep
 * reading SQLite; only what fills SQLite changes.
 */

type Extra = {
  contentBaseUrl?: string;
  contentChannel?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function readBaseUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_CONTENT_URL;
  const raw = (fromEnv && fromEnv.trim()) || (extra.contentBaseUrl ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export const ContentConfig = {
  /** CDN / object-storage origin for content. `null` => offline-only (bundled). */
  baseUrl: readBaseUrl(),

  /** Release channel for the manifest (e.g. "stable", "beta"). */
  channel: (process.env.EXPO_PUBLIC_CONTENT_CHANNEL || extra.contentChannel || "stable").trim(),

  /** Whether remote content delivery is active. */
  get remoteEnabled(): boolean {
    return !!this.baseUrl;
  },

  /** Max items kept hydrated in the on-device cache before LRU eviction kicks in. */
  cacheLimit: 5000,

  /** Network timeout for content fetches (ms). */
  fetchTimeoutMs: 15000,
};

export function manifestUrl(): string | null {
  if (!ContentConfig.baseUrl) return null;
  return `${ContentConfig.baseUrl}/manifest/${ContentConfig.channel}.json`;
}

/** Resolve a content-addressed shard URL: `{baseUrl}/{path}`. */
export function shardUrl(path: string): string | null {
  if (!ContentConfig.baseUrl) return null;
  const clean = path.replace(/^\/+/, "");
  return `${ContentConfig.baseUrl}/${clean}`;
}
