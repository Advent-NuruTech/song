-- Advent Pro migration 002: accounts, multiple roles, auditing, deletion requests.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '', display_name text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.app_roles (name text primary key, display_name text not null, description text not null default '');
create table if not exists public.app_permissions (name text primary key, description text not null default '');
create table if not exists public.app_role_permissions (
  role_name text not null references public.app_roles(name) on delete cascade,
  permission_name text not null references public.app_permissions(name) on delete cascade,
  primary key(role_name,permission_name)
);
create table if not exists public.app_user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_name text not null references public.app_roles(name) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(), primary key(user_id,role_name)
);
create table if not exists public.audit_log (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
  action text not null, target_type text not null, target_id text not null,
  details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(), status text not null default 'pending'
    check(status in ('pending','processing','completed','cancelled'))
);

insert into public.app_roles(name,display_name,description) values
 ('reader','Reader','Read content and manage a personal account'),('contributor','Contributor','Create content drafts'),
 ('editor','Editor','Review and edit content'),('publisher','Publisher','Publish and withdraw content'),
 ('moderator','Moderator','Review reports and submissions'),('media_manager','Media manager','Manage media'),
 ('user_manager','User manager','Manage users and roles'),('super_admin','Super admin','Full administration')
on conflict(name) do update set display_name=excluded.display_name,description=excluded.description;
insert into public.app_permissions(name,description) values
 ('dashboard.access','Access administration'),('content.create','Create drafts'),('content.edit','Edit content'),
 ('content.publish','Publish content'),('content.moderate','Moderate submissions'),('media.manage','Manage media'),
 ('users.manage','Manage users and roles'),('roles.manage','Manage role definitions'),('audit.read','Read audits')
on conflict(name) do update set description=excluded.description;
insert into public.app_role_permissions(role_name,permission_name) values
 ('contributor','dashboard.access'),('contributor','content.create'),('contributor','content.edit'),
 ('editor','dashboard.access'),('editor','content.create'),('editor','content.edit'),
 ('publisher','dashboard.access'),('publisher','content.create'),('publisher','content.edit'),('publisher','content.publish'),
 ('moderator','dashboard.access'),('moderator','content.moderate'),('media_manager','dashboard.access'),('media_manager','media.manage'),
 ('user_manager','dashboard.access'),('user_manager','users.manage'),
 ('super_admin','dashboard.access'),('super_admin','content.create'),('super_admin','content.edit'),
 ('super_admin','content.publish'),('super_admin','content.moderate'),('super_admin','media.manage'),
 ('super_admin','users.manage'),('super_admin','roles.manage'),('super_admin','audit.read') on conflict do nothing;

create or replace function public.has_permission(requested text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from app_user_roles ur join app_role_permissions rp on rp.role_name=ur.role_name
   where ur.user_id=auth.uid() and rp.permission_name=requested); $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select public.has_permission('dashboard.access') or exists(select 1 from admins where user_id=auth.uid()); $$;

-- Signup has no role choice. This trigger always grants only the baseline Reader role.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into profiles(id,email,display_name) values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'display_name',''))
   on conflict(id) do update set email=excluded.email;
 insert into app_user_roles(user_id,role_name) values(new.id,'reader') on conflict do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id,email) select id,coalesce(email,'') from auth.users on conflict(id) do nothing;
insert into public.app_user_roles(user_id,role_name) select id,'reader' from profiles on conflict do nothing;
insert into public.app_user_roles(user_id,role_name,granted_by) select user_id,'super_admin',user_id from admins on conflict do nothing;

create or replace function public.set_user_roles(target_user uuid,requested_roles text[]) returns void language plpgsql security definer set search_path=public as $$
begin
 if not has_permission('users.manage') then raise exception 'Not authorized'; end if;
 if exists(select 1 from unnest(coalesce(requested_roles,array[]::text[])) r left join app_roles on app_roles.name=r where app_roles.name is null) then raise exception 'Unknown role'; end if;
 delete from app_user_roles where user_id=target_user and role_name<>'reader';
 insert into app_user_roles(user_id,role_name,granted_by) select target_user,r,auth.uid()
   from unnest(coalesce(requested_roles,array[]::text[])) r where r<>'reader' on conflict do nothing;
 insert into audit_log(actor_id,action,target_type,target_id,details)
   values(auth.uid(),'roles.updated','user',target_user::text,jsonb_build_object('roles',coalesce(requested_roles,array[]::text[])));
end; $$;
revoke all on function public.set_user_roles(uuid,text[]) from public;
grant execute on function public.set_user_roles(uuid,text[]) to authenticated;

create or replace function public.request_account_deletion() returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into account_deletion_requests(user_id,requested_at,status) values(auth.uid(),now(),'pending')
   on conflict(user_id) do update set requested_at=excluded.requested_at,status='pending';
 insert into audit_log(actor_id,action,target_type,target_id) values(auth.uid(),'account.deletion_requested','user',auth.uid()::text);
end; $$;
revoke all on function public.request_account_deletion() from public;
grant execute on function public.request_account_deletion() to authenticated;
