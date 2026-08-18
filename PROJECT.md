# Advent Pro — Project Charter & Scaling Architecture

> **Vision:** A lightweight, offline-first spiritual resource app (hymns, studies, and
> related content) that can grow to **1 billion+ users** and host **1 billion+ pieces of
> content** without the app itself ever becoming heavy.
>
> **Core principle:** The app stays small *because* it does not hold the corpus. Content
> lives at the edge (CDN), the device caches only what a user opens, and the origin does
> almost no per-request work. Lightweight and web-scale are the *same* design, not a
> trade-off.

---

## 1. Current State (as of 2026-06)

| Aspect | Detail |
|---|---|
| Platform | Expo SDK 54, React Native 0.81, React 19, expo-router 6, TypeScript |
| Content | 1,307 JSON files (~5.9 MB): 699 English, 332 Luo, 269 Swahili songs + 7 studies |
| Storage | On-device SQLite (`expo-sqlite`) with FTS5 full-text search |
| Delivery | **Bundled into the binary** via `require.context`, seeded on first launch |
| Backend | **None** — no API, CDN, auth, analytics, or content pipeline |
| Offline | 100% offline (this is a strength to preserve) |

### What's good and must be kept
- Offline-first UX and instant local search (SQLite FTS5).
- Clean normalization + content-hash sync (`seedSongs.ts`, `seedStudies.ts`).
- Content as plain, reviewable JSON with a validation script
  (`scripts/validate-content-json.js`).

### The hard limits of today's design
The current "compile all content into the app, seed it all on startup" model is excellent
at ~1.3 K items and **structurally cannot** reach the goal:

1. **Build-time bundling** (`require.context` in `src/db/seedSongs.ts`,
   `src/db/seedStudies.ts`) pulls every file into the binary. 1 B items ≈ ~1 TB — far past
   any app-store size limit.
2. **Startup seeding** loads the whole corpus into memory and inserts row-by-row inside a
   transaction that blocks the splash (`app/_layout.tsx` → `src/db/initDb.ts`). It does not
   scale beyond a few thousand rows without jank.
3. **Whole-corpus-on-device** assumes every user stores everything. Phones can't hold it,
   and it's wasteful — users read a handful of items.
4. **No delivery/control plane.** A billion *users* needs CDN, content versioning,
   analytics, and a publishing pipeline — none exist yet.

> **Conclusion:** "a billion items, all bundled, yet lightweight" is self-contradictory.
> The redesign below removes the contradiction by decoupling content from the binary.

---

## 2. Target Architecture

```
            ┌──────────────────────────────────────────────────────────┐
            │                     CLIENT (RN app)                       │
            │                                                           │
            │  Starter bundle (top ~500 items/lang, instant offline)   │
            │  SQLite = CACHE (not source of truth) + FTS5 over cache  │
            │  Local catalog (id,title,number,lang,hash) for browse    │
            │  LRU eviction · on-demand hydrate · favorites/notes      │
            └───────────────▲───────────────────────▲──────────────────┘
                            │ catalog/manifest sync  │ full-text (long tail)
                            │ + content shards        │
            ┌───────────────┴────────────┐   ┌────────┴───────────────┐
            │   CDN (Cloudflare/Fastly)   │   │   Search service        │
            │   static, versioned JSON /  │   │   (Meilisearch/Typesense│
            │   SQLite shards · ~100% hit │   │    /OpenSearch / PG FTS) │
            └───────────────▲────────────┘   └────────▲───────────────┘
                            │ origin pull (cache miss)  │
            ┌───────────────┴───────────────────────────┴──────────────┐
            │              ORIGIN (thin, stateless API)                 │
            │   Object storage (S3 / R2 / GCS) = content of record      │
            │   Postgres (catalog metadata, accounts, favorites sync)   │
            │   Publish pipeline: ingest → validate → shard → manifest  │
            └───────────────────────────────────────────────────────────┘
```

### 2.1 Content is static, versioned, edge-delivered
- Content of record = immutable JSON (or pre-built SQLite shards) in **object storage**.
- Served through a **CDN**; objects are content-addressed (`{id}@{hash}.json`) so they cache
  forever and a publish is just a new manifest pointer. Cache-hit ratio ≈ origin cost — the
  single most important scaling and cost lever.
- A **version manifest** (`/manifest/{channel}.json`) lists collection versions + hashes.
  The client diffs its local manifest against the remote one to know what changed.

### 2.2 The device is a cache, not a library
- Ship a **starter bundle**: the most-used N items per language for a great first-run while
  fully offline. (Keeps today's offline strength.)
- On open, **hydrate on demand**: fetch the item, store in SQLite, mark `lastAccessed`.
- **LRU eviction** keeps the local DB bounded (e.g. cap at a few thousand items / N MB).
- Favorites/downloads are pinned and never evicted.

### 2.3 Catalog & search at two tiers
- **Catalog sync:** a compact list (`id, title, number, language, contentHash`) lets
  browse/search lists render offline without the full text. Sharded by language/collection
  and paginated; for a huge corpus the catalog itself is delta-synced.
- **Tier 1 — local FTS5:** instant, offline, over the cached + catalog subset (reuse the
  existing `songs_fts` / `studies_fts`).
- **Tier 2 — hosted search:** for the long tail of a billion items, query a managed search
  service; merge results with local hits.

### 2.4 Thin, stateless origin
- A small API behind the CDN: serves the manifest, signs/streams shards, runs search, and
  syncs user data (favorites, notes, history). Stateless → scales horizontally; most reads
  never reach it because the CDN absorbs them.
- **Auth:** anonymous device ID by default; optional account only to sync favorites/notes
  across devices. Don't gate content behind login.

### 2.5 Content pipeline (how the *content* scales to 1 B)
A billion items cannot be hand-edited in a Git repo. Authoring must industrialize:
```
contribute (forms / bulk import / partners)
   → validate (extend scripts/validate-content-json.js, schema + lint)
   → normalize (reuse normalizeSong / normalizeStudy logic, server-side)
   → shard + content-hash
   → publish manifest + invalidate CDN
   → index in search service
```
Moderation, provenance, and licensing metadata are first-class fields.

---

## 3. Why this is both *lightweight* and *scalable*
- **Lightweight client:** binary stays small (app + starter bundle, single-digit MB);
  device storage is bounded by an LRU cache, not the corpus size.
- **Scalable serving:** static content at the edge means a billion users are served almost
  entirely by CDN cache; origin compute is near-constant regardless of user count.
- **Scalable content:** adding items = uploading objects + updating a manifest. No app
  release, no client growth.
- **Cost-linear, not user-linear:** cost tracks *unique content fetched*, not user count,
  because of edge caching.

---

## 4. Roadmap (phased, each phase shippable)

### Phase 0 — Foundations ✅ implemented
- [x] First-launch seeding is **non-blocking** — `initSchema()` (fast) gates the UI;
      `seedContent()` runs in the background on warm starts (`app/_layout.tsx`,
      `src/db/initDb.ts`). Bible installs are incremental/chunked with progress.
- [x] **Content layer seam** under `src/content/` (`config`, `sync`, `net`, `types`) plus
      shared `upsertSongs` / `upsertStudies` write paths — bundled and remote feed the
      same SQLite tables, so screens never change.
- [x] **Content version manifest** format + remote diffing (`src/content/sync.ts`,
      `content/manifest.example.json`). No-op offline.
- [x] `scripts/validate-content-json.js` retained as the content gate; authoring contract
      documented in `content/README.md`.

### Phase 1 — Remote content, app still ships a starter set (client done; infra pending)
- [x] Client: **manifest diff → download changed shards** into SQLite, making the DB a
      cache (`syncRemoteContent`). Activated by setting `extra.contentBaseUrl` /
      `EXPO_PUBLIC_CONTENT_URL` — zero code change.
- [x] **Starter bundle** = the currently bundled songs/studies/Bible versions (offline
      first-run preserved).
- [ ] Stand up **object storage + CDN**; publish current corpus as versioned shards + manifest.
- [ ] Build the minimal **publish pipeline** (validate → shard → upload → manifest).

### Bible — multi-version, no-rewrite ✅ implemented
- [x] Version-agnostic schema (`bible_versions` / `bible_books` / `bible_verses` + FTS5)
      where every translation is just rows keyed by `versionId` (`src/db/initBible.ts`).
- [x] Lazy, on-demand **install per version** with progress + uninstall to reclaim space;
      bundled (offline) and remote (CDN) versions share one installer
      (`src/services/bibleService.ts`).
- [x] Reader UI (versions → books → chapters → verses), cross-book navigation, share, and
      Bible results merged into global search (`app/bible/*`, `app/(tabs)/search.tsx`).
- [x] Adding a translation = drop a JSON file (or a remote manifest entry). No code change.

### Phase 2 — On-demand + bounded cache
- [ ] **Lazy hydration** on item open; **LRU eviction**; pin favorites/downloads.
- [ ] **Catalog sync** (compact, paginated, delta) to power offline browse/search lists.

### Phase 3 — Search & accounts at scale
- [ ] Hosted **search service** for the full corpus; merge with local FTS5.
- [ ] Optional **accounts** + favorites/notes/history **sync**.
- [ ] **Analytics** (privacy-respecting) to drive the starter-bundle and prefetch choices.

### Phase 4 — Content scale & operations
- [ ] **Contribution/ingestion** tooling (bulk import, partner feeds, moderation).
- [ ] Multi-region storage, **observability** (CDN hit ratio, p95 latency, error budgets).
- [ ] Cost controls, rollout/feature flags, load + chaos testing toward target scale.

---

## 5. Technology Choices (proposed)
| Concern | Recommendation | Why |
|---|---|---|
| Object storage | Cloudflare R2 / AWS S3 / GCS | Cheap, durable content of record |
| CDN | Cloudflare / Fastly | Edge cache = the scaling lever |
| Catalog DB | Postgres (managed) | Relational metadata, FTS fallback |
| Search | Meilisearch / Typesense (→ OpenSearch at extreme scale) | Fast, typo-tolerant, ops-light |
| API | Stateless service (Node/Go) behind CDN | Horizontal scale, cache-fronted |
| Client cache | `expo-sqlite` (kept) + FTS5 | Reuse current, proven local layer |
| Auth | Anonymous device ID + optional accounts | Don't gate content |
| CI gate | `scripts/validate-content-json.js` extended | Content correctness at scale |

---

## 6. Risks & Honest Constraints
- **This is a multi-quarter program, not a code edit.** No phase here is "done" until infra
  exists and is operated. The app does **not** scale today.
- **Offline expectation:** moving content remote must not break the current 100%-offline
  feel — hence the starter bundle + aggressive caching.
- **Cost discipline:** a poor CDN hit ratio (e.g. unique-per-user content) breaks the cost
  model. Keep content shareable/cacheable.
- **Content governance:** at a billion items, moderation, licensing, and provenance become
  the hard problem — budget for it early.
- **Privacy:** analytics and accounts must be opt-in and minimal, especially for a
  faith/community audience.

---

## 7. Immediate Next Step
Start with **Phase 0** — it's pure client-side refactoring with zero new infrastructure,
de-risks the rest, and immediately improves startup. The `ContentSource` abstraction is the
seam that lets every later phase slot in without rewriting screens.
