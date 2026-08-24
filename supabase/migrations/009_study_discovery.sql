-- Advent Pro migration 009: study reading signals and discovery ranking.
-- Rollback: drop get_study_discovery, record_study_view, then study_views.

create table if not exists public.study_views (
  id bigint generated always as identity primary key,
  study_id text not null references public.studies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  session_id text not null check (char_length(session_id) between 8 and 128),
  created_at timestamptz not null default now()
);
create index if not exists idx_study_views_study_created on public.study_views(study_id, created_at desc);
create index if not exists idx_study_views_user_created on public.study_views(user_id, created_at desc);
alter table public.study_views enable row level security;

create or replace function public.record_study_view(p_study_id text, p_session_id text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if char_length(coalesce(p_session_id,'')) not between 8 and 128 then raise exception 'Invalid session'; end if;
  if not exists(select 1 from studies where id=p_study_id and is_published and not deleted) then raise exception 'Study not found'; end if;
  if not exists(
    select 1 from study_views where study_id=p_study_id and created_at > now()-interval '6 hours'
      and ((auth.uid() is not null and user_id=auth.uid()) or (auth.uid() is null and session_id=p_session_id))
  ) then insert into study_views(study_id,user_id,session_id) values(p_study_id,auth.uid(),p_session_id); end if;
end; $$;

create or replace function public.get_study_discovery(p_mode text default 'popular', p_limit integer default 12)
returns table(id text, score numeric) language sql stable security definer set search_path=public as $$
  with affinity as (
    select s.category, count(*)::numeric as weight
    from study_likes l join studies s on s.id=l.study_id
    where auth.uid() is not null and l.user_id=auth.uid()
    group by s.category
  ), ranked as (
    select s.id,
      (case when s.is_featured then 8 else 0 end
       + coalesce((select count(*) from study_likes l where l.study_id=s.id),0)*4
       + coalesce((select count(*) from study_comments c where c.study_id=s.id),0)*3
       + coalesce((select share_count from study_share_counts sh where sh.study_id=s.id),0)*2
       + coalesce((select count(*) from study_views v where v.study_id=s.id),0)
       + case when p_mode='for_you' then coalesce((select weight*6 from affinity a where a.category=s.category),0) else 0 end
       + greatest(0, 6 - extract(epoch from (now()-coalesce(s.published_at,s.created_at)))/86400/30)
      )::numeric as score
    from studies s where s.is_published and not s.deleted
  ) select ranked.id, ranked.score from ranked order by ranked.score desc, ranked.id limit least(greatest(p_limit,1),50);
$$;

revoke all on function public.record_study_view(text,text) from public;
revoke all on function public.get_study_discovery(text,integer) from public;
grant execute on function public.record_study_view(text,text) to anon,authenticated;
grant execute on function public.get_study_discovery(text,integer) to anon,authenticated;
