import { db } from "./database";
import { loadJsonFromContext } from "./contentLoader";
import { hashString, hashToHex, startHash, updateHash } from "./hash";

type RawSong = {
  id?: string;
  hymnNumber?: number;
  title?: string;
  language?: string;
  author?: string;
  stanzas?: string[][] | string[] | string;
  chorus?: string[] | string | null;
};

type NormalizedSong = {
  id: string;
  hymnNumber: number;
  title: string;
  language: string;
  author: string;
  stanzasJson: string;
  chorusJson: string | null;
  contentHash: string;
};

const songsContext = require.context("../../content/songs", true, /\.json$/);
const songFiles = loadJsonFromContext<RawSong>(songsContext);

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
    "SELECT id FROM songs"
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

export async function seedSongs(options: { prune?: boolean } = {}) {
  const now = Date.now();
  const normalized = songFiles
    .map(normalizeSong)
    .filter(Boolean) as NormalizedSong[];

  const byId = new Map<string, NormalizedSong>();
  for (const song of normalized) {
    byId.set(song.id, song);
  }

  const songs = Array.from(byId.values());
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
      await db.runAsync(
        `INSERT INTO songs
        (id, hymnNumber, title, language, author, stanzas, chorus, contentHash, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          hymnNumber = excluded.hymnNumber,
          title = excluded.title,
          language = excluded.language,
          author = excluded.author,
          stanzas = excluded.stanzas,
          chorus = excluded.chorus,
          contentHash = excluded.contentHash,
          updatedAt = excluded.updatedAt,
          createdAt = COALESCE(songs.createdAt, excluded.createdAt)
        WHERE songs.contentHash IS NULL OR songs.contentHash != excluded.contentHash`,
        [
          song.id,
          song.hymnNumber,
          song.title,
          song.language,
          song.author,
          song.stanzasJson,
          song.chorusJson,
          song.contentHash,
          now,
          now,
        ]
      );
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
