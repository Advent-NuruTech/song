import { db } from "./database";
import { loadJsonFromContext } from "./contentLoader";
import { hashString, hashToHex, startHash, updateHash } from "./hash";

type RawStudy = {
  id?: string;
  category?: string;
  title?: string;
  subtitle?: string;
  content?: string | string[];
  author?: string;
  isFeatured?: boolean;
};

type NormalizedStudy = {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  content: string;
  author: string;
  wordCount: number;
  isFeatured: number;
  contentHash: string;
};

const studiesContext = require.context("../../content/studies", true, /\.json$/);
const studies = loadJsonFromContext<RawStudy>(studiesContext);

export type { RawStudy };

function normalizeContent(input: RawStudy["content"]): string {
  if (Array.isArray(input)) {
    return input.map((line) => String(line ?? "").trim()).join("\n");
  }
  if (typeof input === "string") return input.trim();
  if (input == null) return "";
  return String(input).trim();
}

function normalizeStudy(raw: RawStudy): NormalizedStudy | null {
  const id = String(raw.id ?? "").trim();
  if (!id) {
    console.warn("Skipping study without id:", raw);
    return null;
  }

  const category = String(raw.category ?? "").trim();
  const title = String(raw.title ?? "").trim() || id;
  const subtitle = String(raw.subtitle ?? "").trim();
  const content = normalizeContent(raw.content);
  const author = String(raw.author ?? "").trim();
  const wordCount = content ? content.split(/\s+/).length : 0;
  const isFeatured = raw.isFeatured ? 1 : 0;

  const contentHash = hashString(
    [
      id,
      category,
      title,
      subtitle,
      content,
      author,
      isFeatured.toString(),
    ].join("|")
  );

  return {
    id,
    category,
    title,
    subtitle,
    content,
    author,
    wordCount,
    isFeatured,
    contentHash,
  };
}

function getCollectionHash(items: NormalizedStudy[]): string {
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  let hash = startHash();
  for (const item of sorted) {
    hash = updateHash(hash, `${item.id}:${item.contentHash};`);
  }
  return hashToHex(hash);
}

async function pruneMissingStudies(keepIds: Set<string>) {
  const existing = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM studies WHERE contentSource = 'bundled'"
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
      `DELETE FROM studies WHERE id IN (${placeholders})`,
      chunk
    );
  }
}

const STUDY_UPSERT_SQL = `INSERT INTO studies
  (id, category, title, subtitle, content, author, wordCount, isFeatured, contentHash, contentSource, serverRevision, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    category = excluded.category,
    title = excluded.title,
    subtitle = excluded.subtitle,
    content = excluded.content,
    author = excluded.author,
    wordCount = excluded.wordCount,
    isFeatured = excluded.isFeatured,
    contentHash = excluded.contentHash,
    contentSource = excluded.contentSource,
    serverRevision = excluded.serverRevision,
    updatedAt = excluded.updatedAt,
    createdAt = COALESCE(studies.createdAt, excluded.createdAt)
  WHERE (excluded.contentSource = 'server' AND excluded.serverRevision >= studies.serverRevision)
     OR (studies.contentSource != 'server' AND (studies.contentHash IS NULL OR studies.contentHash != excluded.contentHash))`;

function studyParams(study: NormalizedStudy, now: number, source: "bundled" | "server", revision: number) {
  return [
    study.id,
    study.category,
    study.title,
    study.subtitle,
    study.content,
    study.author,
    study.wordCount,
    study.isFeatured,
    study.contentHash,
    source,
    revision,
    now,
    now,
  ];
}

function dedupeStudiesById(items: NormalizedStudy[]): NormalizedStudy[] {
  const byId = new Map<string, NormalizedStudy>();
  for (const study of items) byId.set(study.id, study);
  return Array.from(byId.values());
}

/** Upsert raw studies from ANY source (bundled or remote shard). */
export async function upsertStudies(
  raw: RawStudy[],
  options: { source?: "bundled" | "server"; revisions?: Record<string, number> } = {}
): Promise<number> {
  const now = Date.now();
  const items = dedupeStudiesById(
    raw.map(normalizeStudy).filter(Boolean) as NormalizedStudy[]
  );
  if (!items.length) return 0;

  await db.withTransactionAsync(async () => {
    for (const study of items) {
      await db.runAsync(STUDY_UPSERT_SQL, studyParams(study, now, options.source ?? "server", options.revisions?.[study.id] ?? 0));
    }
  });
  return items.length;
}

export async function seedStudies(options: { prune?: boolean } = {}) {
  const now = Date.now();
  const items = dedupeStudiesById(
    studies.map(normalizeStudy).filter(Boolean) as NormalizedStudy[]
  );
  if (!items.length) return;

  const collectionHash = getCollectionHash(items);
  const existingHash = await db.getFirstAsync<{ hash: string }>(
    "SELECT hash FROM content_sync WHERE key = ?",
    ["studies"]
  );

  if (existingHash?.hash === collectionHash) return;

  const keepIds = new Set(items.map((study) => study.id));

  await db.withTransactionAsync(async () => {
    for (const study of items) {
      await db.runAsync(STUDY_UPSERT_SQL, studyParams(study, now, "bundled", 0));
    }

    if (options.prune) {
      await pruneMissingStudies(keepIds);
    }

    await db.runAsync(
      `INSERT INTO content_sync (key, hash, updatedAt)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET hash = excluded.hash, updatedAt = excluded.updatedAt`,
      ["studies", collectionHash, now]
    );
  });
}
