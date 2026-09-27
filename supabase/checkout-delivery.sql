-- Checkout and delivery quote fields for the ChopHub order workflow.
-- Run this once in the Supabase SQL editor before enabling online payments.

alter table public.orders
  add column if not exists customer_email text,
  add column if not exists customer_latitude numeric(10, 7),
  add column if not exists customer_longitude numeric(10, 7),
  add column if not exists food_subtotal numeric(12, 2),
  add column if not exists delivery_distance_km numeric(10, 2),
  add column if not exists delivery_fee numeric(12, 2),
  add column if not exists extra_pickup_fee numeric(12, 2),
  add column if not exists evening_driver_fee numeric(12, 2),
  add column if not exists total_amount numeric(12, 2),
  add column if not exists payment_method text,
  add column if not exists payment_status text,
  add column if not exists payment_reference text,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists pickup_vendors jsonb not null default '[]'::jsonb;

create unique index if not exists orders_payment_reference_idx
  on public.orders (payment_reference)
  where payment_reference is not null;

comment on column public.orders.payment_status is
  'pending until Paystack is verified or ChopHub manually confirms a bank transfer; fulfilment must wait until paid';
