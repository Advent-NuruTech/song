-- Advent Pro migration 010: rich media descriptions, Cloudinary thumbnail metadata,
-- normalized reusable categories, and public media search.
-- Rollback requires restoring the old description limit before re-adding its check.

begin;

alter table public.media drop constraint if exists media_description_check;

alter table public.media
  add column if not exists thumbnail_public_id text,
  add column if not exists thumbnail_width integer check (thumbnail_width is null or thumbnail_width > 0),
  add column if not exists thumbnail_height integer check (thumbnail_height is null or thumbnail_height > 0),
  add column if not exists thumbnail_bytes bigint check (thumbnail_bytes is null or thumbnail_bytes >= 0),
  add column if not exists thumbnail_format text;

create or replace function public.normalize_media_category(value text)
returns text language sql immutable parallel safe as $$
  select case
    when normalized = '' then ''
    else upper(left(normalized, 1)) || substr(normalized, 2)
  end
  from (select lower(regexp_replace(btrim(coalesce(value, '')), '\s+', ' ', 'g')) as normalized) source;
$$;

create or replace function public.set_normalized_media_category()
returns trigger language plpgsql set search_path=public as $$
begin
  new.category := public.normalize_media_category(new.category);
  return new;
end;
$$;

update public.media set category = public.normalize_media_category(category)
where category is distinct from public.normalize_media_category(category);

drop trigger if exists trg_media_normalize_category on public.media;
create trigger trg_media_normalize_category
  before insert or update of category on public.media
  for each row execute function public.set_normalized_media_category();

create index if not exists idx_media_category_normalized
  on public.media (lower(category)) where deleted = false;

create or replace function public.search_media(
  p_media_type text,
  p_query text,
  p_limit integer default 50
)
returns setof public.media language sql stable security definer set search_path=public as $$
  select m.*
  from public.media m
  where m.media_type = p_media_type
    and m.is_published
    and not m.deleted
    and (
      btrim(coalesce(p_query, '')) = ''
      or m.title ilike '%' || btrim(p_query) || '%'
      or m.category ilike '%' || btrim(p_query) || '%'
      or regexp_replace(m.description, '<[^>]*>', ' ', 'g') ilike '%' || btrim(p_query) || '%'
    )
  order by m.is_featured desc, m.sort_order asc, m.published_at desc, m.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.search_media(text,text,integer) from public;
grant execute on function public.search_media(text,text,integer) to anon, authenticated;

commit;
