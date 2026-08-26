# Advent Pro

A lightweight, offline-capable worship and study platform built with Expo Router, SQLite, Supabase, and a Next.js admin dashboard.

## Capabilities

- Admin-published songs, studies, and unlimited data-driven song/study categories.
- Fast metadata catalogs with explicit per-item offline downloads.
- Searchable songs, studies, Bible versions, and media.
- Accounts, personal notes/playlists, study collaboration, engagement/discovery, notifications, and voluntary donations.
- Bounded local SQLite cache with WAL and FTS5; network content never blocks startup.

## Structure

- `app/` — Expo Router mobile/web screens.
- `src/` — database, content sync, services, authentication, and feature modules.
- `content/` — deliberately small offline starter content and manifest examples.
- `admin-web/` — production content and operations dashboard.
- `supabase/` — ordered database migrations and Edge Functions.
- `PROJECT.md` — current architecture and non-negotiable scale contract.
- `PROJECT_MEMORY.md` — durable history of major engineering changes.

## Development

```bash
npm install
npm start
```

Useful checks:

```bash
npm run lint
npx tsc --noEmit
npm run validate:content
npm run test:media
npm run test:scripture
npm run test:donations
npm run test:notifications
npm run test:content-platform
```

Build the admin dashboard separately with `npm run build` inside `admin-web/`.

## Content and database operations

Apply Supabase migrations in numeric order as documented in `supabase/MIGRATIONS.md`. Production categories and content are created in Admin and synchronize without a store release. Full song/study bodies load only after the user chooses Download and can be removed without losing their catalog entries.

Read `AGENTS.md`, `PROJECT.md`, and `PROJECT_MEMORY.md` before significant work. Major changes are incomplete until project memory and roadmap documentation are updated.
