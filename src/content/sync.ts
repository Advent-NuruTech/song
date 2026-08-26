import { db } from "@/src/db/database";
import { type RawSong, upsertSongCatalog } from "@/src/db/seedSongs";
import { type RawStudy, upsertStudyCatalog } from "@/src/db/seedStudies";

import { ContentConfig, manifestUrl, shardUrl } from "./config";
import { fetchJson } from "./net";
import type { ContentManifest, ManifestCollection } from "./types";

/**
 * Remote content sync (device-as-cache hydration).
 *
 * No-op when no CDN is configured, so the app is fully functional offline. When a
 * `contentBaseUrl` is set, this diffs the remote manifest against locally recorded
 * versions and pulls only the collections that changed, upserting them into the same
 * SQLite tables the bundled seed writes to. Screens never know the difference.
 */

async function localVersion(key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ hash: string }>(
    "SELECT hash FROM content_sync WHERE key = ?",
    [`remote:${key}`]
  );
  return row?.hash ?? null;
}

async function recordVersion(key: string, version: string) {
  await db.runAsync(
    `INSERT INTO content_sync (key, hash, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET hash = excluded.hash, updatedAt = excluded.updatedAt`,
    [`remote:${key}`, version, Date.now()]
  );
}

async function syncCollection(col: ManifestCollection): Promise<boolean> {
  if (col.key !== "songs" && col.key !== "studies") return false;

  const current = await localVersion(col.key);
  if (current === col.version) return false;

  const url = shardUrl(col.path);
  if (!url) return false;

  if (col.key === "songs") {
    const data = await fetchJson<RawSong[]>(url);
    if (!data || !Array.isArray(data)) return false;
    await upsertSongCatalog(data, Object.fromEntries(data.map((item) => [String(item.id ?? ""), item.serverRevision ?? 0])));
  } else {
    const data = await fetchJson<RawStudy[]>(url);
    if (!data || !Array.isArray(data)) return false;
    await upsertStudyCatalog(data, Object.fromEntries(data.map((item) => [String(item.id ?? ""), item.serverRevision ?? 0])));
  }

  await recordVersion(col.key, col.version);
  return true;
}

/**
 * Pull remote content if configured. Safe to call in the background on every launch;
 * it short-circuits instantly when offline or unchanged.
 */
export async function syncRemoteContent(): Promise<void> {
  if (!ContentConfig.remoteEnabled) return;

  const url = manifestUrl();
  if (!url) return;

  const manifest = await fetchJson<ContentManifest>(url);
  if (!manifest?.collections?.length) return;

  for (const col of manifest.collections) {
    try {
      await syncCollection(col);
    } catch (e) {
      console.warn(`Remote sync failed for ${col.key}:`, e);
    }
  }
}
