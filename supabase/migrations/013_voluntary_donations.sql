-- Advent Pro migration 013: voluntary Paystack support records.
-- Payment records are server-only. They never participate in app entitlements.

begin;

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  paystack_reference text not null unique,
  amount bigint not null,
  currency text not null default 'KES',
  status text not null default 'pending',
  payment_channel text,
  paystack_transaction_id text,
  metadata jsonb not null default '{}'::jsonb,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  constraint donations_reference_check check (paystack_reference ~ '^APSUP-[A-Za-z0-9.-]{20,100}$'),
  constraint donations_amount_check check (amount between 20 and 10000000),
  constraint donations_currency_check check (currency = 'KES'),
  constraint donations_status_check check (status in ('pending', 'successful', 'failed', 'cancelled')),
  constraint donations_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_donations_status_created
  on public.donations(status, created_at desc);

create index if not exists idx_donations_user_created
  on public.donations(user_id, created_at desc)
  where user_id is not null;

-- Small fixed-window counters protect the initialization endpoint from abuse.
create table if not exists public.donation_rate_limits (
  rate_key text not null,
  window_bucket bigint not null,
  request_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (rate_key, window_bucket),
  constraint donation_rate_limits_count_check check (request_count > 0)
);

alter table public.donations enable row level security;
alter table public.donation_rate_limits enable row level security;

-- No client policies are intentionally defined: only service-role Edge Functions can access these rows.
revoke all on table public.donations from anon, authenticated;
revoke all on table public.donation_rate_limits from anon, authenticated;
grant select, insert, update on table public.donations to service_role;
grant select, insert, update, delete on table public.donation_rate_limits to service_role;

create or replace function public.consume_donation_rate_limit(
  p_rate_key text,
  p_window_bucket bigint,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  if p_rate_key is null or length(p_rate_key) < 16 or p_limit < 1 then
    return false;
  end if;

  insert into public.donation_rate_limits(rate_key, window_bucket, request_count)
  values (p_rate_key, p_window_bucket, 1)
  on conflict (rate_key, window_bucket) do update
    set request_count = donation_rate_limits.request_count + 1,
        updated_at = now()
    where donation_rate_limits.request_count < p_limit
  returning request_count into next_count;

  -- Opportunistically remove old counters for this identity only.
  delete from public.donation_rate_limits
    where rate_key = p_rate_key and window_bucket < p_window_bucket - 6;

  return next_count is not null;
end;
$$;

revoke all on function public.consume_donation_rate_limit(text, bigint, integer) from public, anon, authenticated;
grant execute on function public.consume_donation_rate_limit(text, bigint, integer) to service_role;

commit;
