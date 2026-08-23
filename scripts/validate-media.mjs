import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { extractYouTubeVideoId, getMediaLayout, stripUnsafeComment } from "../src/features/media/utils.ts";
import { extractYouTubeVideoId as extractAdminId } from "../admin-web/lib/youtube.ts";

const urls = [
  ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ["https://youtu.be/dQw4w9WgXcQ?t=32", "dQw4w9WgXcQ"],
  ["https://youtube.com/shorts/dQw4w9WgXcQ?feature=share", "dQw4w9WgXcQ"],
  ["https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&list=abc", "dQw4w9WgXcQ"],
  ["https://example.com/watch?v=dQw4w9WgXcQ", null],
  ["javascript:alert(1)", null],
  ["https://youtu.be/too-short", null],
  ["", null],
];

for (const [url, expected] of urls) {
  assert.equal(extractYouTubeVideoId(url), expected, `mobile parser: ${url}`);
  assert.equal(extractAdminId(url), expected, `admin parser: ${url}`);
}

for (let index = 0; index < 60; index += 1) {
  const expected = index % 15 < 10 ? "compact" : "full";
  assert.equal(getMediaLayout(index), expected, `layout at absolute index ${index}`);
}
assert.throws(() => getMediaLayout(-1));
assert.equal(stripUnsafeComment("  hello <script>alert(1)</script> world  "), "hello alert(1) world");

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(resolve(here, "../supabase/migrations/008_media_module.sql"), "utf8");
for (const required of [
  "primary key (media_id, user_id)",
  "Please wait before posting another comment",
  "Media engagement counters are server-managed",
  "p_watch_seconds < threshold",
  "has_permission('media.manage')",
  "Comment not found or not authorized",
  "get_media_moderation_queue",
]) assert.ok(migration.includes(required), `migration contract missing: ${required}`);

console.log("Media validation passed: URL parsing, 10+5 feed cycle, sanitization, and database security contracts.");
