import AsyncStorage from "@react-native-async-storage/async-storage";

import { ContentConfig, shardUrl } from "@/src/content/config";
import { fetchJson } from "@/src/content/net";
import type { ProgressFn } from "@/src/content/types";
import { db } from "@/src/db/database";
import { bookOrderFor } from "@/src/db/initBible";

/**
 * Bible content service.
 *
 * A "version" is any translation. Versions come from two interchangeable catalogs:
 *   - bundled  : JSON files in content/bible/versions (offline starter set)
 *   - remote   : entries in a CDN bible index (downloaded on demand)
 * Both install into the same tables through one code path, so the set of supported
 * versions grows by ADDING DATA, never by editing code.
 *
 * Version file shape: { "<Book>": { "<chapter>": { "<verse>": "text" } } }
 */

export type BibleVersionMeta = {
  id: string;
  file?: string;
  name: string;
  abbreviation?: string;
  language?: string;
  direction?: "ltr" | "rtl";
  sortOrder?: number;
  /** path (relative to CDN baseUrl) for remote versions */
  remotePath?: string;
  source: "bundled" | "remote";
};

export type BibleVersionRow = BibleVersionMeta & {
  installed: boolean;
  verseCount: number;
};

export type BibleBook = { book: string; bookOrder: number; chapterCount: number };
export type BibleVerse = { verse: number; text: string };
export type BibleSearchHit = {
  versionId: string;
  book: string;
  bookOrder: number;
  chapter: number;
  verse: number;
  text: string;
};

type RawVersionData = Record<string, Record<string, Record<string, string>>>;

const SELECTED_KEY = "@bible/selectedVersion";

// ----- Bundled catalog (lazy: big JSON is only parsed at install time) -----

const versionsCtx = require.context(
  "../../content/bible/versions",
  false,
  /\.json$/
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bundledIndex = require("../../content/bible/index.json") as {
  versions: Omit<BibleVersionMeta, "source">[];
};

function prettifyId(id: string): string {
  return id
    .replace(/[_-]+/g, " ")
    .replace(/\.json$/i, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function bundledCatalog(): BibleVersionMeta[] {
  const declared = new Map(
    (bundledIndex.versions ?? []).map((v) => [v.file ?? `${v.id}.json`, v])
  );

  // Every file present is offered, even if not listed in index.json (zero-config).
  return versionsCtx.keys().map((key) => {
    const file = key.replace(/^\.\//, "");
    const meta = declared.get(file);
    const id = meta?.id ?? file.replace(/\.json$/i, "");
    return {
      id,
      file,
      name: meta?.name ?? prettifyId(id),
      abbreviation: meta?.abbreviation,
      language: meta?.language ?? "und",
      direction: meta?.direction ?? "ltr",
      sortOrder: meta?.sortOrder ?? 500,
      source: "bundled" as const,
    };
  });
}

function loadBundledVersion(file: string): RawVersionData {
  const mod = versionsCtx(`./${file}`) as { default?: RawVersionData } | RawVersionData;
  return (mod && typeof mod === "object" && "default" in mod
    ? (mod as { default: RawVersionData }).default
    : mod) as RawVersionData;
}

// ----- Remote catalog -----

async function remoteCatalog(): Promise<BibleVersionMeta[]> {
  if (!ContentConfig.remoteEnabled) return [];
  const url = shardUrl("bible/index.json");
  if (!url) return [];
  const data = await fetchJson<{ versions: Omit<BibleVersionMeta, "source">[] }>(url);
  if (!data?.versions?.length) return [];
  return data.versions.map((v) => ({
    ...v,
    language: v.language ?? "und",
    direction: v.direction ?? "ltr",
    sortOrder: v.sortOrder ?? 600,
    source: "remote" as const,
  }));
}

// ----- Catalog registration -----

/**
 * Merge catalogs into bible_versions (preserving install state).
 * Bundled is registered immediately (no network); remote is fetched only when
 * `includeRemote` is set, so this is safe to call on the blocking startup path.
 */
export async function registerBibleVersions(
  options: { includeRemote?: boolean } = {}
): Promise<void> {
  const remote = options.includeRemote ? await remoteCatalog() : [];
  const all = [...bundledCatalog(), ...remote];
  if (!all.length) return;

  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const v of all) {
      await db.runAsync(
        `INSERT INTO bible_versions
           (id, name, abbreviation, language, direction, source, remotePath, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           abbreviation = excluded.abbreviation,
           language = excluded.language,
           direction = excluded.direction,
           source = excluded.source,
           remotePath = excluded.remotePath,
           sortOrder = excluded.sortOrder,
           updatedAt = excluded.updatedAt`,
        [
          v.id,
          v.name,
          v.abbreviation ?? null,
          v.language ?? "und",
          v.direction ?? "ltr",
          v.source,
          v.remotePath ?? null,
          v.sortOrder ?? 500,
          now,
          now,
        ]
      );
    }
  });
}

// ----- Install (seed verses for one version) -----

function flattenVerses(versionId: string, data: RawVersionData) {
  const rows: {
    book: string;
    bookOrder: number;
    chapter: number;
    verse: number;
    text: string;
  }[] = [];
  const books: { book: string; bookOrder: number; chapterCount: number }[] = [];

  Object.keys(data).forEach((book, seenIndex) => {
    const bookOrder = bookOrderFor(book, seenIndex);
    const chapters = data[book] ?? {};
    let maxChapter = 0;
    for (const chapterKey of Object.keys(chapters)) {
      const chapter = Number(chapterKey);
      if (!Number.isFinite(chapter)) continue;
      if (chapter > maxChapter) maxChapter = chapter;
      const verses = chapters[chapterKey] ?? {};
      for (const verseKey of Object.keys(verses)) {
        const verse = Number(verseKey);
        if (!Number.isFinite(verse)) continue;
        rows.push({
          book,
          bookOrder,
          chapter,
          verse,
          text: String(verses[verseKey] ?? ""),
        });
      }
    }
    books.push({ book, bookOrder, chapterCount: maxChapter });
  });

  return { rows, books };
}

async function loadVersionData(meta: BibleVersionRow): Promise<RawVersionData | null> {
  if (meta.source === "bundled" && meta.file) {
    return loadBundledVersion(meta.file);
  }
  if (meta.source === "remote" && meta.remotePath) {
    const url = shardUrl(meta.remotePath);
    if (!url) return null;
    return await fetchJson<RawVersionData>(url, 60000);
  }
  return null;
}

const CHUNK = 120;

/**
 * Download/parse and seed a version's verses into the cache. Idempotent and
 * resumable-safe (uses INSERT OR REPLACE). Reports progress for UI.
 */
export async function installBibleVersion(
  versionId: string,
  onProgress?: ProgressFn
): Promise<boolean> {
  const meta = await getVersion(versionId);
  if (!meta) return false;
  if (meta.installed) return true;

  const data = await loadVersionData(meta);
  if (!data) return false;

  const { rows, books } = flattenVerses(versionId, data);
  if (!rows.length) return false;

  // Clear any partial data from an interrupted install so FTS can't accumulate
  // duplicate rows (the FTS table is append-only during install).
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM bible_verses WHERE versionId = ?`, [versionId]);
    await db.runAsync(`DELETE FROM bible_verses_fts WHERE versionId = ?`, [versionId]);
    await db.runAsync(`DELETE FROM bible_books WHERE versionId = ?`, [versionId]);
  });

  const total = rows.length;
  onProgress?.(0, total, meta.name);

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);

    const versePlaceholders = chunk.map(() => "(?, ?, ?, ?, ?, ?)").join(",");
    const verseParams: (string | number)[] = [];
    for (const r of chunk) {
      verseParams.push(versionId, r.book, r.bookOrder, r.chapter, r.verse, r.text);
    }

    const ftsPlaceholders = chunk.map(() => "(?, ?, ?, ?, ?, ?)").join(",");
    const ftsParams: (string | number)[] = [];
    for (const r of chunk) {
      ftsParams.push(r.text, versionId, r.book, r.bookOrder, r.chapter, r.verse);
    }

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO bible_verses
           (versionId, book, bookOrder, chapter, verse, text)
         VALUES ${versePlaceholders}`,
        verseParams
      );
      await db.runAsync(
        `INSERT INTO bible_verses_fts
           (text, versionId, book, bookOrder, chapter, verse)
         VALUES ${ftsPlaceholders}`,
        ftsParams
      );
    });

    onProgress?.(Math.min(i + CHUNK, total), total, meta.name);
  }

  await db.withTransactionAsync(async () => {
    for (const b of books) {
      await db.runAsync(
        `INSERT INTO bible_books (versionId, book, bookOrder, chapterCount)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(versionId, book) DO UPDATE SET
           bookOrder = excluded.bookOrder,
           chapterCount = excluded.chapterCount`,
        [versionId, b.book, b.bookOrder, b.chapterCount]
      );
    }
    await db.runAsync(
      `UPDATE bible_versions
       SET installed = 1, verseCount = ?, updatedAt = ?
       WHERE id = ?`,
      [total, Date.now(), versionId]
    );
  });

  return true;
}

/** Remove a version's verses to reclaim space (catalog entry is kept). */
export async function uninstallBibleVersion(versionId: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM bible_verses WHERE versionId = ?`, [versionId]);
    await db.runAsync(`DELETE FROM bible_verses_fts WHERE versionId = ?`, [versionId]);
    await db.runAsync(`DELETE FROM bible_books WHERE versionId = ?`, [versionId]);
    await db.runAsync(
      `UPDATE bible_versions SET installed = 0, verseCount = 0, updatedAt = ? WHERE id = ?`,
      [Date.now(), versionId]
    );
  });
}

// ----- Queries -----

function mapVersion(row: any): BibleVersionRow {
  return {
    id: row.id,
    name: row.name,
    abbreviation: row.abbreviation ?? undefined,
    language: row.language ?? undefined,
    direction: (row.direction as "ltr" | "rtl") ?? "ltr",
    file: undefined,
    remotePath: row.remotePath ?? undefined,
    source: (row.source as "bundled" | "remote") ?? "bundled",
    sortOrder: row.sortOrder ?? 500,
    installed: !!row.installed,
    verseCount: row.verseCount ?? 0,
  };
}

export async function listBibleVersions(): Promise<BibleVersionRow[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM bible_versions ORDER BY sortOrder ASC, name ASC`
  );
  // Re-attach bundled file names (not stored in DB) so installs can find the file.
  const fileById = new Map(bundledCatalog().map((v) => [v.id, v.file]));
  return rows.map((r) => {
    const mapped = mapVersion(r);
    mapped.file = fileById.get(mapped.id);
    return mapped;
  });
}

export async function getVersion(versionId: string): Promise<BibleVersionRow | null> {
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM bible_versions WHERE id = ?`,
    [versionId]
  );
  if (!row) return null;
  const mapped = mapVersion(row);
  mapped.file = bundledCatalog().find((v) => v.id === versionId)?.file;
  return mapped;
}

export async function getBooks(versionId: string): Promise<BibleBook[]> {
  return await db.getAllAsync<BibleBook>(
    `SELECT book, bookOrder, chapterCount
       FROM bible_books
      WHERE versionId = ?
      ORDER BY bookOrder ASC`,
    [versionId]
  );
}

export async function getChapter(
  versionId: string,
  book: string,
  chapter: number
): Promise<BibleVerse[]> {
  return await db.getAllAsync<BibleVerse>(
    `SELECT verse, text
       FROM bible_verses
      WHERE versionId = ? AND book = ? AND chapter = ?
      ORDER BY verse ASC`,
    [versionId, book, chapter]
  );
}

export async function searchBible(
  query: string,
  versionId: string,
  limit = 60
): Promise<BibleSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const tokens = trimmed
    .replace(/"/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `${t}*`)
    .join(" ");
  if (!tokens) return [];

  try {
    return await db.getAllAsync<BibleSearchHit>(
      `SELECT versionId, book, bookOrder, chapter, verse, text
         FROM bible_verses_fts
        WHERE bible_verses_fts MATCH ? AND versionId = ?
        LIMIT ?`,
      [tokens, versionId, limit]
    );
  } catch {
    return [];
  }
}

// ----- Selected version (per-user preference) -----

export async function getSelectedVersionId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

export async function setSelectedVersionId(versionId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SELECTED_KEY, versionId);
  } catch {
    // non-fatal
  }
}
