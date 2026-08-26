-- Advent Pro migration 016: align the donation ledger with Paystack's KES 3 minimum.

begin;

alter table public.donations
  drop constraint if exists donations_amount_check;

alter table public.donations
  add constraint donations_amount_check
  check (amount between 3 and 10000000);

commit;
