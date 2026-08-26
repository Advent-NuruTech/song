import { ContentConfig, shardUrl } from "@/src/content/config";
import { fetchJson } from "@/src/content/net";
import { fetchPublishedContentItem } from "@/src/content/supabase";
import { db } from "@/src/db/database";
import { type RawSong, upsertSongs } from "@/src/db/seedSongs";
import { type RawStudy, upsertStudies } from "@/src/db/seedStudies";

export type DownloadableContentType = "song" | "study";

const bundledSongs = require("../../content/bundles/songs.json") as RawSong[];
const bundledStudies = require("../../content/bundles/studies.json") as RawStudy[];

export async function isContentDownloaded(type: DownloadableContentType, id: string) {
  const row = await db.getFirstAsync<{ found: number }>(
    "SELECT 1 AS found FROM content_downloads WHERE contentType = ? AND contentId = ?",
    [type, id]
  );
  return !!row;
}

export async function touchDownloadedContent(type: DownloadableContentType, id: string) {
  await db.runAsync(
    "UPDATE content_downloads SET lastAccessedAt = ? WHERE contentType = ? AND contentId = ?",
    [Date.now(), type, id]
  );
}

async function fetchItem<T>(type: DownloadableContentType, id: string): Promise<T | null> {
  if (ContentConfig.remoteEnabled) {
    const url = shardUrl(`items/${type}s/${encodeURIComponent(id)}.json`);
    const item = url ? await fetchJson<T>(url) : null;
    if (item) return item;
  }
  return fetchPublishedContentItem(type, id) as Promise<T | null>;
}

/** Hydrates one body only after an explicit user action. Catalog metadata stays local. */
export async function downloadContent(type: DownloadableContentType, id: string) {
  const metadata = await db.getFirstAsync<{ contentSource: string; serverRevision: number }>(
    `SELECT contentSource,serverRevision FROM ${type === "song" ? "songs" : "studies"} WHERE id=?`,
    [id]
  );
  const serverOwned = metadata?.contentSource === "server";
  if (type === "song") {
    const local = bundledSongs.find((item) => String(item.id) === id);
    const remote = serverOwned || !local ? await fetchItem<RawSong>(type, id) : null;
    const item = remote ?? local;
    if (!item) throw new Error("This song is not available for download right now.");
    await upsertSongs([item], { source: serverOwned || !!remote ? "server" : "bundled", revisions: { [id]: item.serverRevision ?? metadata?.serverRevision ?? 0 } });
  } else {
    const local = bundledStudies.find((item) => String(item.id) === id);
    const remote = serverOwned || !local ? await fetchItem<RawStudy>(type, id) : null;
    const item = remote ?? local;
    if (!item) throw new Error("This study is not available for download right now.");
    await upsertStudies([item], { source: serverOwned || !!remote ? "server" : "bundled", revisions: { [id]: item.serverRevision ?? metadata?.serverRevision ?? 0 } });
  }

  const now = Date.now();
  await db.runAsync(
    `INSERT INTO content_downloads(contentType, contentId, downloadedAt, lastAccessedAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(contentType, contentId) DO UPDATE SET
       downloadedAt = excluded.downloadedAt,
       lastAccessedAt = excluded.lastAccessedAt`,
    [type, id, now, now]
  );
}

/** Removes the heavy body while preserving the searchable/browsable catalog row. */
export async function removeDownloadedContent(type: DownloadableContentType, id: string) {
  await db.withTransactionAsync(async () => {
    if (type === "song") {
      await db.runAsync("UPDATE songs SET stanzas = '[]', chorus = NULL, contentHash = NULL WHERE id = ?", [id]);
    } else {
      await db.runAsync("UPDATE studies SET content = '', contentHash = NULL WHERE id = ?", [id]);
    }
    await db.runAsync(
      "DELETE FROM content_downloads WHERE contentType = ? AND contentId = ?",
      [type, id]
    );
  });
}
