# Advent Pro — Admin Dashboard

A small Next.js web app for creating, editing, and **publishing** songs & studies
to Supabase. Published content syncs into the mobile app's local SQLite cache
automatically — no app-store update needed. The app stays fully offline-first;
sync only layers published changes on top of the bundled starter content.

The dashboard also includes a Super-admin-only Donations tab with paginated
Support the Work totals and transaction-status reporting.

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
2. Apply the ordered files in [`../supabase/migrations`](../supabase/migrations)
   as documented in [`../supabase/MIGRATIONS.md`](../supabase/MIGRATIONS.md).
   Do not run `schema.sql`; it is now only a short migration entry point.
3. Get your keys from **Project Settings → API**:
   - `Project URL` and `anon public` key → used by the app + dashboard (public).
   - `service_role` key → used **only** by trusted server code (keep secret).

## 2. Configure environment

```bash
cd admin-web
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, and ADMIN_SIGNUP_CODE
```

## 3. Run the dashboard

```bash
npm install
npm run dev          # http://localhost:3000
```

1. Go to `/login`, **Sign up** with your email + password.
2. Enter the configured `ADMIN_SIGNUP_CODE`. The protected server endpoint
   provisions the profile and administrator role atomically.
3. Confirm the email if email confirmation is enabled, then sign in. Future
   role assignments are managed from **Users & roles** in the dashboard.

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
- Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_SIGNUP_CODE` in the Vercel dashboard.
- `npm run build` is the build command (default).

After deployment, replace `YOUR_DOMAIN` with the domain Vercel gives you:

- Privacy Policy: `https://YOUR_DOMAIN/privacy`
- Terms of Service: `https://YOUR_DOMAIN/terms`
- Account deletion: `https://YOUR_DOMAIN/account-deletion`

Use the Privacy Policy URL in the Google Play privacy-policy field and the
account-deletion URL in the Data safety account-deletion field. Keep these pages
public; they do not require sign-in.

## Security notes

- The **service_role** key bypasses RLS — never expose it in the browser, the
  mobile app, or any `NEXT_PUBLIC_*` variable. It is only for trusted server
  routes and scripts.
- `.env` / `.env.local` are gitignored. Rotate keys if they were ever committed.
- Content security relies on RLS: anonymous clients can read only published rows
  and tombstones; writes require the relevant role permission.
- Role assignment uses the protected `set_user_roles` database function, records
  an audit event, supports multiple roles per account, and prevents ordinary user
  managers from granting or removing the Super admin role.
- Donation rows remain inaccessible to browser clients directly. Permission-checked
  reporting functions expose accounting fields only through `donations.read`, which
  migration 014 grants exclusively to the Super admin role.

## Google Play account deletion

Deploy this dashboard and give Play Console the public URL
`https://YOUR_DOMAIN/account-deletion`. The mobile account screen also
contains **Request account deletion**. A trusted administrator or server job must
process pending rows in `account_deletion_requests` and remove the corresponding
Supabase Auth user and associated personal data.
