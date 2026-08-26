import { syncSupabaseContent } from "@/src/content/supabase";
import { syncRemoteContent } from "@/src/content/sync";
import { registerBibleVersions } from "@/src/services/bibleService";
import { db } from "./database";
import { initBibleSchema } from "./initBible";
import { seedSongs } from "./seedSongs";
import { seedStudies } from "./seedStudies";

/**
 * Fast schema-only init. Cheap and deterministic — safe to BLOCK app startup on.
 * Heavy work (seeding the corpus, remote sync, Bible verse installs) is deferred.
 */
export async function initSchema() {
  await applyPragmas();
  await createCoreTables();
  await createPersonalTables();
  await ensureSongsSchema();
  await ensureStudiesSchema();
  await ensureSongsFts();
  await ensureStudiesFts();
  await createIndexes();
  await initBibleSchema();
  // Bundled Bible catalog only — never block startup on the network.
  await registerBibleVersions();
}

async function createPersonalTables() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_notes (
      id TEXT PRIMARY KEY,
      ownerId TEXT,
      title TEXT NOT NULL DEFAULT 'Untitled note',
      contentHtml TEXT NOT NULL DEFAULT '<p></p>',
      plainText TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      syncState TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS song_playlists (
      id TEXT PRIMARY KEY,
      ownerId TEXT,
      title TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      syncState TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS song_playlist_items (
      playlistId TEXT NOT NULL,
      songId TEXT NOT NULL,
      position INTEGER NOT NULL,
      addedAt INTEGER NOT NULL,
      PRIMARY KEY (playlistId, songId),
      FOREIGN KEY (playlistId) REFERENCES song_playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_notes_updated ON user_notes(updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_song_playlists_updated ON song_playlists(updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_playlist_items_order ON song_playlist_items(playlistId, position);

    CREATE TABLE IF NOT EXISTS study_working_copies (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      sourceStudyId TEXT,
      ownerId TEXT,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Bible Study',
      contentHtml TEXT NOT NULL,
      plainText TEXT NOT NULL DEFAULT '',
      authorName TEXT NOT NULL DEFAULT '',
      baseRevisionId TEXT,
      baseRevisionNumber INTEGER NOT NULL DEFAULT 0,
      isOwner INTEGER NOT NULL DEFAULT 0,
      dirty INTEGER NOT NULL DEFAULT 0,
      submissionStatus TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      syncState TEXT NOT NULL DEFAULT 'local'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_study_working_copy_source_owner
      ON study_working_copies(sourceStudyId, COALESCE(ownerId, 'local'));
    CREATE INDEX IF NOT EXISTS idx_study_working_copies_updated
      ON study_working_copies(updatedAt DESC);
  `);
}

/**
 * Populate/refresh content. Runs in the BACKGROUND on warm starts so the UI shows
 * instantly; awaited only on a fresh install so first launch has data to render.
 */
export async function seedContent() {
  await seedSongs({ prune: true });
  await seedStudies({ prune: true });
  await syncLanguagesFromSongs();
  await syncCategoriesFromContent();
  try {
    // Refresh the Bible catalog with any remote (CDN) versions, then sync content.
    await registerBibleVersions({ includeRemote: true });
    await syncRemoteContent();
    // Pull published songs/studies authored in the online admin dashboard.
    await syncSupabaseContent();
  } catch (e) {
    console.warn("Remote content sync failed:", e);
  }
}

/** True before any songs exist (very first launch). */
export async function isFreshInstall(): Promise<boolean> {
  const row = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) as c FROM songs"
  );
  return (row?.c ?? 0) === 0;
}

async function applyPragmas() {
  // Enable performance features
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;
    PRAGMA temp_store = MEMORY;
    PRAGMA cache_size = -20000;
    PRAGMA busy_timeout = 5000;
  `);
}

async function createCoreTables() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      hymnNumber INTEGER,
      title TEXT,
      language TEXT,
      category TEXT NOT NULL DEFAULT 'hymn',
      author TEXT,
      stanzas TEXT,
      chorus TEXT,
      contentHash TEXT,
      contentSource TEXT NOT NULL DEFAULT 'bundled',
      serverRevision INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS studies (
      id TEXT PRIMARY KEY,
      category TEXT,
      title TEXT,
      subtitle TEXT,
      content TEXT,
      author TEXT,
      wordCount INTEGER DEFAULT 0,
      isFeatured BOOLEAN DEFAULT 0,
      contentHash TEXT,
      contentSource TEXT NOT NULL DEFAULT 'bundled',
      serverRevision INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS study_categories (
      name TEXT PRIMARY KEY,
      displayName TEXT,
      color TEXT,
      icon TEXT,
      description TEXT,
      sortOrder INTEGER DEFAULT 0,
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS content_categories (
      contentType TEXT NOT NULL CHECK (contentType IN ('song', 'study')),
      name TEXT NOT NULL,
      displayName TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#0B4AA6',
      icon TEXT NOT NULL DEFAULT 'folder-outline',
      description TEXT NOT NULL DEFAULT '',
      sortOrder INTEGER NOT NULL DEFAULT 100,
      serverRevision INTEGER NOT NULL DEFAULT 0,
      updatedAt INTEGER NOT NULL,
      PRIMARY KEY (contentType, name)
    );

    CREATE TABLE IF NOT EXISTS languages (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS content_sync (
      key TEXT PRIMARY KEY,
      hash TEXT,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS content_downloads (
      contentType TEXT NOT NULL CHECK (contentType IN ('song', 'study')),
      contentId TEXT NOT NULL,
      downloadedAt INTEGER NOT NULL,
      lastAccessedAt INTEGER NOT NULL,
      PRIMARY KEY (contentType, contentId)
    );

    CREATE INDEX IF NOT EXISTS idx_content_downloads_lru
      ON content_downloads(lastAccessedAt ASC);
  `);
}

async function createIndexes() {
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_studies_category ON studies(category);
    CREATE INDEX IF NOT EXISTS idx_studies_created ON studies(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_studies_featured ON studies(isFeatured) WHERE isFeatured = 1;

    CREATE INDEX IF NOT EXISTS idx_songs_language ON songs(language);
    CREATE INDEX IF NOT EXISTS idx_songs_hymnNumber ON songs(hymnNumber);
    CREATE INDEX IF NOT EXISTS idx_songs_language_hymn ON songs(language, hymnNumber);
    CREATE INDEX IF NOT EXISTS idx_songs_category ON songs(category);
    CREATE INDEX IF NOT EXISTS idx_content_categories_order ON content_categories(contentType, sortOrder, displayName);
    CREATE INDEX IF NOT EXISTS idx_songs_title_nocase ON songs(title COLLATE NOCASE);
  `);
}

async function ensureSongsSchema() {
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(songs)"
  );

  if (!columns.length) return;

  const columnNames = new Set(columns.map((c) => c.name));

  if (!columnNames.has("author")) {
    await db.execAsync(`ALTER TABLE songs ADD COLUMN author TEXT`);
  }
  if (!columnNames.has("category")) {
    await db.execAsync(`ALTER TABLE songs ADD COLUMN category TEXT NOT NULL DEFAULT 'hymn'`);
  }

  if (!columnNames.has("contentHash")) {
    await db.execAsync(`ALTER TABLE songs ADD COLUMN contentHash TEXT`);
  }
  if (!columnNames.has("contentSource")) {
    await db.execAsync(`ALTER TABLE songs ADD COLUMN contentSource TEXT NOT NULL DEFAULT 'bundled'`);
  }
  if (!columnNames.has("serverRevision")) {
    await db.execAsync(`ALTER TABLE songs ADD COLUMN serverRevision INTEGER NOT NULL DEFAULT 0`);
  }
}

async function ensureStudiesSchema() {
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(studies)"
  );

  if (!columns.length) return;

  const columnNames = new Set(columns.map((c) => c.name));
  const hasConclusion = columnNames.has("conclusion");
  const hasAuthor = columnNames.has("author");
  const hasWordCount = columnNames.has("wordCount");
  const hasIsFeatured = columnNames.has("isFeatured");
  const hasContentHash = columnNames.has("contentHash");

  if (hasConclusion) {
    await rebuildStudiesTable({
      hasAuthor,
      hasWordCount,
      hasIsFeatured,
      hasContentHash,
    });
    return;
  }

  if (!hasAuthor) {
    await db.execAsync(`ALTER TABLE studies ADD COLUMN author TEXT`);
  }

  if (!hasWordCount) {
    await db.execAsync(
      `ALTER TABLE studies ADD COLUMN wordCount INTEGER DEFAULT 0`
    );
  }

  if (!hasIsFeatured) {
    await db.execAsync(
      `ALTER TABLE studies ADD COLUMN isFeatured BOOLEAN DEFAULT 0`
    );
  }
  if (!columnNames.has("contentSource")) {
    await db.execAsync(`ALTER TABLE studies ADD COLUMN contentSource TEXT NOT NULL DEFAULT 'bundled'`);
  }
  if (!columnNames.has("serverRevision")) {
    await db.execAsync(`ALTER TABLE studies ADD COLUMN serverRevision INTEGER NOT NULL DEFAULT 0`);
  }

  if (!hasContentHash) {
    await db.execAsync(`ALTER TABLE studies ADD COLUMN contentHash TEXT`);
  }
}

async function rebuildStudiesTable(options: {
  hasAuthor: boolean;
  hasWordCount: boolean;
  hasIsFeatured: boolean;
  hasContentHash: boolean;
}) {
  const authorExpr = options.hasAuthor ? "author" : "''";
  const wordCountExpr = options.hasWordCount
    ? "wordCount"
    : "LENGTH(COALESCE(content, '')) + LENGTH(COALESCE(conclusion, ''))";
  const isFeaturedExpr = options.hasIsFeatured ? "isFeatured" : "0";
  const contentHashExpr = options.hasContentHash ? "contentHash" : "NULL";

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS studies_new (
      id TEXT PRIMARY KEY,
      category TEXT,
      title TEXT,
      subtitle TEXT,
      content TEXT,
      author TEXT,
      wordCount INTEGER DEFAULT 0,
      isFeatured BOOLEAN DEFAULT 0,
      contentHash TEXT,
      contentSource TEXT NOT NULL DEFAULT 'bundled',
      serverRevision INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER,
      updatedAt INTEGER
    )
  `);

  await db.execAsync(`
    INSERT OR REPLACE INTO studies_new
    (id, category, title, subtitle, content, author, wordCount, isFeatured, contentHash, createdAt, updatedAt)
    SELECT
      id,
      category,
      title,
      subtitle,
      COALESCE(content, '') ||
        CASE WHEN conclusion IS NOT NULL AND conclusion != ''
             THEN '\n\n## Conclusion\n' || conclusion
             ELSE ''
        END as content,
      ${authorExpr} as author,
      ${wordCountExpr} as wordCount,
      ${isFeaturedExpr} as isFeatured,
      ${contentHashExpr} as contentHash,
      createdAt,
      updatedAt
    FROM studies
  `);

  await db.execAsync(`DROP TABLE studies`);
  await db.execAsync(`ALTER TABLE studies_new RENAME TO studies`);
}

async function ensureStudiesFts() {
  await db.execAsync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS studies_fts USING fts5(
      title,
      subtitle,
      content,
      category,
      content=studies,
      content_rowid=rowid
    );
  `);

  await createStudiesFtsTriggers();

  try {
    await db.execAsync(`INSERT INTO studies_fts(studies_fts) VALUES('rebuild')`);
  } catch (error) {
    console.warn("Failed to rebuild studies FTS table:", error);
  }
}

async function createStudiesFtsTriggers() {
  // Check if triggers already exist
  const triggers = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'studies_%'"
  );
  
  const existingTriggers = new Set(triggers.map(t => t.name));
  
  // Create insert trigger
  if (!existingTriggers.has('studies_ai')) {
    await db.execAsync(`
      CREATE TRIGGER studies_ai AFTER INSERT ON studies BEGIN
        INSERT INTO studies_fts(rowid, title, subtitle, content, category)
        VALUES (new.rowid, new.title, new.subtitle, new.content, new.category);
      END;
    `);
  }
  
  // Create delete trigger
  if (!existingTriggers.has('studies_ad')) {
    await db.execAsync(`
      CREATE TRIGGER studies_ad AFTER DELETE ON studies BEGIN
        INSERT INTO studies_fts(studies_fts, rowid, title, subtitle, content, category)
        VALUES('delete', old.rowid, old.title, old.subtitle, old.content, old.category);
      END;
    `);
  }
  
  // Create update trigger
  if (!existingTriggers.has('studies_au')) {
    await db.execAsync(`
      CREATE TRIGGER studies_au AFTER UPDATE ON studies BEGIN
        INSERT INTO studies_fts(studies_fts, rowid, title, subtitle, content, category)
        VALUES('delete', old.rowid, old.title, old.subtitle, old.content, old.category);
        INSERT INTO studies_fts(rowid, title, subtitle, content, category)
        VALUES (new.rowid, new.title, new.subtitle, new.content, new.category);
      END;
    `);
  }
}

async function ensureSongsFts() {
  await db.execAsync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
      title,
      stanzas,
      chorus,
      language,
      content=songs,
      content_rowid=rowid
    );
  `);

  await createSongsFtsTriggers();

  try {
    await db.execAsync(`INSERT INTO songs_fts(songs_fts) VALUES('rebuild')`);
  } catch (error) {
    console.warn("Failed to rebuild songs FTS table:", error);
  }
}

async function createSongsFtsTriggers() {
  const triggers = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'songs_%'"
  );

  const existingTriggers = new Set(triggers.map((t) => t.name));

  if (!existingTriggers.has("songs_ai")) {
    await db.execAsync(`
      CREATE TRIGGER songs_ai AFTER INSERT ON songs BEGIN
        INSERT INTO songs_fts(rowid, title, stanzas, chorus, language)
        VALUES (new.rowid, new.title, new.stanzas, new.chorus, new.language);
      END;
    `);
  }

  if (!existingTriggers.has("songs_ad")) {
    await db.execAsync(`
      CREATE TRIGGER songs_ad AFTER DELETE ON songs BEGIN
        INSERT INTO songs_fts(songs_fts, rowid, title, stanzas, chorus, language)
        VALUES('delete', old.rowid, old.title, old.stanzas, old.chorus, old.language);
      END;
    `);
  }

  if (!existingTriggers.has("songs_au")) {
    await db.execAsync(`
      CREATE TRIGGER songs_au AFTER UPDATE ON songs BEGIN
        INSERT INTO songs_fts(songs_fts, rowid, title, stanzas, chorus, language)
        VALUES('delete', old.rowid, old.title, old.stanzas, old.chorus, old.language);
        INSERT INTO songs_fts(rowid, title, stanzas, chorus, language)
        VALUES (new.rowid, new.title, new.stanzas, new.chorus, new.language);
      END;
    `);
  }
}

async function syncLanguagesFromSongs() {
  const languages = await db.getAllAsync<{ language: string }>(
    "SELECT DISTINCT language FROM songs WHERE language IS NOT NULL AND language != ''"
  );

  if (!languages.length) return;

  await db.withTransactionAsync(async () => {
    for (const row of languages) {
      await db.runAsync(
        "INSERT OR IGNORE INTO languages (id, code, name) VALUES (?, ?, ?)",
        [row.language, row.language, null]
      );
    }
  });
}

async function syncCategoriesFromContent() {
  const now = Date.now();
  await db.execAsync(`
    INSERT OR IGNORE INTO content_categories(contentType,name,displayName,color,icon,description,sortOrder,serverRevision,updatedAt)
      SELECT 'song', COALESCE(NULLIF(trim(category),''),'hymn'),
             CASE WHEN COALESCE(NULLIF(trim(category),''),'hymn')='hymn' THEN 'Hymns' ELSE COALESCE(NULLIF(trim(category),''),'hymn') END,
             '#0B4AA6','musical-notes-outline','',100,0,${now} FROM songs GROUP BY COALESCE(NULLIF(trim(category),''),'hymn');
    INSERT OR IGNORE INTO content_categories(contentType,name,displayName,color,icon,description,sortOrder,serverRevision,updatedAt)
      SELECT 'study', trim(category), trim(category),'#2563EB','book-outline','',100,0,${now}
      FROM studies WHERE trim(category)<>'' GROUP BY trim(category);
  `);
}

/**
 * Full blocking init (schema + content). Kept for backward compatibility; prefer
 * `initSchema()` + background `seedContent()` for a non-blocking startup.
 */
export async function initDb() {
  await initSchema();
  await seedContent();
}

// Migration function to update existing studies table
export async function migrateStudiesSchema() {
  try {
    await ensureStudiesSchema();
    await ensureStudiesFts();
  } catch (error) {
    console.error("Migration error:", error);
  }
}

// Run migration during initialization
export async function initDatabase() {
  await initDb();
}

// Recommended: Use this as your main initialization function
export async function initializeAppDatabase() {
  await initDatabase();
}
