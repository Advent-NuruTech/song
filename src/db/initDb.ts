import { db } from "./database";
import { seedSongs } from "./seedSongs";
import { seedStudies } from "./seedStudies";

export async function initDb() {
  // Enable performance features
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;
    PRAGMA temp_store = MEMORY;
    PRAGMA cache_size = -20000;
    PRAGMA busy_timeout = 5000;
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      hymnNumber INTEGER,
      title TEXT,
      language TEXT,
      author TEXT,
      stanzas TEXT,
      chorus TEXT,
      contentHash TEXT,
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
  `);

  await ensureSongsSchema();
  await ensureStudiesSchema();
  await ensureSongsFts();
  await ensureStudiesFts();

  // Create indexes for performance
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_studies_category ON studies(category);
    CREATE INDEX IF NOT EXISTS idx_studies_created ON studies(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_studies_featured ON studies(isFeatured) WHERE isFeatured = 1;
    
    CREATE INDEX IF NOT EXISTS idx_songs_language ON songs(language);
    CREATE INDEX IF NOT EXISTS idx_songs_hymnNumber ON songs(hymnNumber);
    CREATE INDEX IF NOT EXISTS idx_songs_language_hymn ON songs(language, hymnNumber);
    CREATE INDEX IF NOT EXISTS idx_songs_title_nocase ON songs(title COLLATE NOCASE);
  `);

  // Check and seed data
  await seedSongs({ prune: true });
  await seedStudies({ prune: true });

  await syncLanguagesFromSongs();
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

  if (!columnNames.has("contentHash")) {
    await db.execAsync(`ALTER TABLE songs ADD COLUMN contentHash TEXT`);
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
