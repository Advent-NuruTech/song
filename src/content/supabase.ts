import Constants from "expo-constants";

import { db } from "@/src/db/database";
import { type RawSong, upsertSongCatalog } from "@/src/db/seedSongs";
import { type RawStudy, upsertStudyCatalog } from "@/src/db/seedStudies";

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
  category: string | null;
  author: string | null;
  stanzas: unknown;
  chorus: unknown;
  is_published: boolean;
  deleted: boolean;
  updated_at: string;
  revision: number;
};

type StudyRow = {
  id: string;
  category: string | null;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  author: string | null;
  is_featured: boolean;
  word_count: number;
  is_published: boolean;
  deleted: boolean;
  updated_at: string;
  revision: number;
};

type CategoryRow = { content_type: "song" | "study"; name: string; display_name: string; color: string; icon: string; description: string; sort_order: number; revision: number; updated_at: string };

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

async function lastSync(collection: string): Promise<number> {
  const row = await db.getFirstAsync<{ hash: string }>(
    "SELECT hash FROM content_sync WHERE key = ?",
    [`supabase:${collection}`]
  );
  // ISO epoch start = pull everything on first run.
  const revision = Number(row?.hash || "0");
  return Number.isFinite(revision) ? revision : 0;
}

async function recordSync(collection: string, revision: number) {
  await db.runAsync(
    `INSERT INTO content_sync (key, hash, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET hash = excluded.hash, updatedAt = excluded.updatedAt`,
    [`supabase:${collection}`, String(revision), Date.now()]
  );
}

async function deleteByIds(table: "songs" | "studies", ids: string[]) {
  if (!ids.length) return;
  const chunkSize = 400;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => "?").join(",");
    await db.runAsync(`DELETE FROM content_downloads WHERE contentType = ? AND contentId IN (${placeholders})`, [table === "songs" ? "song" : "study", ...chunk]);
    await db.runAsync(`DELETE FROM ${table} WHERE id IN (${placeholders})`, chunk);
  }
}

/** Fetch every row changed since `since`, paging until exhausted. */
async function fetchChanged<T>(
  table: string,
  since: number,
  columns: string
): Promise<T[] | null> {
  const all: T[] = [];
  for (let offset = 0; ; offset += SupabaseConfig.pageSize) {
    const q =
      `select=${columns}` +
      `&revision=gt.${since}` +
      `&order=revision.asc` +
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
    category: row.category ?? "hymn",
    author: row.author ?? "",
    stanzas: (row.stanzas as RawSong["stanzas"]) ?? [],
    chorus: (row.chorus as RawSong["chorus"]) ?? null,
    serverRevision: row.revision,
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
    serverRevision: row.revision,
  };
}

async function syncSongs(): Promise<void> {
  const since = await lastSync("songs");
  const rows = await fetchChanged<SongRow>(
    "songs",
    since,
    "id,hymn_number,title,language,category,author,is_published,deleted,updated_at,revision"
  );
  if (!rows || !rows.length) return;

  const tombstones = rows.filter((r) => r.deleted).map((r) => r.id);
  const live = rows.filter((r) => !r.deleted).map((row) => ({ id: row.id, hymnNumber: row.hymn_number ?? 0, title: row.title ?? "", language: row.language ?? "unknown", category: row.category ?? "hymn", author: row.author ?? "" }));

  if (live.length) {
    const revisions = Object.fromEntries(rows.filter((r) => !r.deleted).map((r) => [r.id, r.revision]));
    await upsertSongCatalog(live, revisions);
  }
  await deleteByIds("songs", tombstones);

  await recordSync("songs", rows[rows.length - 1].revision);
}

async function syncStudies(): Promise<void> {
  const since = await lastSync("studies");
  const rows = await fetchChanged<StudyRow>(
    "studies",
    since,
    "id,category,title,subtitle,author,word_count,is_featured,is_published,deleted,updated_at,revision"
  );
  if (!rows || !rows.length) return;

  const tombstones = rows.filter((r) => r.deleted).map((r) => r.id);
  const live = rows.filter((r) => !r.deleted).map((row) => ({ id: row.id, category: row.category ?? "", title: row.title ?? "", subtitle: row.subtitle ?? "", author: row.author ?? "", wordCount: row.word_count ?? 0, isFeatured: row.is_featured }));

  if (live.length) {
    const revisions = Object.fromEntries(rows.filter((r) => !r.deleted).map((r) => [r.id, r.revision]));
    await upsertStudyCatalog(live, revisions);
  }
  await deleteByIds("studies", tombstones);

  await recordSync("studies", rows[rows.length - 1].revision);
}

async function syncCategories() {
  const rows: CategoryRow[] = [];
  for (let offset = 0; ; offset += SupabaseConfig.pageSize) {
    const page = await restGet<CategoryRow>("content_categories", `select=content_type,name,display_name,color,icon,description,sort_order,revision,updated_at&order=content_type.asc,sort_order.asc&limit=${SupabaseConfig.pageSize}&offset=${offset}`);
    if (!page) return;
    rows.push(...page);
    if (page.length < SupabaseConfig.pageSize) break;
  }
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        `INSERT INTO content_categories(contentType,name,displayName,color,icon,description,sortOrder,serverRevision,updatedAt)
         VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(contentType,name) DO UPDATE SET
         displayName=excluded.displayName,color=excluded.color,icon=excluded.icon,
         description=excluded.description,sortOrder=excluded.sortOrder,
         serverRevision=excluded.serverRevision,updatedAt=excluded.updatedAt`,
        [row.content_type,row.name,row.display_name,row.color,row.icon,row.description ?? "",row.sort_order,row.revision,Date.parse(row.updated_at) || Date.now()]
      );
    }
    const keys = new Set(rows.map((row) => `${row.content_type}:${row.name}`));
    const existing = await db.getAllAsync<{ contentType: string; name: string }>("SELECT contentType,name FROM content_categories WHERE serverRevision > 0");
    for (const item of existing) if (!keys.has(`${item.contentType}:${item.name}`)) await db.runAsync("DELETE FROM content_categories WHERE contentType=? AND name=?",[item.contentType,item.name]);
  });
}

export async function fetchPublishedContentItem(type: "song" | "study", id: string): Promise<RawSong | RawStudy | null> {
  const table = type === "song" ? "songs" : "studies";
  const columns = type === "song"
    ? "id,hymn_number,title,language,category,author,stanzas,chorus,is_published,deleted,updated_at,revision"
    : "id,category,title,subtitle,content,author,word_count,is_featured,is_published,deleted,updated_at,revision";
  const rows = await restGet<SongRow | StudyRow>(table, `select=${columns}&id=eq.${encodeURIComponent(id)}&is_published=eq.true&deleted=eq.false&limit=1`);
  const row = rows?.[0];
  if (!row) return null;
  return type === "song" ? toRawSong(row as SongRow) : toRawStudy(row as StudyRow);
}

/**
 * Pull published content from Supabase if configured. Safe to call in the
 * background on every launch; short-circuits instantly when unconfigured or
 * offline, and never throws (logs and returns).
 */
export async function syncSupabaseContent(): Promise<void> {
  if (!SupabaseConfig.enabled) return;
  try {
    await syncCategories();
  } catch (e) {
    console.warn("Supabase categories sync failed:", e);
  }
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
