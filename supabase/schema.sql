-- ============================================================================
-- Advent Pro — Supabase schema
-- ----------------------------------------------------------------------------
-- Source of truth for content authored in the online admin dashboard.
-- The mobile app pulls PUBLISHED rows (and tombstones) into its local SQLite
-- cache via the anon key; admins get full read/write via Supabase Auth.
--
-- Sync model (matches src/content/supabaseSync.ts on the client):
--   * is_published = true,  deleted = false  -> app upserts the row
--   * deleted = true                         -> app removes the row (tombstone)
--   * is_published = false, deleted = false  -> draft, hidden from the app
-- "Unpublish" therefore sets deleted = true so the change reaches devices.
--
-- Run this in the Supabase SQL editor (or `supabase db push`). Idempotent.
-- ============================================================================

-- ---------- helpers ----------------------------------------------------------
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Who is allowed to write content. Add admins by inserting their auth user id.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email   text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ---------- songs ------------------------------------------------------------
create table if not exists public.songs (
  id           text primary key,
  hymn_number  integer not null default 0,
  title        text    not null default '',
  language     text    not null default 'unknown',
  author       text    not null default '',
  -- stanzas: array of stanzas, each an array of lines  -> string[][]
  stanzas      jsonb   not null default '[]'::jsonb,
  -- chorus: array of lines or null                      -> string[] | null
  chorus       jsonb,
  is_published boolean not null default false,
  deleted      boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_songs_updated     on public.songs (updated_at);
create index if not exists idx_songs_published    on public.songs (is_published) where is_published;
create index if not exists idx_songs_language     on public.songs (language);

drop trigger if exists trg_songs_updated on public.songs;
create trigger trg_songs_updated before update on public.songs
  for each row execute function public.set_updated_at();

-- ---------- studies ----------------------------------------------------------
create table if not exists public.studies (
  id           text primary key,
  category     text    not null default '',
  title        text    not null default '',
  subtitle     text    not null default '',
  content      text    not null default '',
  author       text    not null default '',
  is_featured  boolean not null default false,
  is_published boolean not null default false,
  deleted      boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_studies_updated  on public.studies (updated_at);
create index if not exists idx_studies_published on public.studies (is_published) where is_published;
create index if not exists idx_studies_category  on public.studies (category);

drop trigger if exists trg_studies_updated on public.studies;
create trigger trg_studies_updated before update on public.studies
  for each row execute function public.set_updated_at();

-- ---------- study categories -------------------------------------------------
create table if not exists public.study_categories (
  name         text primary key,
  display_name text not null default '',
  color        text not null default '#0B4AA6',
  icon         text not null default 'book-outline',
  description  text not null default '',
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table public.songs            enable row level security;
alter table public.studies          enable row level security;
alter table public.study_categories enable row level security;
alter table public.admins           enable row level security;

-- Public (anon) read: only published rows + tombstones, so the app can both
-- add published content and learn about removals.
drop policy if exists songs_public_read on public.songs;
create policy songs_public_read on public.songs
  for select using (is_published = true or deleted = true);

drop policy if exists studies_public_read on public.studies;
create policy studies_public_read on public.studies
  for select using (is_published = true or deleted = true);

-- Categories are always readable.
drop policy if exists categories_public_read on public.study_categories;
create policy categories_public_read on public.study_categories
  for select using (true);

-- Admins: full read/write on content.
drop policy if exists songs_admin_all on public.songs;
create policy songs_admin_all on public.songs
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists studies_admin_all on public.studies;
create policy studies_admin_all on public.studies
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists categories_admin_all on public.study_categories;
create policy categories_admin_all on public.study_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- Admins table: an admin may read the roster; nobody self-promotes via the API
-- (insert the first admin from the SQL editor / service role).
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins
  for select using (public.is_admin());

-- ============================================================================
-- Seed default study categories (safe to re-run)
-- ============================================================================
insert into public.study_categories (name, display_name, color, icon, sort_order) values
  ('doctrine',    'Doctrine',     '#0B4AA6', 'book-outline',        10),
  ('prophecy',    'Prophecy',     '#8B5CF6', 'eye-outline',         20),
  ('health',      'Health',       '#10B981', 'leaf-outline',        30),
  ('family',      'Family',       '#F59E0B', 'people-outline',      40),
  ('devotional',  'Devotional',   '#EF4444', 'heart-outline',       50),
  ('history',     'History',      '#6366F1', 'time-outline',        60)
on conflict (name) do nothing;

-- ============================================================================
-- Make yourself an admin (run once, after signing up in the dashboard):
--   insert into public.admins (user_id, email)
--   select id, email from auth.users where email = 'adventnurutech@gmail.com'
--   on conflict (user_id) do nothing;
-- ============================================================================
