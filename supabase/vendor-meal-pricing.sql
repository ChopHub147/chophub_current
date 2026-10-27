alter table public.vendor_meals
  add column if not exists price numeric(12, 2) check (price is null or price >= 0),
  add column if not exists available_days text[] not null default array['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];