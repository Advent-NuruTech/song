import { Directory, File } from "expo-file-system";
import * as SQLite from "expo-sqlite";

import { ensureAdminModeEnabled } from "@/src/admin/adminAccess";
import { db } from "@/src/db/database";

export const ADMIN_PAGE_SIZE = 50;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type SongAdminRow = {
  id: string;
  hymnNumber: number;
  title: string;
  language: string;
  category: string;
  stanzas: string;
  chorus: string | null;
  author: string | null;
  createdAt: number;
  updatedAt: number;
};

export type StudyAdminRow = {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  content: string;
  author: string | null;
  wordCount: number;
  isFeatured: number;
  createdAt: number;
  updatedAt: number;
};

export type StudyCategoryRow = {
  name: string;
  displayName: string;
  color: string;
  icon: string;
  description: string;
  sortOrder: number;
  createdAt: number;
  usageCount: number;
};

export type ContentCategoryAdminRow = StudyCategoryRow & { contentType: "song" | "study" };

export type SongUpsertInput = {
  id: string;
  hymnNumber: number;
  title: string;
  language: string;
  category: string;
  stanzasText: string;
  chorusText: string;
  author: string;
};

export type StudyUpsertInput = {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  content: string;
  author: string;
  isFeatured: boolean;
};

export type CategoryUpsertInput = {
  name: string;
  displayName: string;
  color: string;
  icon: string;
  description: string;
  sortOrder: number;
};

type CountRow = { total: number };

function escapeLike(value: string) {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}

function normalizeSongStanzasForDb(stanzasText: string): string {
  const stanzaBlocks = stanzasText
    .split(/\n\s*\n/g)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((stanza) => stanza.length > 0);

  if (!stanzaBlocks.length) {
    throw new Error("Stanzas are required.");
  }

  return JSON.stringify(stanzaBlocks);
}

function normalizeLinesForDb(linesText: string): string | null {
  const lines = linesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length ? JSON.stringify(lines) : null;
}

function computeWordCount(content: string): number {
  const clean = content.trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
}

function toDbBoolean(value: boolean): number {
  return value ? 1 : 0;
}

async function getCount(query: string, params: any[] = []): Promise<number> {
  const row = await db.getFirstAsync<CountRow>(query, params);
  return row?.total ?? 0;
}

async function markAdminContentDownloaded(type: "song" | "study", id: string) {
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO content_downloads(contentType,contentId,downloadedAt,lastAccessedAt)
     VALUES(?,?,?,?) ON CONFLICT(contentType,contentId) DO UPDATE SET lastAccessedAt=excluded.lastAccessedAt`,
    [type,id,now,now]
  );
}

function normalizeSongValidation(input: SongUpsertInput): SongUpsertInput {
  const id = input.id.trim();
  const title = input.title.trim();
  const language = input.language.trim();
  const category = input.category.trim();
  const author = input.author.trim();
  const hymnNumber = Number.isFinite(input.hymnNumber)
    ? Math.max(0, Math.trunc(input.hymnNumber))
    : 0;

  if (!id) throw new Error("Song ID is required.");
  if (!title) throw new Error("Song title is required.");
  if (!language) throw new Error("Language is required.");
  if (!category) throw new Error("Song category is required.");

  return {
    ...input,
    id,
    title,
    language,
    category,
    author,
    hymnNumber,
    stanzasText: input.stanzasText,
    chorusText: input.chorusText,
  };
}

function normalizeStudyValidation(input: StudyUpsertInput): StudyUpsertInput {
  const id = input.id.trim();
  const category = input.category.trim();
  const title = input.title.trim();
  const subtitle = input.subtitle.trim();
  const content = input.content.trim();
  const author = input.author.trim();

  if (!id) throw new Error("Study ID is required.");
  if (!category) throw new Error("Study category is required.");
  if (!title) throw new Error("Study title is required.");
  if (!content) throw new Error("Study content is required.");

  return {
    ...input,
    id,
    category,
    title,
    subtitle,
    content,
    author,
  };
}

function normalizeCategoryValidation(
  input: CategoryUpsertInput
): CategoryUpsertInput {
  const name = input.name.trim();
  const displayName = input.displayName.trim() || name;
  const color = input.color.trim() || "#2563EB";
  const icon = input.icon.trim() || "book";
  const description = input.description.trim();
  const sortOrder = Number.isFinite(input.sortOrder)
    ? Math.trunc(input.sortOrder)
    : 0;

  if (!name) throw new Error("Category name is required.");

  return {
    name,
    displayName,
    color,
    icon,
    description,
    sortOrder,
  };
}

export function songStanzasToEditorText(stanzasValue: string | null): string {
  if (!stanzasValue) return "";

  try {
    const parsed = JSON.parse(stanzasValue) as unknown;

    if (Array.isArray(parsed)) {
      const stanzaText = parsed
        .map((stanza) => {
          if (Array.isArray(stanza)) {
            return stanza
              .map((line) => String(line ?? "").trim())
              .filter(Boolean)
              .join("\n");
          }
          return String(stanza ?? "").trim();
        })
        .filter(Boolean);

      return stanzaText.join("\n\n");
    }
  } catch {
    return stanzasValue;
  }

  return stanzasValue;
}

export function songChorusToEditorText(chorusValue: string | null): string {
  if (!chorusValue) return "";

  try {
    const parsed = JSON.parse(chorusValue) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((line) => String(line ?? "").trim()).join("\n").trim();
    }
  } catch {
    return chorusValue;
  }

  return chorusValue;
}

export async function getAdminDashboardSummary() {
  const [songs, studies, categories] = await Promise.all([
    getCount("SELECT COUNT(*) AS total FROM songs"),
    getCount("SELECT COUNT(*) AS total FROM studies"),
    getCount("SELECT COUNT(*) AS total FROM content_categories"),
  ]);

  return { songs, studies, categories };
}

export async function listSongsPaged(options: {
  search?: string;
  language?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResult<SongAdminRow>> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.search?.trim()) {
    const search = `%${escapeLike(options.search.trim().toLowerCase())}%`;
    conditions.push("(lower(title) LIKE ? ESCAPE '\\' OR lower(language) LIKE ? ESCAPE '\\')");
    params.push(search, search);
  }

  if (options.language?.trim()) {
    conditions.push("language = ?");
    params.push(options.language.trim());
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? ADMIN_PAGE_SIZE;
  const offset = options.offset ?? 0;

  const total = await getCount(
    `SELECT COUNT(*) AS total FROM songs ${whereClause}`,
    params
  );

  const items = await db.getAllAsync<SongAdminRow>(
    `
      SELECT id, hymnNumber, title, language, category, stanzas, chorus, author, createdAt, updatedAt
      FROM songs
      ${whereClause}
      ORDER BY hymnNumber ASC, title COLLATE NOCASE ASC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return {
    items,
    total,
    limit,
    offset,
  };
}

export async function getSongLanguages(): Promise<string[]> {
  const rows = await db.getAllAsync<{ language: string }>(
    `
      SELECT DISTINCT language
      FROM songs
      WHERE language IS NOT NULL AND trim(language) != ''
      ORDER BY language COLLATE NOCASE ASC
    `
  );

  return rows.map((row) => row.language);
}

export async function getSongForEdit(id: string): Promise<SongAdminRow | null> {
  return db.getFirstAsync<SongAdminRow>(
    `
      SELECT id, hymnNumber, title, language, category, stanzas, chorus, author, createdAt, updatedAt
      FROM songs
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );
}

export async function upsertSong(
  input: SongUpsertInput,
  existingId?: string
): Promise<void> {
  await ensureAdminModeEnabled();

  const normalized = normalizeSongValidation(input);
  const now = Date.now();
  const stanzasJson = normalizeSongStanzasForDb(normalized.stanzasText);
  const chorusJson = normalizeLinesForDb(normalized.chorusText);
  await ensureContentCategoryExists("song", normalized.category);

  if (existingId) {
    if (normalized.id !== existingId) {
      throw new Error("Song ID cannot be changed during edit.");
    }

    const existing = await db.getFirstAsync<{ createdAt: number }>(
      "SELECT createdAt FROM songs WHERE id = ?",
      [existingId]
    );

    if (!existing) {
      throw new Error("Song not found.");
    }

    await db.runAsync(
      `
        UPDATE songs
        SET hymnNumber = ?, title = ?, language = ?, category = ?, stanzas = ?, chorus = ?, author = ?, updatedAt = ?
        WHERE id = ?
      `,
      [
        normalized.hymnNumber,
        normalized.title,
        normalized.language,
        normalized.category,
        stanzasJson,
        chorusJson,
        normalized.author || null,
        now,
        existingId,
      ]
    );

    await markAdminContentDownloaded("song", existingId);

    return;
  }

  await db.runAsync(
    `
      INSERT INTO songs (
        id, hymnNumber, title, language, category, stanzas, chorus, author, contentHash, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `,
    [
      normalized.id,
      normalized.hymnNumber,
      normalized.title,
      normalized.language,
      normalized.category,
      stanzasJson,
      chorusJson,
      normalized.author || null,
      now,
      now,
    ]
  );
  await markAdminContentDownloaded("song", normalized.id);
}

export async function deleteSong(id: string): Promise<void> {
  await ensureAdminModeEnabled();
  await db.withTransactionAsync(async () => { await db.runAsync("DELETE FROM content_downloads WHERE contentType='song' AND contentId=?",[id]); await db.runAsync("DELETE FROM songs WHERE id = ?", [id]); });
}

export async function listStudiesPaged(options: {
  search?: string;
  category?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResult<StudyAdminRow>> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.search?.trim()) {
    const search = `%${escapeLike(options.search.trim().toLowerCase())}%`;
    conditions.push("(lower(title) LIKE ? ESCAPE '\\' OR lower(content) LIKE ? ESCAPE '\\')");
    params.push(search, search);
  }

  if (options.category?.trim()) {
    conditions.push("category = ?");
    params.push(options.category.trim());
  }

  if (typeof options.featured === "boolean") {
    conditions.push("isFeatured = ?");
    params.push(options.featured ? 1 : 0);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? ADMIN_PAGE_SIZE;
  const offset = options.offset ?? 0;

  const total = await getCount(
    `SELECT COUNT(*) AS total FROM studies ${whereClause}`,
    params
  );

  const items = await db.getAllAsync<StudyAdminRow>(
    `
      SELECT id, category, title, subtitle, content, author, wordCount, isFeatured, createdAt, updatedAt
      FROM studies
      ${whereClause}
      ORDER BY updatedAt DESC, title COLLATE NOCASE ASC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return {
    items,
    total,
    limit,
    offset,
  };
}

export async function getStudiesCategories(): Promise<string[]> {
  const rows = await db.getAllAsync<{ category: string }>(
    `
      SELECT DISTINCT category
      FROM studies
      WHERE category IS NOT NULL AND trim(category) != ''
      ORDER BY category COLLATE NOCASE ASC
    `
  );

  return rows.map((row) => row.category);
}

export async function getCategoryNames(): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    `
      SELECT name
      FROM content_categories
      WHERE contentType='study'
      ORDER BY sortOrder ASC, displayName COLLATE NOCASE ASC
    `
  );

  return rows.map((row) => row.name);
}

async function ensureCategoryExists(categoryName: string) {
  const now = Date.now();
  await db.runAsync(
    `
      INSERT OR IGNORE INTO study_categories
      (name, displayName, color, icon, description, sortOrder, createdAt)
      VALUES (?, ?, '#2563EB', 'book', '', 0, ?)
    `,
    [categoryName, categoryName, now]
  );
  await ensureContentCategoryExists("study", categoryName);
}

async function ensureContentCategoryExists(type: "song" | "study", name: string) {
  await db.runAsync(
    `INSERT OR IGNORE INTO content_categories
     (contentType,name,displayName,color,icon,description,sortOrder,serverRevision,updatedAt)
     VALUES(?,?,?,'#2563EB',?,'',100,0,?)`,
    [type, name, name, type === "song" ? "musical-notes-outline" : "book-outline", Date.now()]
  );
}

export async function listContentCategories(type: "song" | "study"): Promise<ContentCategoryAdminRow[]> {
  const table = type === "song" ? "songs" : "studies";
  return db.getAllAsync<ContentCategoryAdminRow>(
    `SELECT c.contentType,c.name,c.displayName,c.color,c.icon,c.description,c.sortOrder,
            c.updatedAt AS createdAt,COUNT(x.id) AS usageCount
     FROM content_categories c LEFT JOIN ${table} x ON x.category=c.name
     WHERE c.contentType=? GROUP BY c.contentType,c.name
     ORDER BY c.sortOrder,c.displayName COLLATE NOCASE`,
    [type]
  );
}

export async function upsertContentCategory(type: "song" | "study", input: CategoryUpsertInput, previousName?: string) {
  await ensureAdminModeEnabled();
  const item = normalizeCategoryValidation(input);
  if (previousName && previousName !== item.name) throw new Error("Category keys are stable. Create a new category and reassign content instead.");
  await db.runAsync(
    `INSERT INTO content_categories(contentType,name,displayName,color,icon,description,sortOrder,serverRevision,updatedAt)
     VALUES(?,?,?,?,?,?,?,0,?) ON CONFLICT(contentType,name) DO UPDATE SET
     displayName=excluded.displayName,color=excluded.color,icon=excluded.icon,
     description=excluded.description,sortOrder=excluded.sortOrder,updatedAt=excluded.updatedAt`,
    [type,item.name,item.displayName,item.color,item.icon,item.description,item.sortOrder,Date.now()]
  );
}

export async function deleteContentCategory(type: "song" | "study", name: string) {
  await ensureAdminModeEnabled();
  const table = type === "song" ? "songs" : "studies";
  const usage = await getCount(`SELECT COUNT(*) AS total FROM ${table} WHERE category=?`,[name]);
  if (usage) throw new Error(`Cannot delete category because it is used by ${usage} ${type}s.`);
  await db.runAsync("DELETE FROM content_categories WHERE contentType=? AND name=?",[type,name]);
}

export async function getStudyForEdit(id: string): Promise<StudyAdminRow | null> {
  return db.getFirstAsync<StudyAdminRow>(
    `
      SELECT id, category, title, subtitle, content, author, wordCount, isFeatured, createdAt, updatedAt
      FROM studies
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );
}

export async function upsertStudy(
  input: StudyUpsertInput,
  existingId?: string
): Promise<void> {
  await ensureAdminModeEnabled();

  const normalized = normalizeStudyValidation(input);
  const now = Date.now();
  const wordCount = computeWordCount(normalized.content);
  const isFeatured = toDbBoolean(normalized.isFeatured);

  await ensureCategoryExists(normalized.category);

  if (existingId) {
    if (normalized.id !== existingId) {
      throw new Error("Study ID cannot be changed during edit.");
    }

    const existing = await db.getFirstAsync<{ createdAt: number }>(
      "SELECT createdAt FROM studies WHERE id = ?",
      [existingId]
    );

    if (!existing) {
      throw new Error("Study not found.");
    }

    await db.runAsync(
      `
        UPDATE studies
        SET category = ?, title = ?, subtitle = ?, content = ?, author = ?, wordCount = ?, isFeatured = ?, updatedAt = ?, contentHash = NULL
        WHERE id = ?
      `,
      [
        normalized.category,
        normalized.title,
        normalized.subtitle,
        normalized.content,
        normalized.author || null,
        wordCount,
        isFeatured,
        now,
        existingId,
      ]
    );

    await markAdminContentDownloaded("study", existingId);

    return;
  }

  await db.runAsync(
    `
      INSERT INTO studies (
        id, category, title, subtitle, content, author, wordCount, isFeatured, contentHash, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `,
    [
      normalized.id,
      normalized.category,
      normalized.title,
      normalized.subtitle,
      normalized.content,
      normalized.author || null,
      wordCount,
      isFeatured,
      now,
      now,
    ]
  );
  await markAdminContentDownloaded("study", normalized.id);
}

export async function deleteStudy(id: string): Promise<void> {
  await ensureAdminModeEnabled();
  await db.withTransactionAsync(async () => { await db.runAsync("DELETE FROM content_downloads WHERE contentType='study' AND contentId=?",[id]); await db.runAsync("DELETE FROM studies WHERE id = ?", [id]); });
}

export async function listStudyCategories(): Promise<StudyCategoryRow[]> {
  const defined = await db.getAllAsync<
    Omit<StudyCategoryRow, "usageCount"> & { usageCount?: number }
  >(
    `
      SELECT name, displayName, color, icon, description, sortOrder, createdAt
      FROM study_categories
      ORDER BY sortOrder ASC, displayName COLLATE NOCASE ASC, name COLLATE NOCASE ASC
    `
  );

  const usageRows = await db.getAllAsync<{ category: string; usageCount: number }>(
    `
      SELECT category, COUNT(*) AS usageCount
      FROM studies
      WHERE category IS NOT NULL AND trim(category) != ''
      GROUP BY category
    `
  );

  const usageMap = new Map<string, number>();
  for (const row of usageRows) {
    usageMap.set(row.category, row.usageCount);
  }

  const categories = defined.map((row) => ({
    name: row.name,
    displayName: row.displayName || row.name,
    color: row.color || "#2563EB",
    icon: row.icon || "book",
    description: row.description || "",
    sortOrder: row.sortOrder ?? 0,
    createdAt: row.createdAt ?? Date.now(),
    usageCount: usageMap.get(row.name) ?? 0,
  }));

  const known = new Set(categories.map((item) => item.name));
  for (const usage of usageRows) {
    if (!known.has(usage.category)) {
      categories.push({
        name: usage.category,
        displayName: usage.category,
        color: "#2563EB",
        icon: "book",
        description: "",
        sortOrder: 9999,
        createdAt: Date.now(),
        usageCount: usage.usageCount,
      });
    }
  }

  categories.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.displayName.localeCompare(b.displayName);
  });

  return categories;
}

export async function upsertStudyCategory(
  input: CategoryUpsertInput,
  previousName?: string
): Promise<void> {
  await ensureAdminModeEnabled();

  const normalized = normalizeCategoryValidation(input);
  const now = Date.now();
  const fromName = previousName?.trim();

  if (fromName && fromName !== normalized.name) {
    const existingTarget = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM study_categories WHERE name = ?",
      [normalized.name]
    );

    if (existingTarget) {
      throw new Error("Cannot rename category. Target name already exists.");
    }

    const previous = await db.getFirstAsync<{ createdAt: number }>(
      "SELECT createdAt FROM study_categories WHERE name = ?",
      [fromName]
    );

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `
          INSERT INTO study_categories
          (name, displayName, color, icon, description, sortOrder, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          normalized.name,
          normalized.displayName,
          normalized.color,
          normalized.icon,
          normalized.description,
          normalized.sortOrder,
          previous?.createdAt ?? now,
        ]
      );

      await db.runAsync(
        "UPDATE studies SET category = ?, updatedAt = ? WHERE category = ?",
        [normalized.name, now, fromName]
      );

      await db.runAsync("DELETE FROM study_categories WHERE name = ?", [fromName]);
    });

    return;
  }

  await db.runAsync(
    `
      INSERT INTO study_categories
      (name, displayName, color, icon, description, sortOrder, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        displayName = excluded.displayName,
        color = excluded.color,
        icon = excluded.icon,
        description = excluded.description,
        sortOrder = excluded.sortOrder
    `,
    [
      normalized.name,
      normalized.displayName,
      normalized.color,
      normalized.icon,
      normalized.description,
      normalized.sortOrder,
      now,
    ]
  );
}

export async function deleteStudyCategory(name: string): Promise<void> {
  await ensureAdminModeEnabled();
  const categoryName = name.trim();
  if (!categoryName) throw new Error("Category name is required.");

  const usage = await getCount(
    "SELECT COUNT(*) AS total FROM studies WHERE category = ?",
    [categoryName]
  );

  if (usage > 0) {
    throw new Error(
      `Cannot delete category "${categoryName}" because it is used by ${usage} studies.`
    );
  }

  await db.runAsync("DELETE FROM study_categories WHERE name = ?", [categoryName]);
}

function buildBackupFileName() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `song_app_backup_${timestamp}.db`;
}

export async function exportDatabaseBackup(): Promise<{ uri: string; fileName: string }> {
  await ensureAdminModeEnabled();

  const directory = await Directory.pickDirectoryAsync();
  const fileName = buildBackupFileName();
  const file = new File(directory.uri, fileName);

  const bytes = await db.serializeAsync();
  file.create({ overwrite: true });
  file.write(bytes);

  return {
    uri: file.uri,
    fileName,
  };
}

export async function restoreDatabaseBackup(): Promise<{ uri: string }> {
  await ensureAdminModeEnabled();

  const selection = await File.pickFileAsync(undefined, "application/octet-stream");
  const pickedFile = Array.isArray(selection) ? selection[0] : selection;

  if (!pickedFile) {
    throw new Error("No file selected for restore.");
  }

  const bytes = await pickedFile.bytes();
  if (!bytes.length) {
    throw new Error("The selected backup file is empty.");
  }

  const sourceDb = SQLite.deserializeDatabaseSync(bytes, { useNewConnection: true });

  try {
    await SQLite.backupDatabaseAsync({
      sourceDatabase: sourceDb,
      destDatabase: db,
    });
    await db.execAsync("PRAGMA wal_checkpoint(FULL);");
  } finally {
    await sourceDb.closeAsync();
  }

  return { uri: pickedFile.uri };
}
