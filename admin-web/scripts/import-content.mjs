/**
 * One-time import of the bundled JSON corpus into Supabase.
 *
 * Reads ../content/songs and ../content/studies, normalizes each file, and
 * upserts it into the Supabase `songs` / `studies` tables as PUBLISHED rows so
 * the existing catalog is immediately live for the app's sync.
 *
 * Uses the SERVICE ROLE key (bypasses RLS) — runs locally only, never shipped.
 *
 * Usage (from admin-web/):
 *   node scripts/import-content.mjs            # import everything
 *   node scripts/import-content.mjs --songs    # songs only
 *   node scripts/import-content.mjs --studies  # studies only
 *   node scripts/import-content.mjs --dry      # parse + count, no writes
 *
 * Env (read from admin-web/.env.local or repo-root .env):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const adminRoot = join(__dirname, "..");

// ---- tiny .env loader (no dependency) --------------------------------------
function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined && val) process.env[key] = val;
  }
}
loadEnv(join(adminRoot, ".env.local"));
loadEnv(join(repoRoot, ".env"));

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Add them to admin-web/.env.local or the repo-root .env."
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const only = args.includes("--songs")
  ? "songs"
  : args.includes("--studies")
    ? "studies"
    : "all";

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---- helpers ---------------------------------------------------------------
/** Read a JSON file, tolerating a leading UTF-8 BOM. */
function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8").replace(/^﻿/, ""));
}

function walkJson(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkJson(full));
    else if (entry.endsWith(".json")) out.push(full);
  }
  return out;
}

function normalizeStanzas(input) {
  if (Array.isArray(input)) {
    if (input.length === 0) return [];
    if (Array.isArray(input[0])) {
      return input.map((st) =>
        (Array.isArray(st) ? st : [st]).map((l) => String(l ?? ""))
      );
    }
    return [input.map((l) => String(l ?? ""))];
  }
  if (typeof input === "string") return [[input]];
  return [];
}

function normalizeChorus(input) {
  if (input == null) return null;
  const raw = Array.isArray(input) ? input.flat() : [input];
  const lines = raw.map((l) => String(l ?? "").trim()).filter(Boolean);
  return lines.length ? lines : null;
}

function normalizeContent(input) {
  if (Array.isArray(input)) return input.map((l) => String(l ?? "").trim()).join("\n");
  if (typeof input === "string") return input.trim();
  return "";
}

async function upsertChunked(table, rows) {
  if (DRY) return;
  const size = 200;
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`  upsert ${table} failed:`, error.message);
      process.exit(1);
    }
    process.stdout.write(`  ${table}: ${Math.min(i + size, rows.length)}/${rows.length}\r`);
  }
  process.stdout.write("\n");
}

// ---- songs -----------------------------------------------------------------
async function importSongs() {
  const files = walkJson(join(repoRoot, "content", "songs"));
  const rows = [];
  for (const f of files) {
    try {
      const raw = readJson(f);
      const id = String(raw.id ?? "").trim();
      if (!id) continue;
      rows.push({
        id,
        hymn_number: Number(raw.hymnNumber) || 0,
        title: String(raw.title ?? "").trim() || id,
        language: String(raw.language ?? "unknown").trim().toLowerCase(),
        author: String(raw.author ?? "").trim(),
        stanzas: normalizeStanzas(raw.stanzas),
        chorus: normalizeChorus(raw.chorus),
        is_published: true,
        deleted: false,
        published_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn(`  skip ${f}: ${e.message}`);
    }
  }
  console.log(`Songs: ${rows.length} parsed from ${files.length} files`);
  await upsertChunked("songs", rows);
}

// ---- studies ---------------------------------------------------------------
async function importStudies() {
  const files = walkJson(join(repoRoot, "content", "studies"));
  const rows = [];
  for (const f of files) {
    try {
      const raw = readJson(f);
      const id = String(raw.id ?? "").trim();
      if (!id) continue;
      rows.push({
        id,
        category: String(raw.category ?? "").trim(),
        title: String(raw.title ?? "").trim() || id,
        subtitle: String(raw.subtitle ?? "").trim(),
        content: normalizeContent(raw.content),
        author: String(raw.author ?? "").trim(),
        is_featured: !!raw.isFeatured,
        is_published: true,
        deleted: false,
        published_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn(`  skip ${f}: ${e.message}`);
    }
  }
  console.log(`Studies: ${rows.length} parsed from ${files.length} files`);
  await upsertChunked("studies", rows);
}

// ---- run -------------------------------------------------------------------
console.log(`Import → ${URL}${DRY ? "  (DRY RUN — no writes)" : ""}`);
if (only === "all" || only === "songs") await importSongs();
if (only === "all" || only === "studies") await importStudies();
console.log("Done.");
