-- Advent Pro migration 018: allow donation status transitions to update totals.
--
-- The previous helper used INSERT ... ON CONFLICT for negative deltas. Postgres
-- validates the proposed negative INSERT row before resolving the conflict, so
-- moving a donation from pending to successful violated the non-negative total
-- constraints. Negative deltas must update an existing aggregate directly.

begin;

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
  if p_count_delta < 0 or p_amount_delta < 0 then
    update public.donation_daily_totals
      set record_count = record_count + p_count_delta,
          amount_total = amount_total + p_amount_delta,
          updated_at = now()
      where donation_day = p_day
        and status = p_status
        and record_count + p_count_delta >= 0
        and amount_total + p_amount_delta >= 0;

    if not found then
      raise exception 'Donation aggregate is missing or inconsistent for % / %', p_day, p_status;
    end if;
  else
    insert into public.donation_daily_totals(donation_day, status, record_count, amount_total)
    values (p_day, p_status, p_count_delta, p_amount_delta)
    on conflict (donation_day, status) do update
      set record_count = donation_daily_totals.record_count + excluded.record_count,
          amount_total = donation_daily_totals.amount_total + excluded.amount_total,
          updated_at = now();
  end if;

  delete from public.donation_daily_totals
    where donation_day = p_day and status = p_status and record_count = 0;
end;
$$;

revoke all on function public.adjust_donation_daily_total(date, text, bigint, bigint)
  from public, anon, authenticated;

commit;
