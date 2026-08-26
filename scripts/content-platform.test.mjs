import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("migration 019 owns the unified guarded taxonomy", async () => {
  const sql = await read("supabase/migrations/019_dynamic_content_categories.sql");
  assert.match(sql, /create table if not exists public\.content_categories/i);
  assert.match(sql, /content_type in \('song', 'study'\)/i);
  assert.match(sql, /alter table public\.songs add column if not exists category/i);
  assert.match(sql, /trg_content_categories_restrict_delete/i);
  assert.match(sql, /trg_songs_validate_category/i);
  assert.match(sql, /trg_studies_validate_category/i);
  assert.match(sql, /content_categories_public_read/i);
  assert.match(sql, /content_categories_admin_all/i);
});

test("remote collection sync writes metadata, not full bodies", async () => {
  const source = await read("src/content/sync.ts");
  assert.match(source, /upsertSongCatalog\(data/);
  assert.match(source, /upsertStudyCatalog\(data/);
  assert.doesNotMatch(source, /upsertSongs\(data/);
  assert.doesNotMatch(source, /upsertStudies\(data/);
});

test("readers require explicit download and retain catalog on removal", async () => {
  const service = await read("src/services/contentDownloadService.ts");
  const song = await read("app/song/[id].tsx");
  const study = await read("app/studies/[id].tsx");
  assert.match(service, /UPDATE songs SET stanzas = '\[\]'/);
  assert.match(service, /UPDATE studies SET content = ''/);
  assert.match(service, /DELETE FROM content_downloads/);
  assert.match(song, /Download hymn/);
  assert.match(study, /Download study/);
});

test("both admin editors use shared content categories", async () => {
  const categories = await read("admin-web/app/(dashboard)/categories/page.tsx");
  const songEditor = await read("admin-web/app/(dashboard)/songs/[id]/page.tsx");
  const studyEditor = await read("admin-web/app/(dashboard)/studies/[id]/page.tsx");
  assert.match(categories, /content_categories/);
  assert.match(categories, /value="song"/);
  assert.match(categories, /value="study"/);
  assert.match(songEditor, /content_categories/);
  assert.match(studyEditor, /content_categories/);
});
