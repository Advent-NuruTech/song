import { db } from "./database";

/**
 * Bible storage — version-agnostic by design.
 *
 * Every translation, in any language, is stored in the SAME three tables keyed by
 * `versionId`. Adding a new version (bundled file or remote download) inserts rows;
 * it never requires a schema or code change. This is what lets the app "support as
 * many versions as possible without rewriting anything".
 */

// Canonical Protestant 66-book order. Used only for SORTING/display; books not in
// this map are appended in first-seen order, so non-standard canons still work.
export const CANONICAL_BOOK_ORDER: Record<string, number> = {
  Genesis: 1, Exodus: 2, Leviticus: 3, Numbers: 4, Deuteronomy: 5,
  Joshua: 6, Judges: 7, Ruth: 8, "1 Samuel": 9, "2 Samuel": 10,
  "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14,
  Ezra: 15, Nehemiah: 16, Esther: 17, Job: 18, Psalms: 19, Proverbs: 20,
  Ecclesiastes: 21, "Song of Solomon": 22, Isaiah: 23, Jeremiah: 24,
  Lamentations: 25, Ezekiel: 26, Daniel: 27, Hosea: 28, Joel: 29, Amos: 30,
  Obadiah: 31, Jonah: 32, Micah: 33, Nahum: 34, Habakkuk: 35, Zephaniah: 36,
  Haggai: 37, Zechariah: 38, Malachi: 39,
  Matthew: 40, Mark: 41, Luke: 42, John: 43, Acts: 44, Romans: 45,
  "1 Corinthians": 46, "2 Corinthians": 47, Galatians: 48, Ephesians: 49,
  Philippians: 50, Colossians: 51, "1 Thessalonians": 52, "2 Thessalonians": 53,
  "1 Timothy": 54, "2 Timothy": 55, Titus: 56, Philemon: 57, Hebrews: 58,
  James: 59, "1 Peter": 60, "2 Peter": 61, "1 John": 62, "2 John": 63,
  "3 John": 64, Jude: 65, Revelation: 66,
  // Kiswahili book names
  Mwanzo: 1, Kutoka: 2, Levitiko: 3, Nambari: 4, "Kumbukumbu la Torati": 5,
  Yoshua: 6, Waamuzi: 7, Ruthu: 8, "1 Samuele": 9, "2 Samuele": 10,
  "1 Wafalme": 11, "2 Wafalme": 12, "1 Mambo ya Siku za Nyuma": 13, "2 Mambo ya Siku za Nyuma": 14,
  Nehemia: 16, Estheri: 17, Ayubu: 18, Zaburi: 19, Methali: 20,
  Mhubiri: 21, "Wimbo la Sulemani": 22, Isaya: 23, Yeremia: 24,
  Maombolezo: 25, Ezekieli: 26, Danieli: 27, Yoeli: 29, Amosi: 30,
  Obadia: 31, Yona: 32, Mika: 33, Nahumu: 34, Habakuki: 35, Sefania: 36,
  Hagai: 37, Zekaria: 38, Malaki: 39,
  Mathayo: 40, Marko: 41, Luka: 42, Yohana: 43, "Matendo ya Mitume": 44, Warumi: 45,
  "1 Wakorinto": 46, "2 Wakorinto": 47, Wagalatia: 48, Waefeso: 49,
  Wafilipi: 50, Wakolosai: 51, "1 Wathesalonike": 52, "2 Wathesalonike": 53,
  "1 Timotheo": 54, "2 Timotheo": 55, Tito: 56, Filemoni: 57, Waebrania: 58,
  Yakobo: 59, "1 Petro": 60, "2 Petro": 61, "1 Yohana": 62, "2 Yohana": 63,
  "3 Yohana": 64, Yuda: 65, Ufunuo: 66,
};

export function bookOrderFor(book: string, seenIndex: number): number {
  return CANONICAL_BOOK_ORDER[book] ?? 900 + seenIndex;
}

export async function initBibleSchema(): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS bible_versions (
      id TEXT PRIMARY KEY,
      name TEXT,
      abbreviation TEXT,
      language TEXT,
      direction TEXT DEFAULT 'ltr',
      source TEXT,
      remotePath TEXT,
      installed INTEGER DEFAULT 0,
      verseCount INTEGER DEFAULT 0,
      contentHash TEXT,
      sortOrder INTEGER DEFAULT 0,
      createdAt INTEGER,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS bible_books (
      versionId TEXT,
      book TEXT,
      bookOrder INTEGER,
      chapterCount INTEGER DEFAULT 0,
      PRIMARY KEY (versionId, book)
    );

    CREATE TABLE IF NOT EXISTS bible_verses (
      versionId TEXT,
      book TEXT,
      bookOrder INTEGER,
      chapter INTEGER,
      verse INTEGER,
      text TEXT,
      PRIMARY KEY (versionId, book, chapter, verse)
    );

    CREATE INDEX IF NOT EXISTS idx_bible_verses_loc
      ON bible_verses(versionId, bookOrder, chapter, verse);
  `);

  // Standalone FTS (locators kept UNINDEXED so we can filter & display them).
  await db.execAsync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS bible_verses_fts USING fts5(
      text,
      versionId UNINDEXED,
      book UNINDEXED,
      bookOrder UNINDEXED,
      chapter UNINDEXED,
      verse UNINDEXED
    );
  `);
}
