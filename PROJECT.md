# Advent Pro — architecture and operating contract

Last reconciled: 2026-08-31

## Product contract

Advent Pro is a lightweight, offline-capable spiritual resource app. The app binary and each device must remain bounded even when the service contains millions of songs and studies.

Non-negotiable rules:

1. Catalog metadata may load in bounded pages; full song lyrics and study bodies load only after the user chooses Download.
2. Removing a download removes only the heavy body. Its catalog record remains discoverable.
3. Startup waits only for local schema readiness. Seeding and every network sync run in the background.
4. Categories are data. Administrators may create any number of song or study categories, assign content, and publish without an app-code change or store release.
5. Significant features, schema changes, upgrades, releases, and performance changes must be recorded in `PROJECT_MEMORY.md` in the same change.
6. Theme tokens must preserve readable button labels in both light and dark mode. If an accent background changes, the matching foreground color must be checked for contrast before release.
7. A previously authenticated user remains signed in while offline. Local identity and last-confirmed access are a fallback only; network-only actions still wait for a connection.

## Current architecture

| Layer | Current implementation |
|---|---|
| Mobile | Expo SDK 54, React Native 0.81, React 19, Expo Router 6 |
| Local storage | SQLite/WAL with indexed catalog tables, FTS5, personal notes/playlists, download ledger |
| Backend | Supabase Postgres, Auth, RLS, RPCs, Edge Functions, revision-based content sync |
| Admin | Next.js dashboard for content, categories, users/roles, media, verse templates, and donation reports |
| Delivery | Small bundled starter set plus Supabase metadata deltas; optional CDN manifest and per-item JSON |
| Search | Bounded local FTS/catalog search; hosted long-tail search remains an infrastructure follow-up |
| Heavy content | Explicit per-item hydration; CDN path first, published Supabase row fallback |
| Categories | Unified `content_categories`, keyed by `content_type` (`song` or `study`) and stable `name` |

## Content flow

```text
Admin creates category/content
  -> Supabase validates permissions and category assignment
  -> revision changes
  -> mobile background sync receives metadata/category delta
  -> catalog renders from SQLite without body
  -> user taps Download
  -> immutable CDN item (preferred) or published Supabase item (fallback)
  -> full body stored locally and recorded in content_downloads
  -> user may Remove download; metadata remains
```

Published edits, tombstones, categories, and assignments reconcile through the same revision/data model. Drafts remain admin-only. Category keys are immutable identifiers; administrators may edit display name, color, icon, description, and order. A category in use cannot be deleted.

## Scale boundaries

- Mobile catalog queries are bounded and lists are virtualized. No screen may select or materialize an unbounded corpus.
- Full bodies must never be included in ordinary catalog sync or list queries.
- The bundled corpus is a starter set, not the content source of record. Do not grow it with the production corpus.
- Production scale requires object storage + CDN objects at `items/songs/{id}.json` and `items/studies/{id}.json`. Existing Supabase per-item retrieval is a functional fallback, not the billion-read delivery tier.
- For a catalog larger than a device cache, hosted search and paginated catalog endpoints must serve the long tail. SQLite remains a bounded recent/offline cache.
- User-requested downloads are pinned. Automatic eviction may apply only to non-pinned hydrated cache entries after a storage policy is approved.

## Implemented roadmap

- [x] Non-blocking startup and background content sync.
- [x] Shared bundled/remote normalization and SQLite write paths.
- [x] Revisioned Supabase publishing with tombstones and RLS.
- [x] Optional CDN manifest support.
- [x] Explicit song/study download and removal flows.
- [x] Metadata-only remote catalog sync.
- [x] Bounded song/study catalog queries and virtualized lists.
- [x] Unified unlimited song/study categories managed from web and local admin.
- [x] Lazy Bible-version installation/removal with shared version-agnostic schema.
- [x] Accounts/roles, personal notes/playlists, study collaboration, media, engagement/discovery, notifications, and voluntary donations.
- [x] Media Songs tab, with bounded song-video category feeds, search, pagination, and offline cache support.
- [x] Offline-resilient authenticated identity plus a locally admin-editable About story and horizontally scrollable image gallery.

## Infrastructure follow-up

These are deployment/operations tasks, not content-model rewrites:

- [ ] Apply migration `019_dynamic_content_categories.sql` to staging.
- [x] Apply migration `019_dynamic_content_categories.sql` to production (API-verified 2026-08-27).
- [ ] Apply migration `020_publish_collaboration_categories.sql` to staging and production.
- [ ] Publish immutable per-item song/study JSON to object storage and place a CDN in front.
- [ ] Emit compact, paginated catalog manifests/deltas from the publish pipeline.
- [ ] Add hosted full-corpus search and merge it with local results.
- [ ] Define storage limits and implement eviction only for non-pinned cache entries.
- [ ] Add CDN/search observability, rate limits, cost alerts, backups, and disaster-recovery drills.

## Current Android release candidate

- Advent Pro `2.0.0` / Android `versionCode` 6 was built successfully with the EAS production profile on 2026-08-27.
- Upload artifact: `artifacts/Advent-Pro-2.0.0-build-6.aab`.
- EAS build: `0bd02ad7-ed14-4d29-bc3e-a0389c3185e1`.
- SHA-256: `5CD28773EF42C3A0368B0AF8AE367A3CCCC86349F86B01D30B1F1A269062FF74`.
- Camera capture remains available, but physical camera hardware is optional so camera-less devices are not filtered by Play.
- Production rollout remains gated on Play internal-track/device testing and the manual policy/infrastructure confirmations in `ANDROID_RELEASE.md`.

## Change procedure

1. Read `AGENTS.md`, `PROJECT_MEMORY.md`, and this file.
2. Add a new numbered Supabase migration; never edit one already deployed.
3. Preserve stable content/category IDs and backward compatibility through rollout.
4. Verify mobile TypeScript/lint/tests, admin production build, content validation, and SQL migration in staging.
5. Update `PROJECT_MEMORY.md` and roadmap status before considering a major change complete.
