-- Advent Pro migration 004: production study comments, likes, and share totals.
-- This migration is additive. Rollback by dropping the functions and tables below.

create table if not exists public.study_comments (
  id uuid primary key default gen_random_uuid(),
  study_id text not null references public.studies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_likes (
  study_id text not null references public.studies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (study_id, user_id)
);

create table if not exists public.study_share_counts (
  study_id text primary key references public.studies(id) on delete cascade,
  share_count bigint not null default 0 check (share_count >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists idx_study_comments_study_created
  on public.study_comments(study_id, created_at desc);
create index if not exists idx_study_likes_study on public.study_likes(study_id);

drop trigger if exists trg_study_comments_updated on public.study_comments;
create trigger trg_study_comments_updated before update on public.study_comments
  for each row execute function public.set_updated_at();

alter table public.study_comments enable row level security;
alter table public.study_likes enable row level security;
alter table public.study_share_counts enable row level security;

drop policy if exists study_comments_public_read on public.study_comments;
drop policy if exists study_comments_owner_read on public.study_comments;
create policy study_comments_owner_read on public.study_comments for select to authenticated
  using(user_id = auth.uid() or public.has_permission('content.moderate'));
drop policy if exists study_comments_owner_delete on public.study_comments;
create policy study_comments_owner_delete on public.study_comments for delete
  using(user_id = auth.uid() or public.has_permission('content.moderate'));

drop policy if exists study_likes_public_read on public.study_likes;

drop policy if exists study_share_counts_public_read on public.study_share_counts;

-- Returns engagement and safe public author fields without exposing profile emails.
create or replace function public.get_study_engagement(p_study_id text)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'likeCount', (select count(*) from study_likes where study_id = p_study_id),
    'shareCount', coalesce((select share_count from study_share_counts where study_id = p_study_id), 0),
    'commentCount', (select count(*) from study_comments where study_id = p_study_id),
    'likedByMe', case when auth.uid() is null then false else exists(
      select 1 from study_likes where study_id = p_study_id and user_id = auth.uid()
    ) end,
    'comments', coalesce((
      select jsonb_agg(item order by item_created_at desc)
      from (
        select jsonb_build_object(
          'id', c.id,
          'userId', c.user_id,
          'authorName', coalesce(nullif(btrim(p.display_name), ''), 'Advent Pro reader'),
          'body', c.body,
          'createdAt', c.created_at,
          'updatedAt', c.updated_at
        ) as item, c.created_at as item_created_at
        from study_comments c
        join profiles p on p.id = c.user_id
        where c.study_id = p_study_id
        order by c.created_at desc
        limit 50
      ) recent_comments
    ), '[]'::jsonb)
  );
$$;

create or replace function public.add_study_comment(p_study_id text, p_body text)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'Comment must be between 1 and 2000 characters';
  end if;
  if not exists(select 1 from studies where id=p_study_id and is_published=true and deleted=false) then
    raise exception 'Study not found';
  end if;
  insert into study_comments(study_id,user_id,body)
    values(p_study_id,auth.uid(),btrim(p_body)) returning id into new_id;
  return new_id;
end; $$;

create or replace function public.toggle_study_like(p_study_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare now_liked boolean;
declare total bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from studies where id=p_study_id and is_published=true and deleted=false) then
    raise exception 'Study not found';
  end if;
  if exists(select 1 from study_likes where study_id=p_study_id and user_id=auth.uid()) then
    delete from study_likes where study_id=p_study_id and user_id=auth.uid();
    now_liked := false;
  else
    insert into study_likes(study_id,user_id) values(p_study_id,auth.uid());
    now_liked := true;
  end if;
  select count(*) into total from study_likes where study_id=p_study_id;
  return jsonb_build_object('liked',now_liked,'likeCount',total);
end; $$;

create or replace function public.record_study_share(p_study_id text)
returns bigint language plpgsql security definer set search_path=public as $$
declare total bigint;
begin
  if not exists(select 1 from studies where id=p_study_id and is_published=true and deleted=false) then
    raise exception 'Study not found';
  end if;
  insert into study_share_counts(study_id,share_count,updated_at)
    values(p_study_id,1,now())
    on conflict(study_id) do update
      set share_count=study_share_counts.share_count+1, updated_at=now()
    returning share_count into total;
  return total;
end; $$;

revoke all on function public.get_study_engagement(text) from public;
revoke all on function public.add_study_comment(text,text) from public;
revoke all on function public.toggle_study_like(text) from public;
revoke all on function public.record_study_share(text) from public;
grant execute on function public.get_study_engagement(text) to anon, authenticated;
grant execute on function public.add_study_comment(text,text) to authenticated;
grant execute on function public.toggle_study_like(text) to authenticated;
grant execute on function public.record_study_share(text) to anon, authenticated;
