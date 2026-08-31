-- Make collaboration publishing compatible with the dynamic category taxonomy.
-- Older working copies may carry a display label such as "State of the Dead";
-- published studies must use the canonical category key expected by migration 019.
begin;

create or replace function public.publish_study_project(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  p study_projects%rowtype;
  r study_revisions%rowtype;
  profile_row profiles%rowtype;
  study_id text;
  category_key text;
  category_label text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into p from study_projects where id=p_project_id for update;
  if p.owner_id is distinct from auth.uid() then raise exception 'Only the project owner can publish'; end if;
  select * into r from study_revisions where id=p.current_revision_id and kind='accepted';
  if r.id is null then raise exception 'There is no accepted version to publish'; end if;

  category_label := coalesce(nullif(btrim(r.category),''),'Bible Study');
  category_key := public.normalize_content_category_key(category_label);
  insert into public.content_categories(content_type,name,display_name,color,icon,description,sort_order)
    values('study',category_key,category_label,'#2563EB','book-outline','',100)
    on conflict(content_type,name) do nothing;

  select * into profile_row from profiles where id=auth.uid();
  study_id := coalesce(p.published_study_id,'community-'||replace(p.id::text,'-',''));
  insert into studies(id,category,title,subtitle,content,author,is_featured,is_published,deleted,published_at,collaboration_owner_id)
    values(study_id,category_key,r.title,r.subtitle,r.content_html,coalesce(nullif(btrim(profile_row.display_name),''),'Advent Pro author'),false,true,false,now(),auth.uid())
    on conflict(id) do update set category=excluded.category,title=excluded.title,subtitle=excluded.subtitle,
      content=excluded.content,author=excluded.author,is_published=true,deleted=false,published_at=now(),collaboration_owner_id=auth.uid();
  update study_projects set published_study_id=study_id,published_revision_id=r.id where id=p.id;
  insert into study_activity_events(project_id,actor_id,action,revision_id,detail)
    values(p.id,auth.uid(),'published',r.id,'Published version '||r.revision_number::text||' to the community');
  return jsonb_build_object('studyId',study_id,'revisionId',r.id,'revisionNumber',r.revision_number);
end; $$;

revoke all on function public.publish_study_project(uuid) from public;
grant execute on function public.publish_study_project(uuid) to authenticated;

commit;
