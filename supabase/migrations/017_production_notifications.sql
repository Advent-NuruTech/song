-- Advent Pro migration 017: durable, preference-aware notifications.
-- Push tokens are private, notification creation is server-only, and every
-- user-facing push has a durable inbox record and an idempotency key.

begin;

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  master_enabled boolean not null default true,
  daily_verse boolean not null default true,
  new_content boolean not null default true,
  replies boolean not null default true,
  engagement_digest boolean not null default true,
  donations boolean not null default true,
  app_updates boolean not null default true,
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 80),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  installation_id text not null check (char_length(installation_id) between 16 and 128),
  expo_push_token text not null unique
    check (expo_push_token ~ '^Expo(nent)?PushToken\\[[A-Za-z0-9_-]+\\]$'),
  native_push_token text,
  platform text not null check (platform in ('android', 'ios')),
  app_version text not null default '' check (char_length(app_version) <= 40),
  locale text not null default '' check (char_length(locale) <= 40),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, installation_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  kind text not null check (kind in (
    'daily_verse', 'new_content', 'reply', 'engagement_digest',
    'donation_receipt', 'app_update', 'system'
  )),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  route text not null default '/notifications'
    check (route ~ '^/' and route !~ '[[:space:][:cntrl:]]' and char_length(route) <= 500),
  data jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique check (char_length(dedupe_key) between 8 and 200),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  push_dispatched_at timestamptz,
  check (jsonb_typeof(data) = 'object'),
  check (expires_at is null or expires_at > created_at)
);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create table if not exists public.notification_delivery_attempts (
  id bigint generated always as identity primary key,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  push_device_id uuid not null references public.push_devices(id) on delete cascade,
  expo_ticket_id text,
  status text not null check (status in ('accepted', 'error', 'delivered', 'failed')),
  error_code text,
  attempted_at timestamptz not null default now(),
  checked_at timestamptz,
  unique (notification_id, push_device_id)
);

create table if not exists public.app_releases (
  version_code integer primary key check (version_code > 0),
  version_name text not null check (char_length(version_name) between 1 and 40),
  store_url text not null default 'https://play.google.com/store/apps/details?id=com.adventpro'
    check (store_url ~ '^https://play\\.google\\.com/'),
  release_notes text not null default '' check (char_length(release_notes) <= 1000),
  minimum_supported_code integer not null default 1 check (minimum_supported_code > 0),
  is_live_in_store boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  check (minimum_supported_code <= version_code),
  check (not is_live_in_store or published_at is not null)
);

create index if not exists idx_notifications_inbox
  on public.notifications(recipient_user_id, created_at desc);
create index if not exists idx_notifications_broadcast
  on public.notifications(created_at desc) where recipient_user_id is null;
create index if not exists idx_push_devices_user_enabled
  on public.push_devices(user_id, enabled) where enabled;
create index if not exists idx_delivery_receipts_pending
  on public.notification_delivery_attempts(attempted_at)
  where status = 'accepted' and checked_at is null;

alter table public.notification_preferences enable row level security;
alter table public.push_devices enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.notification_delivery_attempts enable row level security;
alter table public.app_releases enable row level security;

create policy notification_preferences_owner_all on public.notification_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_devices_owner_all on public.push_devices
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_recipient_read on public.notifications
  for select to authenticated using (
    (recipient_user_id is null or recipient_user_id = auth.uid())
    and (expires_at is null or expires_at > now())
  );
create policy notification_reads_owner_all on public.notification_reads
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy app_releases_public_live_read on public.app_releases
  for select to anon, authenticated using (is_live_in_store and published_at <= now());

grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.push_devices to authenticated;
grant select on public.notifications to authenticated;
grant select, insert, update, delete on public.notification_reads to authenticated;
grant select on public.app_releases to anon, authenticated;

create or replace function public.register_push_device(
  p_installation_id text,
  p_expo_push_token text,
  p_native_push_token text,
  p_platform text,
  p_app_version text,
  p_locale text
) returns uuid language plpgsql security definer set search_path=public as $$
declare device_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(p_installation_id) not between 16 and 128
     or p_expo_push_token !~ '^Expo(nent)?PushToken\\[[A-Za-z0-9_-]+\\]$'
     or p_platform not in ('android', 'ios') then
    raise exception 'Invalid push device registration';
  end if;
  -- A physical installation can belong to only the currently signed-in account.
  delete from push_devices
    where (installation_id = p_installation_id or expo_push_token = p_expo_push_token)
      and user_id <> auth.uid();
  insert into push_devices(
    user_id, installation_id, expo_push_token, native_push_token,
    platform, app_version, locale, enabled, last_seen_at
  ) values (
    auth.uid(), p_installation_id, p_expo_push_token, left(p_native_push_token, 4096),
    p_platform, left(coalesce(p_app_version, ''), 40), left(coalesce(p_locale, ''), 40), true, now()
  )
  on conflict(user_id, installation_id) do update set
    expo_push_token = excluded.expo_push_token,
    native_push_token = excluded.native_push_token,
    platform = excluded.platform,
    app_version = excluded.app_version,
    locale = excluded.locale,
    enabled = true,
    last_seen_at = now()
  returning id into device_id;
  insert into notification_preferences(user_id) values(auth.uid()) on conflict do nothing;
  return device_id;
end; $$;

create or replace function public.disable_push_device(p_installation_id text)
returns void language sql security definer set search_path=public as $$
  update push_devices set enabled=false, last_seen_at=now()
  where user_id=auth.uid() and installation_id=p_installation_id;
$$;

-- Publishing a resource creates one broadcast digest at most per UTC day.
-- More items published that day are intentionally aggregated behind the same
-- inbox event instead of creating a noisy push per item.
create or replace function public.enqueue_new_media_notification()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.is_published and not new.deleted
     and (tg_op = 'INSERT' or (tg_op = 'UPDATE' and not old.is_published)) then
    insert into notifications(kind,title,body,route,data,dedupe_key,expires_at)
    values (
      'new_content',
      'Fresh resources are ready',
      left('A new ' || case when new.media_type='video' then 'video' else 'short video' end ||
        ' is available: ' || new.title, 500),
      '/media/' || new.id::text,
      jsonb_build_object('contentType',new.media_type,'contentId',new.id),
      'new-content:' || to_char(now() at time zone 'UTC','YYYY-MM-DD'),
      now() + interval '30 days'
    ) on conflict(dedupe_key) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists trg_media_enqueue_notification on public.media;
create trigger trg_media_enqueue_notification after insert or update of is_published on public.media
  for each row execute function public.enqueue_new_media_notification();

create or replace function public.enqueue_new_study_notification()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.is_published and not new.deleted
     and (tg_op = 'INSERT' or (tg_op = 'UPDATE' and not old.is_published)) then
    insert into notifications(kind,title,body,route,data,dedupe_key,expires_at)
    values (
      'new_content',
      'Fresh resources are ready',
      left('A new Bible study is available: ' || new.title, 500),
      '/studies/' || new.id,
      jsonb_build_object('contentType','study','contentId',new.id),
      'new-content:' || to_char(now() at time zone 'UTC','YYYY-MM-DD'),
      now() + interval '30 days'
    ) on conflict(dedupe_key) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists trg_studies_enqueue_notification on public.studies;
create trigger trg_studies_enqueue_notification after insert or update of is_published on public.studies
  for each row execute function public.enqueue_new_study_notification();

-- Only a release explicitly confirmed as live in Google Play can announce
-- itself. This prevents users being sent to a listing before rollout is live.
create or replace function public.enqueue_app_release_notification()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.is_live_in_store and new.published_at <= now()
     and (tg_op = 'INSERT' or (tg_op = 'UPDATE' and not old.is_live_in_store)) then
    insert into notifications(kind,title,body,route,data,dedupe_key,expires_at)
    values (
      'app_update',
      'Advent Pro ' || new.version_name || ' is available',
      left(coalesce(nullif(btrim(new.release_notes),''), 'Update now for the newest improvements and fixes.'), 500),
      '/about',
      jsonb_build_object('versionCode',new.version_code,'versionName',new.version_name,'storeUrl',new.store_url),
      'app-update:' || new.version_code::text,
      now() + interval '90 days'
    ) on conflict(dedupe_key) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists trg_app_releases_enqueue_notification on public.app_releases;
create trigger trg_app_releases_enqueue_notification after insert or update of is_live_in_store on public.app_releases
  for each row execute function public.enqueue_app_release_notification();

-- Replies are individual, high-priority events. This replaces the original
-- two-argument RPC with a backward-compatible optional parent ID.
drop function if exists public.add_media_comment(uuid,text);
create or replace function public.add_media_comment(
  p_media_id uuid,
  p_content text,
  p_parent_id uuid default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare clean text; new_id uuid; parent_owner uuid; author_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  clean := btrim(regexp_replace(coalesce(p_content,''), '<[^>]*>', '', 'g'));
  if char_length(clean) not between 1 and 1000 then raise exception 'Comment must be between 1 and 1000 characters'; end if;
  if regexp_count(lower(clean), 'https?://') > 2 or clean ~ '(.)\1{11,}' then raise exception 'Comment looks like spam'; end if;
  if not exists(select 1 from media where id=p_media_id and is_published and not deleted) then raise exception 'Media not found'; end if;
  if (select count(*) from media_comments where user_id=auth.uid() and created_at > now()-interval '1 minute') >= 3 then
    raise exception 'Please wait before posting another comment';
  end if;
  if p_parent_id is not null then
    select user_id into parent_owner from media_comments
      where id=p_parent_id and media_id=p_media_id and status='visible';
    if not found then raise exception 'Reply target not found'; end if;
  end if;
  insert into media_comments(media_id,user_id,content,parent_id)
    values(p_media_id,auth.uid(),clean,p_parent_id) returning id into new_id;
  perform set_config('advent.internal_counter_update', 'on', true);
  update media set comment_count=comment_count+1 where id=p_media_id;
  if parent_owner is not null and parent_owner <> auth.uid() then
    select coalesce(nullif(btrim(display_name),''),'Someone') into author_name from profiles where id=auth.uid();
    insert into notifications(recipient_user_id,kind,title,body,route,data,dedupe_key,expires_at)
    values(
      parent_owner,
      'reply',
      'New reply to your comment',
      left(author_name || ' replied: “' || clean || '”',500),
      '/media/' || p_media_id::text,
      jsonb_build_object('contentType','media','contentId',p_media_id,'commentId',new_id,'parentCommentId',p_parent_id),
      'reply:' || new_id::text,
      now() + interval '90 days'
    );
  end if;
  return new_id;
end; $$;
revoke all on function public.add_media_comment(uuid,text,uuid) from public;
grant execute on function public.add_media_comment(uuid,text,uuid) to authenticated;

create or replace function public.get_unread_notification_count()
returns integer language sql stable security definer set search_path=public as $$
  select count(*)::integer
  from notifications n
  where (n.recipient_user_id is null or n.recipient_user_id = auth.uid())
    and (n.expires_at is null or n.expires_at > now())
    and not exists (
      select 1 from notification_reads r
      where r.notification_id = n.id and r.user_id = auth.uid()
    );
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from notifications
    where id = p_notification_id
      and (recipient_user_id is null or recipient_user_id = auth.uid())
      and (expires_at is null or expires_at > now())
  ) then raise exception 'Notification not found'; end if;
  insert into notification_reads(notification_id, user_id)
    values (p_notification_id, auth.uid()) on conflict do nothing;
end; $$;

create or replace function public.mark_all_notifications_read()
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into notification_reads(notification_id, user_id)
  select id, auth.uid() from notifications
  where (recipient_user_id is null or recipient_user_id = auth.uid())
    and (expires_at is null or expires_at > now())
  on conflict do nothing;
end; $$;

revoke all on function public.get_unread_notification_count() from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.register_push_device(text,text,text,text,text,text) from public;
revoke all on function public.disable_push_device(text) from public;
grant execute on function public.get_unread_notification_count() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.register_push_device(text,text,text,text,text,text) to authenticated;
grant execute on function public.disable_push_device(text) to authenticated;

commit;
