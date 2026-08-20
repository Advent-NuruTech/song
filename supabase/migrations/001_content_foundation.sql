-- Advent Pro migration 001: revisioned content foundation.
-- Safe to run more than once.
create extension if not exists pgcrypto;
create sequence if not exists public.content_revision_seq;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
create or replace function public.set_content_revision() returns trigger language plpgsql as $$
begin new.revision=nextval('public.content_revision_seq'); return new; end; $$;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text, created_at timestamptz not null default now()
);
create table if not exists public.songs (
  id text primary key, hymn_number integer not null default 0,
  title text not null default '', language text not null default 'unknown', author text not null default '',
  stanzas jsonb not null default '[]'::jsonb, chorus jsonb,
  is_published boolean not null default false, deleted boolean not null default false,
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.songs add column if not exists revision bigint not null default nextval('public.content_revision_seq');
create index if not exists idx_songs_revision on public.songs(revision);
create index if not exists idx_songs_updated on public.songs(updated_at);
create index if not exists idx_songs_published on public.songs(is_published) where is_published;
create index if not exists idx_songs_language on public.songs(language);
drop trigger if exists trg_songs_updated on public.songs;
create trigger trg_songs_updated before update on public.songs for each row execute function public.set_updated_at();
drop trigger if exists trg_songs_revision on public.songs;
create trigger trg_songs_revision before insert or update on public.songs for each row execute function public.set_content_revision();

create table if not exists public.studies (
  id text primary key, category text not null default '', title text not null default '', subtitle text not null default '',
  content text not null default '', author text not null default '', is_featured boolean not null default false,
  is_published boolean not null default false, deleted boolean not null default false,
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.studies add column if not exists revision bigint not null default nextval('public.content_revision_seq');
create index if not exists idx_studies_revision on public.studies(revision);
create index if not exists idx_studies_updated on public.studies(updated_at);
create index if not exists idx_studies_published on public.studies(is_published) where is_published;
create index if not exists idx_studies_category on public.studies(category);
drop trigger if exists trg_studies_updated on public.studies;
create trigger trg_studies_updated before update on public.studies for each row execute function public.set_updated_at();
drop trigger if exists trg_studies_revision on public.studies;
create trigger trg_studies_revision before insert or update on public.studies for each row execute function public.set_content_revision();

create table if not exists public.study_categories (
  name text primary key, display_name text not null default '', color text not null default '#0B4AA6',
  icon text not null default 'book-outline', description text not null default '',
  sort_order integer not null default 0, created_at timestamptz not null default now()
);
