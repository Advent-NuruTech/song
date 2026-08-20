-- Advent Pro migration 003: row-level security and reference seeds.
alter table public.songs enable row level security;
alter table public.studies enable row level security;
alter table public.study_categories enable row level security;
alter table public.admins enable row level security;
alter table public.profiles enable row level security;
alter table public.app_roles enable row level security;
alter table public.app_permissions enable row level security;
alter table public.app_role_permissions enable row level security;
alter table public.app_user_roles enable row level security;
alter table public.audit_log enable row level security;
alter table public.account_deletion_requests enable row level security;

drop policy if exists songs_public_read on public.songs;
create policy songs_public_read on public.songs for select using(is_published=true or deleted=true);
drop policy if exists studies_public_read on public.studies;
create policy studies_public_read on public.studies for select using(is_published=true or deleted=true);
drop policy if exists categories_public_read on public.study_categories;
create policy categories_public_read on public.study_categories for select using(true);

drop policy if exists songs_admin_all on public.songs;
create policy songs_admin_all on public.songs for all
 using(has_permission('content.edit') or has_permission('content.publish'))
 with check((has_permission('content.create') or has_permission('content.edit'))
   and ((not is_published and not deleted) or has_permission('content.publish')));
drop policy if exists studies_admin_all on public.studies;
create policy studies_admin_all on public.studies for all
 using(has_permission('content.edit') or has_permission('content.publish'))
 with check((has_permission('content.create') or has_permission('content.edit'))
   and ((not is_published and not deleted) or has_permission('content.publish')));
drop policy if exists categories_admin_all on public.study_categories;
create policy categories_admin_all on public.study_categories for all
 using(has_permission('content.edit')) with check(has_permission('content.edit'));
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select using(is_admin());

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select using(id=auth.uid() or has_permission('users.manage'));
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists app_roles_authenticated_read on public.app_roles;
create policy app_roles_authenticated_read on public.app_roles for select to authenticated using(true);
drop policy if exists app_permissions_authenticated_read on public.app_permissions;
create policy app_permissions_authenticated_read on public.app_permissions for select to authenticated using(true);
drop policy if exists app_role_permissions_authenticated_read on public.app_role_permissions;
create policy app_role_permissions_authenticated_read on public.app_role_permissions for select to authenticated using(true);
drop policy if exists app_user_roles_read on public.app_user_roles;
create policy app_user_roles_read on public.app_user_roles for select using(user_id=auth.uid() or has_permission('users.manage'));
drop policy if exists audit_authorized_read on public.audit_log;
create policy audit_authorized_read on public.audit_log for select using(has_permission('audit.read'));
drop policy if exists deletion_request_self_read on public.account_deletion_requests;
create policy deletion_request_self_read on public.account_deletion_requests for select
 using(user_id=auth.uid() or has_permission('users.manage'));

insert into public.study_categories(name,display_name,color,icon,sort_order) values
 ('doctrine','Doctrine','#0B4AA6','book-outline',10),('prophecy','Prophecy','#8B5CF6','eye-outline',20),
 ('health','Health','#10B981','leaf-outline',30),('family','Family','#F59E0B','people-outline',40),
 ('devotional','Devotional','#EF4444','heart-outline',50),('history','History','#6366F1','time-outline',60)
on conflict(name) do nothing;
