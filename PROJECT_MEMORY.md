# Advent Pro project memory

This is the durable engineering record for major changes. Contributors and coding agents must read it before significant work and append an entry after every major feature, architecture, schema, dependency, release, or performance upgrade.

## 2026-08-26 — Explicit on-demand songs and studies

Outcome: songs and studies remain discoverable in the local catalog, but opening an item asks the user to download its full content. Users can remove a download without removing its catalog entry.

- Added `content_downloads`, a small SQLite table recording downloaded items and last access time. The timestamp provides the foundation for bounded LRU eviction.
- Added `contentDownloadService`, the hydration/removal boundary. Bundled starter content resolves locally; non-bundled items use `items/songs/{id}.json` and `items/studies/{id}.json` on the configured CDN.
- Removal clears the heavy body while retaining catalog metadata.
- Song and study readers now have explicit download gates and removal controls.

Important files: `src/db/initDb.ts`, `src/services/contentDownloadService.ts`, `app/song/[id].tsx`, `app/studies/[id].tsx`, `AGENTS.md`, `PROJECT.md`.

Known follow-up: production publishing must emit compact catalog pages and per-item JSON. Enable automatic LRU eviction after choosing product storage limits.

Verification: TypeScript type-check, lint, content validation, and existing automated suites.

## 2026-08-26 — Production-safe Expo push guard

Outcome: remote token registration and token-change listeners run only in builds that support push. Notification presentation remains configured synchronously at startup, preserving the existing production behavior. Expo Go continues to support local scheduled reminders, but Expo's expected SDK 53+ warning remains because remote push must be tested in an installed preview, development, or release build.

- Guarded both initial push registration and token refresh registration from the unsupported Expo Go remote-push path.
- Token refresh now reuses the native token supplied by Expo instead of fetching it again inside the listener, avoiding the documented risk of a retrigger loop; refresh failures are handled without an unhandled rejection.
- Kept the existing synchronous `expo-notifications` initialization and listener lifecycle for production reliability.
- Added an automated regression check and documented the FCM v1, EAS enhanced-security, Supabase secret/cron, preview-build, and physical-device steps required for real delivery.

Important files: `src/features/notifications/notificationService.ts`, `src/context/NotificationsContext.tsx`, `scripts/notification-security.test.mjs`, `ANDROID_RELEASE.md`.

Known follow-up: the operator must upload the private FCM v1 service-account credential to EAS, configure the two server secrets and cron worker, and verify delivery from an installed preview or Play build. None of those secrets belong in this repository.

Verification: notification security tests, TypeScript type-check, and Expo lint.

## 2026-08-26 — Unified admin-managed content taxonomy and catalog/body separation

Outcome: administrators can create any number of song or study categories, assign them in both admin surfaces, and publish content without changing client code. Remote synchronization now treats SQLite as a metadata catalog and fetches full bodies per item.

Decisions and invariants:

- `content_categories` is the canonical taxonomy table. Its composite identity is `(content_type, name)`, where type is `song` or `study`; the stable key is not renamed after use.
- Display name, color, icon, description, and ordering are data-driven. Deletion is rejected while live content is assigned.
- Songs now have a category key. Existing songs migrate to `hymn`; legacy study categories and free-text assignments migrate into the unified table.
- Category assignments are database-validated. Public reads are RLS-safe; writes require `content.edit`.
- Supabase and optional CDN collection sync upsert metadata only. `contentDownloadService` retrieves one full published item from CDN first, then Supabase as a fallback.
- Tombstones remove both the local catalog record and its download ledger entry.
- Song catalog queries select metadata only, search through bounded FTS/SQL results, and return at most 200 rows. Category/language browsing remains virtualized.
- Local admin-authored full content is immediately recorded as downloaded.

Database migration: `019_dynamic_content_categories.sql` adds `songs.category`, `studies.word_count`, the revisioned `content_categories` table, indexes, assignment/deletion guards, RLS policies, grants, and legacy-data reconciliation. Apply it to staging before production.

Important files: `supabase/migrations/019_dynamic_content_categories.sql`, `src/content/supabase.ts`, `src/content/sync.ts`, `src/db/seedSongs.ts`, `src/db/seedStudies.ts`, `src/services/contentCategoryService.ts`, `src/services/contentDownloadService.ts`, `src/services/adminService.ts`, `admin-web/app/(dashboard)/categories/page.tsx`, both admin content editors, catalog/reader screens, `PROJECT.md`, `content/README.md`, and `README.md`.

Known infrastructure follow-up: deploy the migration; publish per-item objects through a CDN; add hosted long-tail search and compact paginated catalog endpoints before the corpus exceeds the bounded device cache. These do not require another content/category data-model rewrite.

Verification: mobile TypeScript and lint; admin production build; full content validation; automated content-platform, media, scripture, donation, and notification suites. SQL still requires staging migration execution because this workspace has no authorized production database session.

## Reconciled major application history (through migration 019)

This baseline prevents future work from rediscovering or accidentally duplicating shipped systems:

- Migrations 001–003: revisioned songs/studies, accounts, profiles, roles/permissions, audit log, RLS, and category seeds.
- 004–007: study engagement, hardened API privileges, admin provisioning, and song catalog permissions.
- 008–010: video/Short media catalog, engagement/moderation, normalized categories, search, and recommendations.
- 011–012: personal rich notes, song playlists, study working copies, collaboration projects/revisions, contributor review, and publication.
- 013–016: voluntary Paystack donations, rate limits/idempotency, senior-admin reporting, daily verse templates, and KES minimum reconciliation.
- 017–018: production notification inbox/push pipeline, delivery receipts, daily limits, release notifications, donation receipts, and corrected aggregate decrements.
- 019: unified dynamic song/study taxonomy and metadata-only content delivery boundary.

Current client modules also include multi-version lazy Bible installation, scripture insertion/sharing, app theming/accessibility sizing, Supabase authentication, global/local search, study discovery, and offline-first background initialization. Before adding a new subsystem, search this memory and the migrations to avoid creating a second source of truth.
