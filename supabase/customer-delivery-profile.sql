-- Saved default delivery location for customer checkout autofill.
alter table public.customers
  add column if not exists delivery_address text,
  add column if not exists delivery_area text,
  add column if not exists delivery_latitude double precision,
  add column if not exists delivery_longitude double precision;
