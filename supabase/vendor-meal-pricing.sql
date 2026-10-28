alter table public.vendor_meals
  add column if not exists price numeric(12, 2) check (price is null or price >= 0),
  add column if not exists available_days text[] not null default array['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

create table if not exists public.vendor_meal_sides (
  vendor_id bigint not null references public.vendors(id) on delete cascade,
  side text not null check (side in ('Salad', 'Parboiled Beans', 'Fried Plantain')),
  price numeric(12, 2) check (price is null or price >= 0),
  primary key (vendor_id, side)
);

create index if not exists vendor_meal_sides_vendor_id_idx
  on public.vendor_meal_sides (vendor_id);