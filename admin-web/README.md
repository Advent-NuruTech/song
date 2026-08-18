# Advent Pro — Admin Dashboard

A small Next.js web app for creating, editing, and **publishing** songs & studies
to Supabase. Published content syncs into the mobile app's local SQLite cache
automatically — no app-store update needed. The app stays fully offline-first;
sync only layers published changes on top of the bundled starter content.

## How it fits together

```
admin-web (this app) ──writes──▶ Supabase (Postgres + Auth + RLS)
                                      │
mobile app ──pulls published rows────┘  (src/content/supabase.ts → SQLite cache)
```

- **Publish** a song/study → it becomes visible to the app on its next sync.
- **Unpublish / Delete** → a tombstone is sent so the app removes it.
- **Draft** → stays private to the dashboard.

## 1. Set up Supabase (once)

1. Create a project at [supabase.com](https://supabase.com) (or use the existing one).
2. Open **SQL Editor** and run [`../supabase/schema.sql`](../supabase/schema.sql).
   This creates the `songs`, `studies`, `study_categories`, and `admins` tables,
   the Row-Level Security policies, and seeds default categories.
3. Get your keys from **Project Settings → API**:
   - `Project URL` and `anon public` key → used by the app + dashboard (public).
   - `service_role` key → used **only** by the import script (keep secret).

## 2. Configure environment

```bash
cd admin-web
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# and SUPABASE_SERVICE_ROLE_KEY
```

## 3. Run the dashboard

```bash
npm install
npm run dev          # http://localhost:3000
```

1. Go to `/login`, **Sign up** with your email + password.
2. Make yourself an admin — in the Supabase **SQL Editor** run:
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'you@example.com'
   on conflict (user_id) do nothing;
   ```
   (Only admins can write content; everyone else is read-only via RLS.)
3. Sign in. You can now create/edit/publish songs, studies, and categories.

> Tip: in **Authentication → Providers → Email**, turn **off** "Confirm email"
> for the fastest internal setup, or leave it on and confirm via the email link.

## 4. Import the existing corpus (once)

Push the ~1,300 bundled JSON songs/studies into Supabase as published rows:

```bash
npm run import -- --dry     # parse + count, no writes (sanity check)
npm run import              # import everything
npm run import -- --songs   # songs only
npm run import -- --studies # studies only
```

## 5. Point the mobile app at Supabase

The app reads `extra.supabaseUrl` / `extra.supabaseAnonKey` from `app.json`
(already set), or the `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
env vars. On next launch it calls `syncSupabaseContent()` in the background and
pulls published changes into SQLite. Use only the **anon** key in the app.

## 6. Deploy

Deploy `admin-web/` to [Vercel](https://vercel.com):

- Set the project root to `admin-web`.
- Add the three env vars from `.env.local` in the Vercel dashboard.
- `npm run build` is the build command (default).

## Security notes

- The **service_role** key bypasses RLS — never expose it in the browser, the
  mobile app, or any `NEXT_PUBLIC_*` variable. It's only for `scripts/`.
- `.env` / `.env.local` are gitignored. Rotate keys if they were ever committed.
- Content security relies on RLS: anon can read only published rows + tombstones;
  writes require an `admins` row.
