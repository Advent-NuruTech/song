-- Advent Pro migration 008: Media catalogue, engagement, moderation, and analytics.
-- Additive migration. It intentionally keeps YouTube as a playback source while
-- Advent Pro owns discovery and engagement data.

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'youtube' check (source_type in ('youtube', 'hosted')),
  youtube_video_id text,
  youtube_url text,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 5000),
  media_type text not null check (media_type in ('video', 'short')),
  category text not null default '' check (char_length(category) <= 100),
  thumbnail_url text not null,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  view_count bigint not null default 0 check (view_count >= 0),
  like_count bigint not null default 0 check (like_count >= 0),
  comment_count bigint not null default 0 check (comment_count >= 0),
  is_published boolean not null default false,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  deleted boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (youtube_video_id, media_type),
  check (source_type <> 'youtube' or (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$' and youtube_url ~* '^https?://')),
  check (not is_published or published_at is not null)
);

create table if not exists public.media_likes (
  media_id uuid not null references public.media(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (media_id, user_id)
);

create table if not exists public.media_comments (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  parent_id uuid references public.media_comments(id) on delete set null,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.media_comments(id) on delete cascade,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null default 'other' check (reason in ('spam', 'abuse', 'misinformation', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (comment_id, reported_by)
);

create table if not exists public.media_views (
  id bigint generated always as identity primary key,
  media_id uuid not null references public.media(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  session_id text not null check (char_length(session_id) between 8 and 128),
  watch_seconds integer not null check (watch_seconds between 1 and 86400),
  created_at timestamptz not null default now()
);

create index if not exists idx_media_published_feed
  on public.media(media_type, published_at desc, id desc)
  where is_published = true and deleted = false;
create index if not exists idx_media_admin_updated on public.media(updated_at desc);
create index if not exists idx_media_comments_feed
  on public.media_comments(media_id, created_at desc, id desc)
  where status = 'visible';
create index if not exists idx_media_comment_reports_open
  on public.media_comment_reports(created_at desc) where status = 'open';
create index if not exists idx_media_views_dedupe
  on public.media_views(media_id, user_id, session_id, created_at desc);

create or replace function public.set_media_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin
  -- Engagement writes should not make old catalogue entries look newly edited.
  if (to_jsonb(new) - array['view_count','like_count','comment_count','updated_at'])
      is distinct from
     (to_jsonb(old) - array['view_count','like_count','comment_count','updated_at']) then
    new.updated_at := now();
  else new.updated_at := old.updated_at;
  end if;
  return new;
end; $$;

drop trigger if exists trg_media_updated on public.media;
create trigger trg_media_updated before update on public.media
  for each row execute function public.set_media_updated_at();
drop trigger if exists trg_media_comments_updated on public.media_comments;
create trigger trg_media_comments_updated before update on public.media_comments
  for each row execute function public.set_updated_at();

-- Engagement counters are never accepted from a client. Only the functions
-- below set a transaction-local guard before changing them.
create or replace function public.protect_media_counters()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op = 'INSERT' then
    new.view_count := 0; new.like_count := 0; new.comment_count := 0;
  elsif (new.view_count, new.like_count, new.comment_count) is distinct from
        (old.view_count, old.like_count, old.comment_count)
        and coalesce(current_setting('advent.internal_counter_update', true), '') <> 'on' then
    raise exception 'Media engagement counters are server-managed';
  end if;
  return new;
end; $$;

drop trigger if exists trg_media_protect_counters on public.media;
create trigger trg_media_protect_counters before insert or update on public.media
  for each row execute function public.protect_media_counters();

alter table public.media enable row level security;
alter table public.media_likes enable row level security;
alter table public.media_comments enable row level security;
alter table public.media_comment_reports enable row level security;
alter table public.media_views enable row level security;

drop policy if exists media_public_read on public.media;
create policy media_public_read on public.media for select to anon, authenticated
  using ((is_published and not deleted) or public.has_permission('media.manage'));
drop policy if exists media_manager_insert on public.media;
create policy media_manager_insert on public.media for insert to authenticated
  with check (public.has_permission('media.manage'));
drop policy if exists media_manager_update on public.media;
create policy media_manager_update on public.media for update to authenticated
  using (public.has_permission('media.manage')) with check (public.has_permission('media.manage'));
drop policy if exists media_manager_delete on public.media;
create policy media_manager_delete on public.media for delete to authenticated
  using (public.has_permission('media.manage'));

drop policy if exists media_comments_owner_or_moderator_read on public.media_comments;
create policy media_comments_owner_or_moderator_read on public.media_comments for select to authenticated
  using (user_id = auth.uid() or public.has_permission('content.moderate') or public.has_permission('media.manage'));
drop policy if exists media_reports_owner_or_moderator_read on public.media_comment_reports;
create policy media_reports_owner_or_moderator_read on public.media_comment_reports for select to authenticated
  using (reported_by = auth.uid() or public.has_permission('content.moderate') or public.has_permission('media.manage'));
drop policy if exists media_reports_moderator_update on public.media_comment_reports;
create policy media_reports_moderator_update on public.media_comment_reports for update to authenticated
  using (public.has_permission('content.moderate') or public.has_permission('media.manage'))
  with check (public.has_permission('content.moderate') or public.has_permission('media.manage'));
drop policy if exists media_comments_moderator_update on public.media_comments;
create policy media_comments_moderator_update on public.media_comments for update to authenticated
  using (public.has_permission('content.moderate') or public.has_permission('media.manage'))
  with check (public.has_permission('content.moderate') or public.has_permission('media.manage'));

grant select on table public.media to anon, authenticated;
grant insert, update, delete on table public.media to authenticated;
grant select, update on table public.media_comments, public.media_comment_reports to authenticated;
grant usage, select on sequence public.media_views_id_seq to authenticated;

create or replace function public.toggle_media_like(p_media_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare now_liked boolean; total bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from media where id=p_media_id and is_published and not deleted) then
    raise exception 'Media not found';
  end if;
  perform set_config('advent.internal_counter_update', 'on', true);
  if exists(select 1 from media_likes where media_id=p_media_id and user_id=auth.uid()) then
    delete from media_likes where media_id=p_media_id and user_id=auth.uid();
    update media set like_count=greatest(0, like_count-1) where id=p_media_id returning like_count into total;
    now_liked := false;
  else
    insert into media_likes(media_id,user_id) values(p_media_id,auth.uid()) on conflict do nothing;
    if found then update media set like_count=like_count+1 where id=p_media_id returning like_count into total;
    else select like_count into total from media where id=p_media_id; end if;
    now_liked := true;
  end if;
  return jsonb_build_object('liked',now_liked,'likeCount',total);
end; $$;

create or replace function public.add_media_comment(p_media_id uuid, p_content text)
returns uuid language plpgsql security definer set search_path=public as $$
declare clean text; new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  clean := btrim(regexp_replace(coalesce(p_content,''), '<[^>]*>', '', 'g'));
  if char_length(clean) not between 1 and 1000 then raise exception 'Comment must be between 1 and 1000 characters'; end if;
  if regexp_count(lower(clean), 'https?://') > 2 or clean ~ '(.)\1{11,}' then raise exception 'Comment looks like spam'; end if;
  if not exists(select 1 from media where id=p_media_id and is_published and not deleted) then raise exception 'Media not found'; end if;
  if (select count(*) from media_comments where user_id=auth.uid() and created_at > now()-interval '1 minute') >= 3 then
    raise exception 'Please wait before posting another comment';
  end if;
  insert into media_comments(media_id,user_id,content) values(p_media_id,auth.uid(),clean) returning id into new_id;
  perform set_config('advent.internal_counter_update', 'on', true);
  update media set comment_count=comment_count+1 where id=p_media_id;
  return new_id;
end; $$;

create or replace function public.delete_media_comment(p_comment_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare target_media uuid; previous_status text;
begin
  select media_id,status into target_media,previous_status from media_comments
    where id=p_comment_id and (user_id=auth.uid() or has_permission('content.moderate') or has_permission('media.manage')) for update;
  if not found then raise exception 'Comment not found or not authorized'; end if;
  if previous_status='visible' then
    update media_comments set content='[deleted]',status='deleted' where id=p_comment_id;
    perform set_config('advent.internal_counter_update', 'on', true);
    update media set comment_count=greatest(0,comment_count-1) where id=target_media;
  end if;
end; $$;

create or replace function public.report_media_comment(p_comment_id uuid, p_reason text default 'other', p_details text default '')
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid; safe_reason text; safe_details text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  safe_reason := case when p_reason in ('spam','abuse','misinformation','other') then p_reason else 'other' end;
  safe_details := left(btrim(regexp_replace(coalesce(p_details,''), '<[^>]*>', '', 'g')),500);
  if not exists(select 1 from media_comments where id=p_comment_id and status='visible') then raise exception 'Comment not found'; end if;
  insert into media_comment_reports(comment_id,reported_by,reason,details)
    values(p_comment_id,auth.uid(),safe_reason,safe_details)
    on conflict(comment_id,reported_by) do update set reason=excluded.reason,details=excluded.details
    returning id into new_id;
  return new_id;
end; $$;

create or replace function public.get_media_comments(p_media_id uuid, p_before timestamptz default null, p_limit integer default 20)
returns table(id uuid, user_id uuid, author_name text, content text, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path=public as $$
  select c.id,c.user_id,coalesce(nullif(btrim(p.display_name),''),'Advent Pro viewer'),c.content,c.created_at,c.updated_at
  from media_comments c join profiles p on p.id=c.user_id
  where c.media_id=p_media_id and c.status='visible' and (p_before is null or c.created_at < p_before)
    and exists(select 1 from media m where m.id=p_media_id and m.is_published and not m.deleted)
  order by c.created_at desc,c.id desc limit least(greatest(p_limit,1),50);
$$;

create or replace function public.get_media_feed(
  p_media_type text,
  p_before_featured boolean default null,
  p_before_sort integer default null,
  p_before_published timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 24
)
returns setof public.media language sql stable security definer set search_path=public as $$
  select m.* from media m
  where m.media_type=p_media_type and m.is_published and not m.deleted
    and (p_before_published is null or
      m.is_featured < p_before_featured or
      (m.is_featured=p_before_featured and m.sort_order > p_before_sort) or
      (m.is_featured=p_before_featured and m.sort_order=p_before_sort and (m.published_at,m.id) < (p_before_published,p_before_id)))
  order by m.is_featured desc,m.sort_order asc,m.published_at desc,m.id desc
  limit least(greatest(p_limit,1),50);
$$;

create or replace function public.get_media_viewer_state(p_media_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('likedByMe',case when auth.uid() is null then false else exists(
    select 1 from media_likes where media_id=p_media_id and user_id=auth.uid()) end);
$$;

create or replace function public.get_media_moderation_queue(p_status text default null, p_limit integer default 100)
returns table(id uuid, media_id uuid, media_title text, author_name text, content text, status text, report_count bigint, created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if not (has_permission('content.moderate') or has_permission('media.manage')) then raise exception 'Not authorized'; end if;
  return query select c.id,c.media_id,m.title,coalesce(nullif(btrim(p.display_name),''),'Advent Pro viewer'),c.content,c.status,
    (select count(*) from media_comment_reports r where r.comment_id=c.id and r.status='open'),c.created_at
    from media_comments c join media m on m.id=c.media_id join profiles p on p.id=c.user_id
    where p_status is null or c.status=p_status order by
      (select count(*) from media_comment_reports r where r.comment_id=c.id and r.status='open') desc,c.created_at desc
    limit least(greatest(p_limit,1),200);
end; $$;

create or replace function public.moderate_media_comment(p_comment_id uuid, p_action text)
returns void language plpgsql security definer set search_path=public as $$
declare target_media uuid; old_status text; new_status text;
begin
  if not (has_permission('content.moderate') or has_permission('media.manage')) then raise exception 'Not authorized'; end if;
  new_status := case when p_action in ('visible','hidden','deleted') then p_action else null end;
  if new_status is null then raise exception 'Invalid moderation action'; end if;
  select media_id,status into target_media,old_status from media_comments where id=p_comment_id for update;
  if not found then raise exception 'Comment not found'; end if;
  update media_comments set status=new_status,content=case when new_status='deleted' then '[deleted]' else content end where id=p_comment_id;
  if old_status is distinct from new_status then
    perform set_config('advent.internal_counter_update', 'on', true);
    update media set comment_count=greatest(0,comment_count + case when old_status='visible' then -1 when new_status='visible' then 1 else 0 end) where id=target_media;
  end if;
  update media_comment_reports set status='reviewed' where comment_id=p_comment_id and status='open';
end; $$;

create or replace function public.record_media_view(p_media_id uuid, p_session_id text, p_watch_seconds integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare threshold integer; total bigint; was_counted boolean := false;
begin
  if char_length(coalesce(p_session_id,'')) not between 8 and 128 then raise exception 'Invalid session'; end if;
  select case when media_type='short' then 3 else 5 end into threshold
    from media where id=p_media_id and is_published and not deleted;
  if not found then raise exception 'Media not found'; end if;
  if p_watch_seconds < threshold or p_watch_seconds > 86400 then
    select view_count into total from media where id=p_media_id;
    return jsonb_build_object('counted',false,'viewCount',total);
  end if;
  if not exists(
    select 1 from media_views where media_id=p_media_id and created_at > now()-interval '6 hours'
      and ((auth.uid() is not null and user_id=auth.uid()) or (auth.uid() is null and session_id=p_session_id))
  ) then
    insert into media_views(media_id,user_id,session_id,watch_seconds) values(p_media_id,auth.uid(),p_session_id,p_watch_seconds);
    perform set_config('advent.internal_counter_update', 'on', true);
    update media set view_count=view_count+1 where id=p_media_id returning view_count into total;
    was_counted := true;
  else select view_count into total from media where id=p_media_id; end if;
  return jsonb_build_object('counted',was_counted,'viewCount',total);
end; $$;

revoke all on function public.toggle_media_like(uuid) from public;
revoke all on function public.add_media_comment(uuid,text) from public;
revoke all on function public.delete_media_comment(uuid) from public;
revoke all on function public.report_media_comment(uuid,text,text) from public;
revoke all on function public.get_media_comments(uuid,timestamptz,integer) from public;
revoke all on function public.get_media_feed(text,boolean,integer,timestamptz,uuid,integer) from public;
revoke all on function public.get_media_viewer_state(uuid) from public;
revoke all on function public.get_media_moderation_queue(text,integer) from public;
revoke all on function public.moderate_media_comment(uuid,text) from public;
revoke all on function public.record_media_view(uuid,text,integer) from public;
grant execute on function public.toggle_media_like(uuid) to authenticated;
grant execute on function public.add_media_comment(uuid,text) to authenticated;
grant execute on function public.delete_media_comment(uuid) to authenticated;
grant execute on function public.report_media_comment(uuid,text,text) to authenticated;
grant execute on function public.get_media_comments(uuid,timestamptz,integer) to anon,authenticated;
grant execute on function public.get_media_feed(text,boolean,integer,timestamptz,uuid,integer) to anon,authenticated;
grant execute on function public.get_media_viewer_state(uuid) to anon,authenticated;
grant execute on function public.get_media_moderation_queue(text,integer) to authenticated;
grant execute on function public.moderate_media_comment(uuid,text) to authenticated;
grant execute on function public.record_media_view(uuid,text,integer) to anon,authenticated;
