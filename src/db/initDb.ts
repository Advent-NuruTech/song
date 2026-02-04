import { db } from "./database";
import { seedSongs } from "./seedSongs";
import { seedStudies } from "./seedStudies";

export async function initDb() {
  // Enable performance features
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;
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
  `);

  await ensureSongsSchema();
  await ensureStudiesSchema();
  await ensureStudiesFts();

  // Create indexes for performance
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_studies_category ON studies(category);
    CREATE INDEX IF NOT EXISTS idx_studies_created ON studies(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_studies_featured ON studies(isFeatured) WHERE isFeatured = 1;
    
    CREATE INDEX IF NOT EXISTS idx_songs_language ON songs(language);
    CREATE INDEX IF NOT EXISTS idx_songs_hymnNumber ON songs(hymnNumber);
  `);

  // Check and seed data
  const songCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM songs"
  );
  if (!songCount || songCount.count === 0) {
    await seedSongs();
  }

  const studyCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM studies"
  );
  if (!studyCount || studyCount.count === 0) {
    await seedStudies();
  }

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

  if (hasConclusion) {
    await rebuildStudiesTable({ hasAuthor, hasWordCount, hasIsFeatured });
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
}

async function rebuildStudiesTable(options: {
  hasAuthor: boolean;
  hasWordCount: boolean;
  hasIsFeatured: boolean;
}) {
  const authorExpr = options.hasAuthor ? "author" : "''";
  const wordCountExpr = options.hasWordCount
    ? "wordCount"
    : "LENGTH(COALESCE(content, '')) + LENGTH(COALESCE(conclusion, ''))";
  const isFeaturedExpr = options.hasIsFeatured ? "isFeatured" : "0";

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
      createdAt INTEGER,
      updatedAt INTEGER
    )
  `);

  await db.execAsync(`
    INSERT OR REPLACE INTO studies_new
    (id, category, title, subtitle, content, author, wordCount, isFeatured, createdAt, updatedAt)
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

  await createFtsTriggers();

  try {
    await db.execAsync(`INSERT INTO studies_fts(studies_fts) VALUES('rebuild')`);
  } catch (error) {
    console.warn("Failed to rebuild studies FTS table:", error);
  }
}

async function createFtsTriggers() {
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
