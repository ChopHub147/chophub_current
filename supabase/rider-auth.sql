-- Run this once in the Supabase SQL editor to enable rider registration and sign-in.
alter table public.riders
  add column if not exists password_hash text,
  add column if not exists account_status text not null default 'pending';

alter table public.riders
  drop constraint if exists riders_account_status_check;

alter table public.riders
  add constraint riders_account_status_check
  check (account_status in ('pending', 'approved', 'suspended'));

create index if not exists riders_account_status_idx
  on public.riders (account_status);
