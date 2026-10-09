-- Product schema for Foodstuff and Fresh Food catalogs.
create table if not exists public.products (
  id text primary key,
  name text not null,
  description text not null default '',
  category text not null,
  subcategory text not null default '',
  section text not null check (section in ('foodstuff', 'fresh-food')),
  unit text not null,
  price numeric(12, 2) not null default 0,
  image text not null default '',
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'limited', 'unavailable')),
  variant_options jsonb not null default '[]'::jsonb check (jsonb_typeof(variant_options) = 'array'),
  created_at timestamptz not null default now()
);

alter table public.products
  add column if not exists subcategory text not null default '',
  add column if not exists variant_options jsonb not null default '[]'::jsonb;

alter table public.products enable row level security;

drop policy if exists "Public can read catalog products" on public.products;

create policy "Public can read catalog products"
on public.products for select
using (true);

insert into public.products (id, name, description, category, section, unit, price, image, stock_status)
values
  ('foodstuff-garri-1kg', 'Garri', 'Crispy cassava flakes for drinks and meals.', 'Grains & Staples', 'foodstuff', '1 kg', 1800, '🌾', 'in_stock'),
  ('foodstuff-rice-5kg', 'Long-grain rice', 'Everyday rice for family meals.', 'Grains & Staples', 'foodstuff', '5 kg bag', 12500, '🍚', 'in_stock'),
  ('foodstuff-beans-1kg', 'Black-eyed beans', 'Clean, sorted beans for soups and staples.', 'Grains & Staples', 'foodstuff', '1 kg', 2800, '🫘', 'in_stock'),
  ('foodstuff-wheat-1kg', 'Wheat flour', 'For baking, pastries, and home cooking.', 'Flours & Baking', 'foodstuff', '1 kg', 2200, '🥣', 'in_stock'),
  ('foodstuff-sugar-1kg', 'White sugar', 'Fine sugar for drinks and baking.', 'Flours & Baking', 'foodstuff', '1 kg', 2200, '🍬', 'in_stock'),
  ('foodstuff-palm-oil-1l', 'Palm oil', 'Rich red palm oil for traditional cooking.', 'Cooking Oils', 'foodstuff', '1 litre', 3500, '🫗', 'in_stock'),
  ('foodstuff-tomato-400g', 'Tomato paste', 'Convenient tomato base for sauces and stews.', 'Canned & Packaged', 'foodstuff', '400 g tin', 1800, '🥫', 'in_stock'),
  ('foodstuff-sardine-155g', 'Sardines', 'Shelf-stable fish for quick meals.', 'Canned & Packaged', 'foodstuff', '155 g tin', 2500, '🐟', 'in_stock'),
  ('foodstuff-stock-cubes', 'Stock cubes', 'Seasoning cubes for soups, rice, and stews.', 'Seasonings', 'foodstuff', '1 pack', 1200, '🧂', 'in_stock'),
  ('foodstuff-bottled-water', 'Bottled water', 'Chilled bottled water for your home or office.', 'Beverages', 'foodstuff', '75 cl bottle', 500, '💧', 'in_stock'),
  ('foodstuff-biscuits', 'Assorted biscuits', 'A convenient snack for the household.', 'Snacks', 'foodstuff', '1 pack', 1500, '🍪', 'in_stock'),
  ('foodstuff-detergent', 'Laundry detergent', 'Household cleaning essential.', 'Household', 'foodstuff', '1 kg pack', 3500, '🧼', 'unavailable'),
  ('fresh-bananas', 'Bananas', 'Ripe, sweet bananas for home or office.', 'Fruits', 'fresh-food', '1 bunch', 2500, '🍌', 'in_stock'),
  ('fresh-oranges', 'Oranges', 'Juicy seasonal oranges.', 'Fruits', 'fresh-food', '1 dozen', 3500, '🍊', 'in_stock'),
  ('fresh-pawpaw', 'Pawpaw', 'Fresh ripe pawpaw selected for you.', 'Fruits', 'fresh-food', '1 piece', 2500, '🥭', 'limited'),
  ('fresh-tomatoes', 'Tomatoes', 'Fresh tomatoes for sauces, stews, and salads.', 'Vegetables & Greens', 'fresh-food', '1 kg', 3500, '🍅', 'in_stock'),
  ('fresh-onions', 'Onions', 'Crisp onions for everyday cooking.', 'Vegetables & Greens', 'fresh-food', '1 kg', 2800, '🧅', 'in_stock'),
  ('fresh-ugu', 'Ugu leaves', 'Fresh fluted pumpkin leaves for soups.', 'Vegetables & Greens', 'fresh-food', '1 bunch', 1200, '🌿', 'in_stock'),
  ('fresh-plantain', 'Plantain', 'Green or ripe plantain for frying and cooking.', 'Vegetables & Greens', 'fresh-food', '1 kg', 3000, '🍌', 'in_stock'),
  ('fresh-chicken', 'Chicken', 'Cleaned chicken prepared for cooking.', 'Meat & Poultry', 'fresh-food', '1 kg', 6500, '🍗', 'limited'),
  ('fresh-beef', 'Beef', 'Fresh beef cuts for soups and stews.', 'Meat & Poultry', 'fresh-food', '1 kg', 8500, '🥩', 'in_stock'),
  ('fresh-catfish', 'Catfish', 'Fresh catfish cleaned to order.', 'Fish & Seafood', 'fresh-food', '1 kg', 7500, '🐟', 'in_stock'),
  ('fresh-mackerel', 'Mackerel', 'Fresh or frozen mackerel for family meals.', 'Fish & Seafood', 'fresh-food', '1 kg', 6500, '🐠', 'limited'),
  ('fresh-eggs', 'Chicken eggs', 'Fresh eggs for breakfast and baking.', 'Eggs & Dairy', 'fresh-food', '1 crate', 5500, '🥚', 'in_stock'),
  ('foodstuff-baby-rice-cereal', 'Baby rice cereal', 'Packaged baby cereal; follow the age and preparation guidance on the label.', 'Baby Food', 'foodstuff', '300 g', 3500, '🥣', 'in_stock'),
  ('foodstuff-baby-multigrain-cereal', 'Baby multigrain cereal', 'Packaged multigrain baby cereal; follow the age and preparation guidance on the label.', 'Baby Food', 'foodstuff', '300 g', 3800, '🥣', 'in_stock'),
  ('foodstuff-baby-oat-cereal', 'Baby oat cereal', 'Packaged oat cereal for babies; follow the age and preparation guidance on the label.', 'Baby Food', 'foodstuff', '300 g', 3200, '🥣', 'in_stock'),
  ('foodstuff-apple-banana-puree', 'Apple and banana baby puree', 'Fruit puree pouch; check the product label for age guidance and ingredients.', 'Baby Food', 'foodstuff', '90 g pouch', 1500, '🍎', 'in_stock'),
  ('foodstuff-carrot-sweet-potato-puree', 'Carrot and sweet potato baby puree', 'Vegetable puree pouch; check the product label for age guidance and ingredients.', 'Baby Food', 'foodstuff', '90 g pouch', 1500, '🥕', 'in_stock'),
  ('foodstuff-baby-fruit-puree-jar', 'Mixed fruit baby puree', 'Ready-to-serve fruit puree; check the product label for age guidance and ingredients.', 'Baby Food', 'foodstuff', '125 g jar', 1800, '🍐', 'in_stock'),
  ('foodstuff-baby-puffs', 'Baby snack puffs', 'Packaged baby snack; follow the age and serving guidance on the label.', 'Baby Food', 'foodstuff', '50 g pack', 2200, '🍼', 'in_stock'),
  ('foodstuff-teething-biscuits', 'Teething biscuits', 'Packaged teething biscuits; follow the age and serving guidance on the label.', 'Baby Food', 'foodstuff', '100 g pack', 2500, '🍪', 'in_stock'),
  ('foodstuff-adult-dog-food', 'Adult dog food', 'Packaged dog food; follow the feeding guide on the product label.', 'Pet Food', 'foodstuff', '1 kg bag', 6500, '🐕', 'in_stock'),
  ('foodstuff-puppy-food', 'Puppy food', 'Packaged puppy food; follow the feeding guide on the product label.', 'Pet Food', 'foodstuff', '1 kg bag', 7000, '🐶', 'in_stock'),
  ('foodstuff-dry-cat-food', 'Dry cat food', 'Packaged cat food; follow the feeding guide on the product label.', 'Pet Food', 'foodstuff', '1 kg bag', 7500, '🐈', 'in_stock'),
  ('foodstuff-wet-cat-food', 'Wet cat food', 'Single-serve wet cat food pouch; check the product label for feeding guidance.', 'Pet Food', 'foodstuff', '85 g pouch', 1500, '🐈', 'in_stock'),
  ('foodstuff-wet-dog-food', 'Wet dog food', 'Packaged wet dog food; check the product label for feeding guidance.', 'Pet Food', 'foodstuff', '400 g tin', 2500, '🐕', 'in_stock'),
  ('foodstuff-dog-treats', 'Dog treats', 'Packaged dog treats; follow the serving guidance on the product label.', 'Pet Food', 'foodstuff', '100 g pack', 2500, '🦴', 'in_stock'),
  ('foodstuff-cat-treats', 'Cat treats', 'Packaged cat treats; follow the serving guidance on the product label.', 'Pet Food', 'foodstuff', '60 g pack', 2000, '🐟', 'in_stock'),
  ('foodstuff-fish-food-flakes', 'Fish food flakes', 'Packaged ornamental fish food; follow the feeding instructions on the label.', 'Pet Food', 'foodstuff', '50 g pack', 1800, '🐠', 'in_stock')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  section = excluded.section,
  unit = excluded.unit,
  price = excluded.price,
  image = excluded.image,
  stock_status = excluded.stock_status;

create table if not exists public.orders (
  id bigint generated by default as identity primary key,
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  delivery_area text not null,
  subtotal numeric(12, 2) not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated by default as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  unit_price numeric(12, 2) not null,
  quantity integer not null
);

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists delivery_address text,
  add column if not exists delivery_area text,
  add column if not exists subtotal numeric(12, 2),
  add column if not exists status text default 'new';

alter table public.order_items
  add column if not exists product_id text,
  add column if not exists product_name text,
  add column if not exists unit_price numeric(12, 2),
  add column if not exists quantity integer;

-- Operations control center: ChopHub staff coordinate vendors and riders by phone.
alter table public.orders
  add column if not exists rider_name text,
  add column if not exists rider_phone text,
  add column if not exists attention_reason text;

update public.orders
set status = case
  when status = 'confirmed' then 'vendors_confirmed'
  when status = 'preparing' then 'pickup_in_progress'
  else status
end
where status in ('confirmed', 'preparing');

create table if not exists public.order_events (
  id bigint generated by default as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  event_type text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_id_created_at_idx
  on public.order_events (order_id, created_at desc);

create table if not exists public.vendors (
  id bigint generated by default as identity primary key,
  name text not null,
  phone text not null,
  address text not null default '',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.vendors
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7);

create table if not exists public.vendor_products (
  vendor_id bigint not null references public.vendors(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  primary key (vendor_id, product_id)
);

create index if not exists vendor_products_product_id_idx
  on public.vendor_products (product_id);

create table if not exists public.vendor_meals (
  vendor_id bigint not null references public.vendors(id) on delete cascade,
  meal_id bigint not null references public.meals(id) on delete cascade,
  primary key (vendor_id, meal_id)
);

create index if not exists vendor_meals_meal_id_idx
  on public.vendor_meals (meal_id);

create table if not exists public.riders (
  id bigint generated by default as identity primary key,
  name text not null,
  phone text not null unique,
  base_area text not null default '',
  availability text not null default 'available' check (availability in ('available', 'busy', 'offline')),
  last_latitude numeric(10, 7),
  last_longitude numeric(10, 7),
  last_location_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists rider_id bigint references public.riders(id) on delete set null;

create table if not exists public.rider_locations (
  id bigint generated by default as identity primary key,
  rider_id bigint not null references public.riders(id) on delete cascade,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  recorded_at timestamptz not null default now()
);

create index if not exists rider_locations_rider_id_recorded_at_idx
  on public.rider_locations (rider_id, recorded_at desc);
