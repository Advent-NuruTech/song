-- Advent Pro migration 015: remotely managed verse-of-the-day backgrounds.
-- The mobile app keeps a bundled image as its zero-network fallback.

begin;

create table if not exists public.daily_verse_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  image_url text not null check (image_url ~ '^https://'),
  image_public_id text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_default or is_active)
);

create unique index if not exists idx_daily_verse_templates_one_default
  on public.daily_verse_templates (is_default) where is_default;
create index if not exists idx_daily_verse_templates_public_order
  on public.daily_verse_templates (is_default desc, sort_order, created_at)
  where is_active;

create or replace function public.touch_daily_verse_template()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_daily_verse_template_updated_at on public.daily_verse_templates;
create trigger trg_daily_verse_template_updated_at
  before update on public.daily_verse_templates
  for each row execute function public.touch_daily_verse_template();

alter table public.daily_verse_templates enable row level security;

drop policy if exists daily_verse_templates_public_read on public.daily_verse_templates;
create policy daily_verse_templates_public_read
  on public.daily_verse_templates for select
  using (is_active or public.has_permission('content.edit'));

drop policy if exists daily_verse_templates_admin_insert on public.daily_verse_templates;
create policy daily_verse_templates_admin_insert
  on public.daily_verse_templates for insert to authenticated
  with check (public.has_permission('content.edit'));

drop policy if exists daily_verse_templates_admin_update on public.daily_verse_templates;
create policy daily_verse_templates_admin_update
  on public.daily_verse_templates for update to authenticated
  using (public.has_permission('content.edit'))
  with check (public.has_permission('content.edit'));

drop policy if exists daily_verse_templates_admin_delete on public.daily_verse_templates;
create policy daily_verse_templates_admin_delete
  on public.daily_verse_templates for delete to authenticated
  using (public.has_permission('content.edit'));

grant select on table public.daily_verse_templates to anon;
grant select, insert, update, delete on table public.daily_verse_templates to authenticated;

commit;

-- Rollback: drop table public.daily_verse_templates cascade;
