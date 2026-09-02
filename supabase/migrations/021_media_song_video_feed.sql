-- Advent Pro migration 021: bounded Song-video feed using the normalized Songs media category.
-- Media authors should choose media type Video and category Songs for videos that belong on this feed.

begin;

-- Remove the legacy six-argument version, if present.
drop function if exists public.get_media_feed(
  text, boolean, integer, timestamptz, uuid, integer
);

create or replace function public.get_media_feed(
  p_media_type text,
  p_before_featured boolean default null,
  p_before_sort integer default null,
  p_before_published timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 24,
  p_category text default null
)
returns setof public.media
language sql
stable
security definer
set search_path = public
as $$
  select m.*
  from public.media m
  where m.media_type = p_media_type
    and m.is_published
    and not m.deleted
    and (
      nullif(btrim(p_category), '') is null
      or lower(m.category) = lower(btrim(p_category))
    )
    and (
      p_before_published is null
      or m.is_featured < p_before_featured
      or (
        m.is_featured = p_before_featured
        and m.sort_order > p_before_sort
      )
      or (
        m.is_featured = p_before_featured
        and m.sort_order = p_before_sort
        and (m.published_at, m.id) < (p_before_published, p_before_id)
      )
    )
  order by
    m.is_featured desc,
    m.sort_order asc,
    m.published_at desc,
    m.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- Remove the legacy three-argument version, if present.
drop function if exists public.search_media(text, text, integer);

create or replace function public.search_media(
  p_media_type text,
  p_query text,
  p_limit integer default 50,
  p_category text default null
)
returns setof public.media
language sql
stable
security definer
set search_path = public
as $$
  select m.*
  from public.media m
  where m.media_type = p_media_type
    and m.is_published
    and not m.deleted
    and (
      nullif(btrim(p_category), '') is null
      or lower(m.category) = lower(btrim(p_category))
    )
    and (
      btrim(coalesce(p_query, '')) = ''
      or m.title ilike '%' || btrim(p_query) || '%'
      or m.category ilike '%' || btrim(p_query) || '%'
      or regexp_replace(m.description, '<[^>]*>', ' ', 'g')
        ilike '%' || btrim(p_query) || '%'
    )
  order by
    m.is_featured desc,
    m.sort_order asc,
    m.published_at desc,
    m.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create index if not exists idx_media_published_category_feed
  on public.media (
    media_type,
    lower(category),
    is_featured desc,
    sort_order asc,
    published_at desc,
    id desc
  )
  where is_published and not deleted;

revoke all on function public.get_media_feed(
  text, boolean, integer, timestamptz, uuid, integer, text
) from public;

revoke all on function public.search_media(
  text, text, integer, text
) from public;

grant execute on function public.get_media_feed(
  text, boolean, integer, timestamptz, uuid, integer, text
) to anon, authenticated;

grant execute on function public.search_media(
  text, text, integer, text
) to anon, authenticated;

commit;