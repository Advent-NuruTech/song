-- Advent Pro migration 012: trustworthy, offline-first study collaboration.
-- All writes go through the functions below. Revisions and activity are immutable.

begin;

-- New studies remember the authenticated author without exposing their email.
-- Legacy/imported studies remain NULL and are treated as remixes when first saved.
alter table public.studies
  add column if not exists collaboration_owner_id uuid references public.profiles(id) on delete set null default auth.uid();

create table if not exists public.study_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  source_study_id text,
  published_study_id text unique references public.studies(id) on delete set null,
  current_revision_id uuid,
  published_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_project_members (
  project_id uuid not null references public.study_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','reviewer','contributor','reader')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.study_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.study_projects(id) on delete cascade,
  parent_revision_id uuid references public.study_revisions(id) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  kind text not null check (kind in ('accepted','proposal')),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  subtitle text not null default '' check (char_length(subtitle) <= 300),
  category text not null default 'Bible Study' check (char_length(category) between 1 and 80),
  content_html text not null check (char_length(content_html) between 1 and 1000000),
  plain_text text not null default '' check (char_length(plain_text) <= 1000000),
  summary text not null default '' check (char_length(summary) <= 500),
  created_at timestamptz not null default now(),
  unique (project_id, revision_number)
);

alter table public.study_projects
  drop constraint if exists study_projects_current_revision_fk;
alter table public.study_projects
  add constraint study_projects_current_revision_fk
  foreign key (current_revision_id) references public.study_revisions(id) on delete restrict;
alter table public.study_projects
  drop constraint if exists study_projects_published_revision_fk;
alter table public.study_projects
  add constraint study_projects_published_revision_fk
  foreign key (published_revision_id) references public.study_revisions(id) on delete restrict;

create table if not exists public.study_contributions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.study_projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  base_revision_id uuid not null references public.study_revisions(id) on delete restrict,
  proposed_revision_id uuid not null unique references public.study_revisions(id) on delete restrict,
  status text not null default 'submitted' check (status in ('submitted','accepted','changes_requested','declined','outdated')),
  message text not null default '' check (char_length(message) <= 500),
  review_message text not null default '' check (char_length(review_message) <= 500),
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_activity_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.study_projects(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('project_started','version_saved','contribution_sent','changes_requested','contribution_declined','contribution_accepted','published')),
  revision_id uuid references public.study_revisions(id) on delete restrict,
  contribution_id uuid references public.study_contributions(id) on delete restrict,
  detail text not null default '' check (char_length(detail) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_study_projects_owner on public.study_projects(owner_id, updated_at desc);
create index if not exists idx_study_revisions_project on public.study_revisions(project_id, revision_number desc);
create index if not exists idx_study_contributions_project on public.study_contributions(project_id, created_at desc);
create index if not exists idx_study_contributions_author on public.study_contributions(author_id, created_at desc);
create index if not exists idx_study_activity_project on public.study_activity_events(project_id, created_at desc);

drop trigger if exists trg_study_projects_updated on public.study_projects;
create trigger trg_study_projects_updated before update on public.study_projects
  for each row execute function public.set_updated_at();
drop trigger if exists trg_study_contributions_updated on public.study_contributions;
create trigger trg_study_contributions_updated before update on public.study_contributions
  for each row execute function public.set_updated_at();

alter table public.study_projects enable row level security;
alter table public.study_project_members enable row level security;
alter table public.study_revisions enable row level security;
alter table public.study_contributions enable row level security;
alter table public.study_activity_events enable row level security;

revoke all on public.study_projects, public.study_project_members, public.study_revisions,
  public.study_contributions, public.study_activity_events from anon, authenticated;

create or replace function public.assert_safe_study_content(p_content text)
returns void language plpgsql immutable set search_path=public as $$
begin
  if char_length(coalesce(p_content,'')) not between 1 and 1000000 then
    raise exception 'Study content is empty or too large';
  end if;
  if p_content ~* '<\s*(script|iframe|object|embed|form|input|button|textarea)\b'
     or p_content ~* 'javascript\s*:' or p_content ~* 'data\s*:\s*text/html' then
    raise exception 'Study content contains an unsafe element or link';
  end if;
end; $$;

create or replace function public.start_study_copy(
  p_source_study_id text,
  p_title text,
  p_subtitle text,
  p_category text,
  p_content_html text,
  p_plain_text text
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  project_row public.study_projects%rowtype;
  revision_row public.study_revisions%rowtype;
  source_owner uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to connect this study to the community'; end if;
  if char_length(btrim(coalesce(p_title,''))) not between 1 and 180 then raise exception 'A study title is required'; end if;
  perform assert_safe_study_content(p_content_html);

  select p.* into project_row from study_projects p
  where p.published_study_id=p_source_study_id limit 1;

  if project_row.id is null then
    select s.collaboration_owner_id into source_owner from studies s
      where s.id=p_source_study_id and s.is_published and not s.deleted;
    insert into study_projects(owner_id,source_study_id,published_study_id,published_revision_id)
      values(coalesce(source_owner,auth.uid()),nullif(p_source_study_id,''),
        case when source_owner is not null then p_source_study_id else null end,null)
      returning * into project_row;
    insert into study_project_members(project_id,user_id,role)
      values(project_row.id,project_row.owner_id,'owner');
    insert into study_revisions(project_id,author_id,revision_number,kind,title,subtitle,category,content_html,plain_text,summary)
      values(project_row.id,project_row.owner_id,1,'accepted',btrim(p_title),left(coalesce(p_subtitle,''),300),
        coalesce(nullif(btrim(p_category),''),'Bible Study'),p_content_html,left(coalesce(p_plain_text,''),1000000),'Saved from Advent Pro')
      returning * into revision_row;
    update study_projects set current_revision_id=revision_row.id,
      published_revision_id=case when source_owner is not null then revision_row.id else null end
      where id=project_row.id returning * into project_row;
    insert into study_activity_events(project_id,actor_id,action,revision_id,detail)
      values(project_row.id,project_row.owner_id,'project_started',revision_row.id,'Started a study project');
  else
    if project_row.current_revision_id is null then raise exception 'This study project has no current version'; end if;
    select * into revision_row from study_revisions where id=project_row.current_revision_id;
  end if;

  return jsonb_build_object(
    'projectId',project_row.id,'ownerId',project_row.owner_id,'isOwner',project_row.owner_id=auth.uid(),
    'revisionId',revision_row.id,'revisionNumber',revision_row.revision_number,
    'title',revision_row.title,'subtitle',revision_row.subtitle,'category',revision_row.category,
    'contentHtml',revision_row.content_html,'plainText',revision_row.plain_text,
    'publishedStudyId',project_row.published_study_id
  );
end; $$;

create or replace function public.get_my_study_projects()
returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(item order by item_updated_at desc),'[]'::jsonb)
  from (
    select jsonb_build_object(
      'projectId',p.id,'ownerId',p.owner_id,'isOwner',p.owner_id=auth.uid(),
      'title',r.title,'subtitle',r.subtitle,'category',r.category,
      'revisionId',r.id,'revisionNumber',r.revision_number,
      'publishedStudyId',p.published_study_id,'updatedAt',p.updated_at,
      'pendingReviews',(select count(*) from study_contributions c where c.project_id=p.id and c.status='submitted'),
      'myContributionStatus',(select c.status from study_contributions c where c.project_id=p.id and c.author_id=auth.uid() order by c.created_at desc limit 1)
    ) item, p.updated_at item_updated_at
    from study_projects p join study_revisions r on r.id=p.current_revision_id
    where auth.uid() is not null and (
      p.owner_id=auth.uid()
      or exists(select 1 from study_project_members m where m.project_id=p.id and m.user_id=auth.uid())
      or exists(select 1 from study_contributions c where c.project_id=p.id and c.author_id=auth.uid())
    )
  ) visible;
$$;

create or replace function public.get_study_project(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to open this study project'; end if;
  if not exists(
    select 1 from study_projects p where p.id=p_project_id and (
      p.owner_id=auth.uid() or p.published_study_id is not null
      or exists(select 1 from study_project_members m where m.project_id=p.id and m.user_id=auth.uid())
      or exists(select 1 from study_contributions c where c.project_id=p.id and c.author_id=auth.uid())
    )
  ) then raise exception 'You do not have access to this study project'; end if;

  select jsonb_build_object(
    'projectId',p.id,'ownerId',p.owner_id,'ownerName',coalesce(nullif(btrim(owner_profile.display_name),''),'Advent Pro author'),
    'isOwner',p.owner_id=auth.uid(),'publishedStudyId',p.published_study_id,
    'publishedRevisionId',p.published_revision_id,'updatedAt',p.updated_at,
    'current',jsonb_build_object('id',r.id,'number',r.revision_number,'title',r.title,'subtitle',r.subtitle,
      'category',r.category,'contentHtml',r.content_html,'plainText',r.plain_text,'authorId',r.author_id,'createdAt',r.created_at),
    'contributions',coalesce((
      select jsonb_agg(jsonb_build_object('id',c.id,'authorId',c.author_id,
        'authorName',coalesce(nullif(btrim(cp.display_name),''),'Advent Pro contributor'),'status',c.status,
        'message',c.message,'reviewMessage',c.review_message,'createdAt',c.created_at,
        'baseRevisionId',c.base_revision_id,'proposedRevisionId',c.proposed_revision_id) order by c.created_at desc)
      from study_contributions c join profiles cp on cp.id=c.author_id
      where c.project_id=p.id and (p.owner_id=auth.uid() or c.author_id=auth.uid())
    ),'[]'::jsonb),
    'history',coalesce((
      select jsonb_agg(jsonb_build_object('id',e.id,'action',e.action,'actorName',
        coalesce(nullif(btrim(ep.display_name),''),'Advent Pro member'),'detail',e.detail,'createdAt',e.created_at) order by e.created_at desc)
      from (select * from study_activity_events where project_id=p.id order by created_at desc limit 50) e
      join profiles ep on ep.id=e.actor_id
    ),'[]'::jsonb)
  ) into result
  from study_projects p join profiles owner_profile on owner_profile.id=p.owner_id
  join study_revisions r on r.id=p.current_revision_id where p.id=p_project_id;
  return result;
end; $$;

create or replace function public.save_owner_study_version(
  p_project_id uuid,p_base_revision_id uuid,p_title text,p_subtitle text,p_category text,
  p_content_html text,p_plain_text text,p_summary text default ''
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p study_projects%rowtype; r study_revisions%rowtype; next_number integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into p from study_projects where id=p_project_id for update;
  if p.owner_id is distinct from auth.uid() then raise exception 'Only the project owner can save the official version'; end if;
  if p.current_revision_id is distinct from p_base_revision_id then raise exception 'A newer official version exists. Update your copy before saving'; end if;
  if char_length(btrim(coalesce(p_title,''))) not between 1 and 180 then raise exception 'A study title is required'; end if;
  perform assert_safe_study_content(p_content_html);
  select coalesce(max(revision_number),0)+1 into next_number from study_revisions where project_id=p.id;
  insert into study_revisions(project_id,parent_revision_id,author_id,revision_number,kind,title,subtitle,category,content_html,plain_text,summary)
    values(p.id,p.current_revision_id,auth.uid(),next_number,'accepted',btrim(p_title),left(coalesce(p_subtitle,''),300),
      coalesce(nullif(btrim(p_category),''),'Bible Study'),p_content_html,left(coalesce(p_plain_text,''),1000000),left(coalesce(p_summary,''),500))
    returning * into r;
  update study_projects set current_revision_id=r.id where id=p.id;
  insert into study_activity_events(project_id,actor_id,action,revision_id,detail)
    values(p.id,auth.uid(),'version_saved',r.id,coalesce(nullif(btrim(p_summary),''),'Saved a new official version'));
  return jsonb_build_object('revisionId',r.id,'revisionNumber',r.revision_number);
end; $$;

create or replace function public.submit_study_contribution(
  p_project_id uuid,p_base_revision_id uuid,p_title text,p_subtitle text,p_category text,
  p_content_html text,p_plain_text text,p_message text default ''
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p study_projects%rowtype; r study_revisions%rowtype; c study_contributions%rowtype; next_number integer;
begin
  if auth.uid() is null then raise exception 'Sign in to send your improvements'; end if;
  select * into p from study_projects where id=p_project_id for update;
  if p.id is null then raise exception 'Study project not found'; end if;
  if p.owner_id=auth.uid() then raise exception 'The owner should save an official version instead'; end if;
  if p.published_study_id is null and not exists(select 1 from study_project_members m where m.project_id=p.id and m.user_id=auth.uid()) then raise exception 'This private project has not invited you'; end if;
  if not exists(select 1 from study_revisions where id=p_base_revision_id and project_id=p.id and kind='accepted') then raise exception 'The starting version is invalid'; end if;
  if exists(select 1 from study_contributions where project_id=p.id and author_id=auth.uid() and status='submitted') then raise exception 'You already have improvements waiting for review'; end if;
  if char_length(btrim(coalesce(p_title,''))) not between 1 and 180 then raise exception 'A study title is required'; end if;
  perform assert_safe_study_content(p_content_html);
  select coalesce(max(revision_number),0)+1 into next_number from study_revisions where project_id=p.id;
  insert into study_revisions(project_id,parent_revision_id,author_id,revision_number,kind,title,subtitle,category,content_html,plain_text,summary)
    values(p.id,p_base_revision_id,auth.uid(),next_number,'proposal',btrim(p_title),left(coalesce(p_subtitle,''),300),
      coalesce(nullif(btrim(p_category),''),'Bible Study'),p_content_html,left(coalesce(p_plain_text,''),1000000),left(coalesce(p_message,''),500))
    returning * into r;
  insert into study_contributions(project_id,author_id,base_revision_id,proposed_revision_id,message)
    values(p.id,auth.uid(),p_base_revision_id,r.id,left(coalesce(p_message,''),500)) returning * into c;
  insert into study_activity_events(project_id,actor_id,action,revision_id,contribution_id,detail)
    values(p.id,auth.uid(),'contribution_sent',r.id,c.id,coalesce(nullif(btrim(p_message),''),'Sent improvements for review'));
  return jsonb_build_object('contributionId',c.id,'status',c.status);
end; $$;

create or replace function public.get_study_contribution(p_contribution_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select jsonb_build_object(
    'id',c.id,'projectId',c.project_id,'status',c.status,'message',c.message,'reviewMessage',c.review_message,
    'authorId',c.author_id,'authorName',coalesce(nullif(btrim(cp.display_name),''),'Advent Pro contributor'),'createdAt',c.created_at,
    'canReview',p.owner_id=auth.uid(),'isOutdated',p.current_revision_id<>c.base_revision_id,
    'base',jsonb_build_object('id',b.id,'number',b.revision_number,'title',b.title,'subtitle',b.subtitle,'category',b.category,'contentHtml',b.content_html,'plainText',b.plain_text),
    'proposed',jsonb_build_object('id',r.id,'number',r.revision_number,'title',r.title,'subtitle',r.subtitle,'category',r.category,'contentHtml',r.content_html,'plainText',r.plain_text)
  ) into result
  from study_contributions c join study_projects p on p.id=c.project_id join profiles cp on cp.id=c.author_id
  join study_revisions b on b.id=c.base_revision_id join study_revisions r on r.id=c.proposed_revision_id
  where c.id=p_contribution_id and (p.owner_id=auth.uid() or c.author_id=auth.uid());
  if result is null then raise exception 'Contribution not found'; end if;
  return result;
end; $$;

create or replace function public.review_study_contribution(
  p_contribution_id uuid,p_decision text,p_review_message text default ''
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c study_contributions%rowtype; p study_projects%rowtype; decision text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  decision := lower(btrim(coalesce(p_decision,'')));
  if decision not in ('accept','request_changes','decline') then raise exception 'Invalid review decision'; end if;
  select * into c from study_contributions where id=p_contribution_id for update;
  select * into p from study_projects where id=c.project_id for update;
  if p.owner_id is distinct from auth.uid() then raise exception 'Only the project owner can review improvements'; end if;
  if c.status<>'submitted' then raise exception 'This contribution has already been reviewed'; end if;
  if decision='accept' then
    if p.current_revision_id<>c.base_revision_id then
      update study_contributions set status='outdated',reviewed_by=auth.uid(),reviewed_at=now(),review_message='A newer official version was saved first' where id=c.id;
      return jsonb_build_object('status','outdated');
    end if;
    update study_projects set current_revision_id=c.proposed_revision_id where id=p.id;
    update study_revisions set kind='accepted' where id=c.proposed_revision_id;
    update study_contributions set status='accepted',reviewed_by=auth.uid(),reviewed_at=now(),review_message=left(coalesce(p_review_message,''),500) where id=c.id;
    insert into study_activity_events(project_id,actor_id,action,revision_id,contribution_id,detail)
      values(p.id,auth.uid(),'contribution_accepted',c.proposed_revision_id,c.id,coalesce(nullif(btrim(p_review_message),''),'Accepted the contribution'));
    return jsonb_build_object('status','accepted','revisionId',c.proposed_revision_id);
  elsif decision='request_changes' then
    update study_contributions set status='changes_requested',reviewed_by=auth.uid(),reviewed_at=now(),review_message=left(coalesce(p_review_message,''),500) where id=c.id;
    insert into study_activity_events(project_id,actor_id,action,revision_id,contribution_id,detail)
      values(p.id,auth.uid(),'changes_requested',c.proposed_revision_id,c.id,coalesce(nullif(btrim(p_review_message),''),'Requested changes'));
    return jsonb_build_object('status','changes_requested');
  else
    update study_contributions set status='declined',reviewed_by=auth.uid(),reviewed_at=now(),review_message=left(coalesce(p_review_message,''),500) where id=c.id;
    insert into study_activity_events(project_id,actor_id,action,revision_id,contribution_id,detail)
      values(p.id,auth.uid(),'contribution_declined',c.proposed_revision_id,c.id,coalesce(nullif(btrim(p_review_message),''),'Declined the contribution'));
    return jsonb_build_object('status','declined');
  end if;
end; $$;

create or replace function public.publish_study_project(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p study_projects%rowtype; r study_revisions%rowtype; profile_row profiles%rowtype; study_id text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into p from study_projects where id=p_project_id for update;
  if p.owner_id is distinct from auth.uid() then raise exception 'Only the project owner can publish'; end if;
  select * into r from study_revisions where id=p.current_revision_id and kind='accepted';
  if r.id is null then raise exception 'There is no accepted version to publish'; end if;
  select * into profile_row from profiles where id=auth.uid();
  study_id := coalesce(p.published_study_id,'community-'||replace(p.id::text,'-',''));
  insert into studies(id,category,title,subtitle,content,author,is_featured,is_published,deleted,published_at,collaboration_owner_id)
    values(study_id,r.category,r.title,r.subtitle,r.content_html,coalesce(nullif(btrim(profile_row.display_name),''),'Advent Pro author'),false,true,false,now(),auth.uid())
    on conflict(id) do update set category=excluded.category,title=excluded.title,subtitle=excluded.subtitle,
      content=excluded.content,author=excluded.author,is_published=true,deleted=false,published_at=now(),collaboration_owner_id=auth.uid();
  update study_projects set published_study_id=study_id,published_revision_id=r.id where id=p.id;
  insert into study_activity_events(project_id,actor_id,action,revision_id,detail)
    values(p.id,auth.uid(),'published',r.id,'Published version '||r.revision_number::text||' to the community');
  return jsonb_build_object('studyId',study_id,'revisionId',r.id,'revisionNumber',r.revision_number);
end; $$;

revoke all on function public.start_study_copy(text,text,text,text,text,text) from public;
revoke all on function public.assert_safe_study_content(text) from public;
revoke all on function public.get_my_study_projects() from public;
revoke all on function public.get_study_project(uuid) from public;
revoke all on function public.save_owner_study_version(uuid,uuid,text,text,text,text,text,text) from public;
revoke all on function public.submit_study_contribution(uuid,uuid,text,text,text,text,text,text) from public;
revoke all on function public.get_study_contribution(uuid) from public;
revoke all on function public.review_study_contribution(uuid,text,text) from public;
revoke all on function public.publish_study_project(uuid) from public;
grant execute on function public.start_study_copy(text,text,text,text,text,text) to authenticated;
grant execute on function public.get_my_study_projects() to authenticated;
grant execute on function public.get_study_project(uuid) to authenticated;
grant execute on function public.save_owner_study_version(uuid,uuid,text,text,text,text,text,text) to authenticated;
grant execute on function public.submit_study_contribution(uuid,uuid,text,text,text,text,text,text) to authenticated;
grant execute on function public.get_study_contribution(uuid) to authenticated;
grant execute on function public.review_study_contribution(uuid,text,text) to authenticated;
grant execute on function public.publish_study_project(uuid) to authenticated;

commit;
