-- Advent Pro migration 019: unified, admin-managed song/study categories.
-- Additive and safe before deploying the matching clients.
begin;

alter table public.songs add column if not exists category text not null default 'hymn';
create index if not exists idx_songs_category on public.songs(category) where deleted = false;

alter table public.studies add column if not exists word_count integer not null default 0;
update public.studies set word_count = case when btrim(content)='' then 0 else array_length(regexp_split_to_array(btrim(content),'\s+'),1) end;
create or replace function public.set_study_word_count() returns trigger language plpgsql as $$
begin
  new.word_count := case when btrim(new.content)='' then 0 else array_length(regexp_split_to_array(btrim(new.content),'\s+'),1) end;
  return new;
end; $$;
drop trigger if exists trg_studies_word_count on public.studies;
create trigger trg_studies_word_count before insert or update of content on public.studies
  for each row execute function public.set_study_word_count();

create table if not exists public.content_categories (
  content_type text not null check (content_type in ('song', 'study')),
  name text not null check (name = lower(name) and name ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  color text not null default '#0B4AA6',
  icon text not null default 'folder-outline',
  description text not null default '',
  sort_order integer not null default 100,
  revision bigint not null default nextval('public.content_revision_seq'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (content_type, name)
);

create index if not exists idx_content_categories_order
  on public.content_categories(content_type, sort_order, display_name);
create index if not exists idx_content_categories_revision
  on public.content_categories(revision);

create or replace function public.normalize_content_category_key(value text)
returns text language sql immutable parallel safe as $$
  select coalesce(
    nullif(left(trim(both '_-' from lower(regexp_replace(coalesce(value,''),'[^a-zA-Z0-9_-]+','_','g'))),80),''),
    'category_' || substr(md5(coalesce(value,'')),1,12)
  )
$$;

drop trigger if exists trg_content_categories_updated on public.content_categories;
create trigger trg_content_categories_updated before update on public.content_categories
  for each row execute function public.set_updated_at();
drop trigger if exists trg_content_categories_revision on public.content_categories;
create trigger trg_content_categories_revision before insert or update on public.content_categories
  for each row execute function public.set_content_revision();

insert into public.content_categories
  (content_type,name,display_name,color,icon,description,sort_order)
select 'study', public.normalize_content_category_key(name),
       coalesce(nullif(btrim(display_name),''),name), color, icon, coalesce(description,''), sort_order
from public.study_categories
on conflict (content_type,name) do update set
  display_name=excluded.display_name,color=excluded.color,icon=excluded.icon,
  description=excluded.description,sort_order=excluded.sort_order;

insert into public.content_categories(content_type,name,display_name,color,icon,sort_order)
values ('song','hymn','Hymns','#0B4AA6','musical-notes-outline',10)
on conflict (content_type,name) do nothing;

-- Preserve every existing free-text value by registering it before normalization.
insert into public.content_categories(content_type,name,display_name,color,icon,sort_order)
select 'study', public.normalize_content_category_key(category), btrim(category),
       '#0B4AA6','book-outline',100
from public.studies where btrim(category) <> ''
on conflict (content_type,name) do nothing;

update public.studies
set category = public.normalize_content_category_key(category)
where btrim(category) <> '';

create or replace function public.guard_content_category_usage()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.content_type='song' and exists(select 1 from songs where category=old.name and not deleted) then
    raise exception 'Category is used by one or more songs';
  end if;
  if old.content_type='study' and exists(select 1 from studies where category=old.name and not deleted) then
    raise exception 'Category is used by one or more studies';
  end if;
  return old;
end; $$;

drop trigger if exists trg_content_categories_restrict_delete on public.content_categories;
create trigger trg_content_categories_restrict_delete before delete on public.content_categories
  for each row execute function public.guard_content_category_usage();

create or replace function public.validate_content_category_assignment()
returns trigger language plpgsql set search_path=public as $$
declare category_type text := case tg_table_name when 'songs' then 'song' else 'study' end;
begin
  if not exists(select 1 from content_categories where content_type=category_type and name=new.category) then
    raise exception 'Unknown % category: %', category_type, new.category;
  end if;
  return new;
end; $$;

drop trigger if exists trg_songs_validate_category on public.songs;
create trigger trg_songs_validate_category before insert or update of category on public.songs
  for each row execute function public.validate_content_category_assignment();
drop trigger if exists trg_studies_validate_category on public.studies;
create trigger trg_studies_validate_category before insert or update of category on public.studies
  for each row execute function public.validate_content_category_assignment();

alter table public.content_categories enable row level security;
drop policy if exists content_categories_public_read on public.content_categories;
create policy content_categories_public_read on public.content_categories for select using(true);
drop policy if exists content_categories_admin_all on public.content_categories;
create policy content_categories_admin_all on public.content_categories for all
  using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));

grant select on table public.content_categories to anon, authenticated;
grant insert, update, delete on table public.content_categories to authenticated;
grant select, insert, update, delete on table public.content_categories to service_role;
grant usage, select on sequence public.content_revision_seq to authenticated, service_role;

commit;

-- Rollback note: drop validation triggers/table and songs.category only after reverting clients.
