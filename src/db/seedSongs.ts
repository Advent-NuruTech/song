import { db } from "./database";
import { hashString, hashToHex, startHash, updateHash } from "./hash";

type RawSong = {
  id?: string;
  hymnNumber?: number;
  title?: string;
  language?: string;
  category?: string;
  author?: string;
  stanzas?: string[][] | string[] | string;
  chorus?: string[] | string | null;
  serverRevision?: number;
};

type NormalizedSong = {
  id: string;
  hymnNumber: number;
  title: string;
  language: string;
  category: string;
  author: string;
  stanzasJson: string;
  chorusJson: string | null;
  contentHash: string;
};

// One generated module keeps Metro from transforming more than 1,500 tiny JSON
// modules whenever Expo Go requests its first development bundle.
const songFiles = require("../../content/bundles/songs.json") as RawSong[];

export type { RawSong };

export type SongCatalogItem = Pick<RawSong, "id" | "hymnNumber" | "title" | "language" | "category" | "author">;

function normalizeStanzas(input: RawSong["stanzas"]): string[][] {
  if (Array.isArray(input)) {
    if (input.length === 0) return [];
    if (Array.isArray(input[0])) {
      return (input as string[][]).map((stanza) =>
        (Array.isArray(stanza) ? stanza : [stanza]).map((line) =>
          String(line ?? "")
        )
      );
    }
    return [input.map((line) => String(line ?? ""))];
  }

  if (typeof input === "string") {
    return [[input]];
  }

  if (input == null) return [];
  return [[String(input)]];
}

function normalizeChorus(input: RawSong["chorus"]): string[] | null {
  if (input == null) return null;
  const raw = Array.isArray(input) ? input.flat() : [input];
  const lines = raw
    .map((line) => String(line ?? "").trim())
    .filter((line) => line.length > 0);
  return lines.length ? lines : null;
}

function normalizeSong(raw: RawSong): NormalizedSong | null {
  const id = String(raw.id ?? "").trim();
  if (!id) {
    console.warn("Skipping song without id:", raw);
    return null;
  }

  const title = String(raw.title ?? "").trim() || id;
  const language = String(raw.language ?? "").trim() || "unknown";
  const category = String(raw.category ?? "").trim() || "hymn";
  const hymnNumber = Number.isFinite(raw.hymnNumber)
    ? Number(raw.hymnNumber)
    : Number.parseInt(String(raw.hymnNumber ?? "0"), 10) || 0;

  const author = String(raw.author ?? "").trim();
  const stanzas = normalizeStanzas(raw.stanzas);
  const chorus = normalizeChorus(raw.chorus);

  const stanzasJson = JSON.stringify(stanzas);
  const chorusJson = chorus ? JSON.stringify(chorus) : null;

  const contentHash = hashString(
    [
      id,
      hymnNumber.toString(),
      title,
      language,
      category,
      author,
      stanzasJson,
      chorusJson ?? "",
    ].join("|")
  );

  return {
    id,
    hymnNumber,
    title,
    language,
    category,
    author,
    stanzasJson,
    chorusJson,
    contentHash,
  };
}

function getCollectionHash(items: NormalizedSong[]): string {
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  let hash = startHash();
  for (const item of sorted) {
    hash = updateHash(hash, `${item.id}:${item.contentHash};`);
  }
  return hashToHex(hash);
}

async function pruneMissingSongs(keepIds: Set<string>) {
  const existing = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM songs WHERE contentSource = 'bundled'"
  );
  const toDelete = existing
    .map((row) => row.id)
    .filter((id) => !keepIds.has(id));

  if (!toDelete.length) return;

  const chunkSize = 900;
  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const chunk = toDelete.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => "?").join(",");
    await db.runAsync(
      `DELETE FROM songs WHERE id IN (${placeholders})`,
      chunk
    );
  }
}

const SONG_UPSERT_SQL = `INSERT INTO songs
  (id, hymnNumber, title, language, category, author, stanzas, chorus, contentHash, contentSource, serverRevision, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    hymnNumber = excluded.hymnNumber,
    title = excluded.title,
    language = excluded.language,
    category = excluded.category,
    author = excluded.author,
    stanzas = excluded.stanzas,
    chorus = excluded.chorus,
    contentHash = excluded.contentHash,
    contentSource = excluded.contentSource,
    serverRevision = excluded.serverRevision,
    updatedAt = excluded.updatedAt,
    createdAt = COALESCE(songs.createdAt, excluded.createdAt)
  WHERE (excluded.contentSource = 'server' AND excluded.serverRevision >= songs.serverRevision)
     OR (songs.contentSource != 'server' AND (songs.contentHash IS NULL OR songs.contentHash != excluded.contentHash))`;

function songParams(song: NormalizedSong, now: number, source: "bundled" | "server", revision: number) {
  return [
    song.id,
    song.hymnNumber,
    song.title,
    song.language,
    song.category,
    song.author,
    song.stanzasJson,
    song.chorusJson,
    song.contentHash,
    source,
    revision,
    now,
    now,
  ];
}

function dedupeById(songs: NormalizedSong[]): NormalizedSong[] {
  const byId = new Map<string, NormalizedSong>();
  for (const song of songs) byId.set(song.id, song);
  return Array.from(byId.values());
}

/** Metadata-only upsert. Never hydrates or overwrites lyrics. */
export async function upsertSongCatalog(items: SongCatalogItem[], revisions: Record<string, number> = {}) {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const raw of items) {
      const id = String(raw.id ?? "").trim();
      if (!id) continue;
      const incomingRevision = revisions[id] ?? 0;
      const existing = await db.getFirstAsync<{ serverRevision: number; contentSource: string }>("SELECT serverRevision,contentSource FROM songs WHERE id=?",[id]);
      if (existing?.contentSource === "server" && incomingRevision > existing.serverRevision) {
        await db.runAsync("UPDATE songs SET stanzas='[]',chorus=NULL,contentHash=NULL WHERE id=?",[id]);
        await db.runAsync("DELETE FROM content_downloads WHERE contentType='song' AND contentId=?",[id]);
      }
      await db.runAsync(
        `INSERT INTO songs(id,hymnNumber,title,language,category,author,stanzas,chorus,contentHash,contentSource,serverRevision,createdAt,updatedAt)
         VALUES(?,?,?,?,?,?,'[]',NULL,NULL,'server',?,?,?)
         ON CONFLICT(id) DO UPDATE SET hymnNumber=excluded.hymnNumber,title=excluded.title,
           language=excluded.language,category=excluded.category,author=excluded.author,
           contentSource='server',serverRevision=excluded.serverRevision,updatedAt=excluded.updatedAt
         WHERE excluded.serverRevision >= songs.serverRevision`,
        [id, Number(raw.hymnNumber ?? 0), String(raw.title ?? id), String(raw.language ?? "unknown"), String(raw.category ?? "hymn"), String(raw.author ?? ""), incomingRevision, now, now]
      );
    }
  });
}

/**
 * Upsert raw songs into the cache from ANY source (bundled or remote shard).
 * Shared write path so local seeding and CDN hydration stay identical.
 */
export async function upsertSongs(
  raw: RawSong[],
  options: { source?: "bundled" | "server"; revisions?: Record<string, number> } = {}
): Promise<number> {
  const now = Date.now();
  const songs = dedupeById(
    raw.map(normalizeSong).filter(Boolean) as NormalizedSong[]
  );
  if (!songs.length) return 0;

  await db.withTransactionAsync(async () => {
    for (const song of songs) {
      await db.runAsync(SONG_UPSERT_SQL, songParams(song, now, options.source ?? "server", options.revisions?.[song.id] ?? 0));
    }
  });
  return songs.length;
}

export async function seedSongs(options: { prune?: boolean } = {}) {
  const now = Date.now();
  const songs = dedupeById(
    songFiles.map(normalizeSong).filter(Boolean) as NormalizedSong[]
  );
  if (!songs.length) return;

  const collectionHash = getCollectionHash(songs);
  const existingHash = await db.getFirstAsync<{ hash: string }>(
    "SELECT hash FROM content_sync WHERE key = ?",
    ["songs"]
  );

  if (existingHash?.hash === collectionHash) return;

  const keepIds = new Set(songs.map((song) => song.id));

  await db.withTransactionAsync(async () => {
    for (const song of songs) {
      await db.runAsync(SONG_UPSERT_SQL, songParams(song, now, "bundled", 0));
    }

    if (options.prune) {
      await pruneMissingSongs(keepIds);
    }

    await db.runAsync(
      `INSERT INTO content_sync (key, hash, updatedAt)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET hash = excluded.hash, updatedAt = excluded.updatedAt`,
      ["songs", collectionHash, now]
    );
  });
}
