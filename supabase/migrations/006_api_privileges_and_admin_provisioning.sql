-- Advent Pro migration 006: API privileges and atomic admin provisioning.
--
-- RLS policies only filter operations after Postgres has granted the API role
-- access to a table. The earlier migrations created policies without all of
-- the required table grants, so even the service role received 42501 errors.

grant usage on schema public to anon, authenticated, service_role;

-- Public app reads. RLS limits these tables to published rows/tombstones.
grant select on table public.songs, public.studies, public.study_categories
  to anon;

-- Signed-in app and dashboard operations. The policies in migration 003 remain
-- the authority for which rows/actions each user may access.
grant select, insert, update, delete on table
  public.songs,
  public.studies,
  public.study_categories
  to authenticated;
grant select, update on table public.profiles to authenticated;
grant select on table
  public.admins,
  public.app_roles,
  public.app_permissions,
  public.app_role_permissions,
  public.app_user_roles,
  public.audit_log,
  public.account_deletion_requests
  to authenticated;
grant delete on table public.study_comments to authenticated;
grant usage, select on sequence public.content_revision_seq to authenticated;

-- Keep server privileges narrow. These grants also make the currently deployed
-- two-upsert signup route work before the atomic RPC version is deployed.
grant select, insert, update on table
  public.profiles,
  public.app_user_roles
  to service_role;

-- Provision both baseline and administrator roles in one database transaction.
-- Reading the email from auth.users prevents the caller from storing an email
-- that does not belong to the supplied Auth user.
create or replace function public.provision_admin_user(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_email text;
begin
  select coalesce(email, '') into target_email
  from auth.users
  where id = target_user;

  if not found then
    raise exception 'Auth user not found';
  end if;

  insert into public.profiles(id, email)
  values(target_user, target_email)
  on conflict(id) do update set email = excluded.email;

  insert into public.app_user_roles(user_id, role_name, granted_by)
  values
    (target_user, 'reader', target_user),
    (target_user, 'super_admin', target_user)
  on conflict(user_id, role_name) do nothing;
end;
$$;

revoke all on function public.provision_admin_user(uuid) from public;
revoke all on function public.provision_admin_user(uuid) from anon, authenticated;
grant execute on function public.provision_admin_user(uuid) to service_role;
