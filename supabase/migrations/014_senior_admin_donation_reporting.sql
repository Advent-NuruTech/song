-- Advent Pro migration 014: senior-admin-only donation reporting.
-- Reporting is exposed through permission-checked RPCs; the donations table remains inaccessible to browsers.

begin;

alter table public.donations
  add column if not exists donor_email text;

alter table public.donations
  drop constraint if exists donations_donor_email_length_check;
alter table public.donations
  add constraint donations_donor_email_length_check
  check (donor_email is null or char_length(donor_email) between 3 and 254);

create index if not exists idx_donations_created
  on public.donations(created_at desc);

-- Compact transactional aggregates keep totals fast when the donation ledger reaches millions of rows.
create table if not exists public.donation_daily_totals (
  donation_day date not null,
  status text not null,
  record_count bigint not null default 0,
  amount_total bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (donation_day, status),
  constraint donation_daily_totals_status_check check (status in ('pending', 'successful', 'failed', 'cancelled')),
  constraint donation_daily_totals_count_check check (record_count >= 0),
  constraint donation_daily_totals_amount_check check (amount_total >= 0)
);

alter table public.donation_daily_totals enable row level security;
revoke all on table public.donation_daily_totals from anon, authenticated;
grant select, insert, update, delete on table public.donation_daily_totals to service_role;

create or replace function public.adjust_donation_daily_total(
  p_day date,
  p_status text,
  p_count_delta bigint,
  p_amount_delta bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.donation_daily_totals(donation_day, status, record_count, amount_total)
  values (p_day, p_status, p_count_delta, p_amount_delta)
  on conflict (donation_day, status) do update
    set record_count = donation_daily_totals.record_count + excluded.record_count,
        amount_total = donation_daily_totals.amount_total + excluded.amount_total,
        updated_at = now();
  delete from public.donation_daily_totals
    where donation_day = p_day and status = p_status and record_count = 0;
end;
$$;

create or replace function public.sync_donation_daily_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.adjust_donation_daily_total(
      (old.created_at at time zone 'UTC')::date,
      old.status,
      -1,
      -old.amount
    );
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.adjust_donation_daily_total(
      (new.created_at at time zone 'UTC')::date,
      new.status,
      1,
      new.amount
    );
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists donation_daily_total_sync on public.donations;
create trigger donation_daily_total_sync
after insert or update of status, amount, created_at or delete on public.donations
for each row execute function public.sync_donation_daily_total();

-- Backfill before the trigger starts receiving production changes from this migration.
insert into public.donation_daily_totals(donation_day, status, record_count, amount_total)
select
  (created_at at time zone 'UTC')::date,
  status,
  count(*)::bigint,
  sum(amount)::bigint
from public.donations
group by 1, 2
on conflict (donation_day, status) do update
  set record_count = excluded.record_count,
      amount_total = excluded.amount_total,
      updated_at = now();

revoke all on function public.adjust_donation_daily_total(date, text, bigint, bigint) from public, anon, authenticated;
revoke all on function public.sync_donation_daily_total() from public, anon, authenticated;

insert into public.app_permissions(name, description)
values ('donations.read', 'View voluntary donation records and totals')
on conflict(name) do update set description = excluded.description;

insert into public.app_role_permissions(role_name, permission_name)
values ('super_admin', 'donations.read')
on conflict do nothing;

-- User managers must not be able to promote themselves or others to super admin.
create or replace function public.set_user_roles(target_user uuid, requested_roles text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  currently_super boolean;
  requested_super boolean;
begin
  if not has_permission('users.manage') then
    raise exception 'Not authorized';
  end if;
  if exists(
    select 1
    from unnest(coalesce(requested_roles, array[]::text[])) requested_role
    left join app_roles on app_roles.name = requested_role
    where app_roles.name is null
  ) then
    raise exception 'Unknown role';
  end if;

  select exists(
    select 1 from app_user_roles
    where user_id = target_user and role_name = 'super_admin'
  ) into currently_super;
  requested_super := 'super_admin' = any(coalesce(requested_roles, array[]::text[]));

  if currently_super is distinct from requested_super and not has_permission('roles.manage') then
    raise exception 'Only a super admin may grant or remove the super admin role';
  end if;
  if currently_super and not requested_super
     and (select count(*) from app_user_roles where role_name = 'super_admin') <= 1 then
    raise exception 'The final super admin cannot be removed';
  end if;

  delete from app_user_roles where user_id = target_user and role_name <> 'reader';
  insert into app_user_roles(user_id, role_name, granted_by)
    select target_user, requested_role, auth.uid()
    from unnest(coalesce(requested_roles, array[]::text[])) requested_role
    where requested_role <> 'reader'
    on conflict do nothing;
  insert into audit_log(actor_id, action, target_type, target_id, details)
    values(auth.uid(), 'roles.updated', 'user', target_user::text,
      jsonb_build_object('roles', coalesce(requested_roles, array[]::text[])));
end;
$$;

revoke all on function public.set_user_roles(uuid, text[]) from public, anon;
grant execute on function public.set_user_roles(uuid, text[]) to authenticated;

create or replace function public.get_donation_report(
  p_status text,
  p_from date,
  p_to date,
  p_limit integer,
  p_offset integer
)
returns table (
  donation_id uuid,
  user_id uuid,
  donor_name text,
  donor_email text,
  paystack_reference text,
  amount bigint,
  currency text,
  status text,
  payment_channel text,
  created_at timestamptz,
  verified_at timestamptz,
  result_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not has_permission('donations.read') then
    raise exception 'Senior administrator access required' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('pending', 'successful', 'failed', 'cancelled') then
    raise exception 'Invalid donation status';
  end if;
  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'Invalid date range';
  end if;

  return query
  select
    d.id,
    d.user_id,
    nullif(p.display_name, ''),
    coalesce(nullif(p.email, ''), nullif(d.donor_email, '')),
    d.paystack_reference,
    d.amount,
    d.currency,
    d.status,
    d.payment_channel,
    d.created_at,
    d.verified_at,
    count(*) over()
  from public.donations d
  left join public.profiles p on p.id = d.user_id
  where (p_status is null or d.status = p_status)
    and (p_from is null or d.created_at >= p_from::timestamptz)
    and (p_to is null or d.created_at < (p_to + 1)::timestamptz)
  order by d.created_at desc, d.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.get_donation_summary(p_from date, p_to date)
returns table (
  attempt_count bigint,
  successful_count bigint,
  successful_amount bigint,
  pending_count bigint,
  failed_count bigint,
  cancelled_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not has_permission('donations.read') then
    raise exception 'Senior administrator access required' using errcode = '42501';
  end if;
  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'Invalid date range';
  end if;

  return query
  select
    coalesce(sum(t.record_count), 0)::bigint,
    coalesce(sum(t.record_count) filter (where t.status = 'successful'), 0)::bigint,
    coalesce(sum(t.amount_total) filter (where t.status = 'successful'), 0)::bigint,
    coalesce(sum(t.record_count) filter (where t.status = 'pending'), 0)::bigint,
    coalesce(sum(t.record_count) filter (where t.status = 'failed'), 0)::bigint,
    coalesce(sum(t.record_count) filter (where t.status = 'cancelled'), 0)::bigint
  from public.donation_daily_totals t
  where (p_from is null or t.donation_day >= p_from)
    and (p_to is null or t.donation_day <= p_to);
end;
$$;

revoke all on function public.get_donation_report(text, date, date, integer, integer) from public, anon;
revoke all on function public.get_donation_summary(date, date) from public, anon;
grant execute on function public.get_donation_report(text, date, date, integer, integer) to authenticated;
grant execute on function public.get_donation_summary(date, date) to authenticated;

commit;
