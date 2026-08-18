import Constants from "expo-constants";

import { db } from "@/src/db/database";
import { type RawSong, upsertSongs } from "@/src/db/seedSongs";
import { type RawStudy, upsertStudies } from "@/src/db/seedStudies";

/**
 * Supabase content sync (device-as-cache hydration).
 *
 * The online admin dashboard writes content to Supabase. The app pulls only the
 * rows that changed since its last sync (delta by `updated_at`) using the public
 * anon key + PostgREST, and feeds them through the SAME upsert paths the bundled
 * seed uses — so screens never know the difference. Fully offline-tolerant:
 * every failure is swallowed and the bundled/cached content keeps working.
 *
 * Sync rules (mirror supabase/schema.sql RLS):
 *   deleted = true        -> remove the row locally (tombstone)
 *   is_published = true   -> upsert the row locally
 *
 * We use the REST API directly (no @supabase/supabase-js) to keep the app light.
 */

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function readUrl(): string | null {
  const raw =
    (process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || "").trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

function readAnonKey(): string | null {
  const raw =
    (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || "").trim();
  return raw || null;
}

export const SupabaseConfig = {
  url: readUrl(),
  anonKey: readAnonKey(),
  pageSize: 1000,
  fetchTimeoutMs: 15000,
  get enabled(): boolean {
    return !!this.url && !!this.anonKey;
  },
};

type SongRow = {
  id: string;
  hymn_number: number | null;
  title: string | null;
  language: string | null;
  author: string | null;
  stanzas: unknown;
  chorus: unknown;
  is_published: boolean;
  deleted: boolean;
  updated_at: string;
};

type StudyRow = {
  id: string;
  category: string | null;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  author: string | null;
  is_featured: boolean;
  is_published: boolean;
  deleted: boolean;
  updated_at: string;
};

/** GET a page from PostgREST with the anon key. Returns null on any failure. */
async function restGet<T>(
  table: string,
  query: string
): Promise<T[] | null> {
  if (!SupabaseConfig.enabled) return null;
  const url = `${SupabaseConfig.url}/rest/v1/${table}?${query}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SupabaseConfig.fetchTimeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        apikey: SupabaseConfig.anonKey as string,
        Authorization: `Bearer ${SupabaseConfig.anonKey}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lastSync(collection: string): Promise<string> {
  const row = await db.getFirstAsync<{ hash: string }>(
    "SELECT hash FROM content_sync WHERE key = ?",
    [`supabase:${collection}`]
  );
  // ISO epoch start = pull everything on first run.
  return row?.hash || "1970-01-01T00:00:00Z";
}

async function recordSync(collection: string, maxUpdatedAt: string) {
  await db.runAsync(
    `INSERT INTO content_sync (key, hash, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET hash = excluded.hash, updatedAt = excluded.updatedAt`,
    [`supabase:${collection}`, maxUpdatedAt, Date.now()]
  );
}

async function deleteByIds(table: "songs" | "studies", ids: string[]) {
  if (!ids.length) return;
  const chunkSize = 400;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => "?").join(",");
    await db.runAsync(`DELETE FROM ${table} WHERE id IN (${placeholders})`, chunk);
  }
}

/** Fetch every row changed since `since`, paging until exhausted. */
async function fetchChanged<T>(
  table: string,
  since: string,
  columns: string
): Promise<T[] | null> {
  const all: T[] = [];
  for (let offset = 0; ; offset += SupabaseConfig.pageSize) {
    const q =
      `select=${columns}` +
      `&updated_at=gt.${encodeURIComponent(since)}` +
      `&order=updated_at.asc` +
      `&limit=${SupabaseConfig.pageSize}` +
      `&offset=${offset}`;
    const page = await restGet<T>(table, q);
    if (page === null) return offset === 0 ? null : all; // network error
    all.push(...page);
    if (page.length < SupabaseConfig.pageSize) break;
  }
  return all;
}

function toRawSong(row: SongRow): RawSong {
  return {
    id: row.id,
    hymnNumber: row.hymn_number ?? 0,
    title: row.title ?? "",
    language: row.language ?? "unknown",
    author: row.author ?? "",
    stanzas: (row.stanzas as RawSong["stanzas"]) ?? [],
    chorus: (row.chorus as RawSong["chorus"]) ?? null,
  };
}

function toRawStudy(row: StudyRow): RawStudy {
  return {
    id: row.id,
    category: row.category ?? "",
    title: row.title ?? "",
    subtitle: row.subtitle ?? "",
    content: row.content ?? "",
    author: row.author ?? "",
    isFeatured: !!row.is_featured,
  };
}

async function syncSongs(): Promise<void> {
  const since = await lastSync("songs");
  const rows = await fetchChanged<SongRow>(
    "songs",
    since,
    "id,hymn_number,title,language,author,stanzas,chorus,is_published,deleted,updated_at"
  );
  if (!rows || !rows.length) return;

  const tombstones = rows.filter((r) => r.deleted).map((r) => r.id);
  const live = rows.filter((r) => !r.deleted).map(toRawSong);

  if (live.length) await upsertSongs(live);
  await deleteByIds("songs", tombstones);

  const maxUpdatedAt = rows[rows.length - 1].updated_at;
  await recordSync("songs", maxUpdatedAt);
}

async function syncStudies(): Promise<void> {
  const since = await lastSync("studies");
  const rows = await fetchChanged<StudyRow>(
    "studies",
    since,
    "id,category,title,subtitle,content,author,is_featured,is_published,deleted,updated_at"
  );
  if (!rows || !rows.length) return;

  const tombstones = rows.filter((r) => r.deleted).map((r) => r.id);
  const live = rows.filter((r) => !r.deleted).map(toRawStudy);

  if (live.length) await upsertStudies(live);
  await deleteByIds("studies", tombstones);

  const maxUpdatedAt = rows[rows.length - 1].updated_at;
  await recordSync("studies", maxUpdatedAt);
}

/**
 * Pull published content from Supabase if configured. Safe to call in the
 * background on every launch; short-circuits instantly when unconfigured or
 * offline, and never throws (logs and returns).
 */
export async function syncSupabaseContent(): Promise<void> {
  if (!SupabaseConfig.enabled) return;
  try {
    await syncSongs();
  } catch (e) {
    console.warn("Supabase songs sync failed:", e);
  }
  try {
    await syncStudies();
  } catch (e) {
    console.warn("Supabase studies sync failed:", e);
  }
}
