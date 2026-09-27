-- Seed ChopHub's current menu into the meals table.
-- Run this in Supabase SQL Editor after creating the meals table.

insert into public.meals (id, name, description, price, image, category, available, vendor_name)
values
  (1, 'Afang Soup', 'Rich traditional Afang soup prepared with fresh ingredients and assorted proteins.', 5000, '/afang.jpeg', 'soup-swallow', true, 'ChopHub'),
  (2, 'Edikang Ikong', 'Fresh and delicious traditional vegetable soup loaded with assorted ingredients.', 5000, '/edikanikong.jpeg', 'soup-swallow', true, 'ChopHub'),
  (3, 'Indigenous 404', 'Well-seasoned, freshly prepared indigenous 404 meat.', 4000, '/404.JPG', 'meat', true, 'ChopHub'),
  (4, 'Indigenous Bush Meat', 'Freshly prepared traditional indigenous bush meat with rich local seasoning.', 4000, '/Bushmeat.jpg', 'meat', true, 'ChopHub'),
  (5, 'Fisherman Soup', 'A rich Calabar-style seafood soup packed with fresh fish and seafood.', 8000, '/fisherman_soup.JPG', 'soup-swallow', true, 'ChopHub'),
  (6, 'White Soup', 'Traditional white soup with a rich, aromatic and comforting taste.', 5500, '/white_soup.jpg', 'soup-swallow', true, 'ChopHub'),
  (7, 'Ogbono Soup', 'Rich, smooth ogbono soup prepared with traditional spices and fresh ingredients.', 5000, '/ogbono.jpg', 'soup-swallow', true, 'ChopHub'),
  (8, 'Okro Soup', 'Freshly prepared okro soup with a delicious traditional Calabar flavor.', 5000, '/okro_.JPG', 'soup-swallow', true, 'ChopHub'),
  (9, 'Egusi Soup', 'Rich and hearty egusi soup prepared with assorted ingredients.', 5000, '/egusi.JPG', 'soup-swallow', true, 'ChopHub'),
  (10, 'Oha Soup', 'Traditional Oha soup with a rich, comforting indigenous flavor.', 5000, '/oha.JPG', 'soup-swallow', true, 'ChopHub'),
  (11, 'Fresh Roasted Fish', 'Well-seasoned fresh roasted fish served with spicy pepper sauce.', 8000, '/grilled_fish.JPG', 'meat', true, 'ChopHub'),
  (12, 'Jollof Rice', 'Fragrant party-style jollof rice served plain or with your choice of protein.', 2000, '/jollof.jpg', 'rice', true, 'ChopHub'),
  (13, 'Rice & Stew', 'Steamed rice with rich, flavorful stew and your choice of protein.', 2000, '/rice_stew.jpg', 'rice', true, 'ChopHub'),
  (14, 'Shawarma', 'The King''s Shawarma, generously filled and freshly prepared.', 6500, '/sharwama.jpeg', 'meat', true, 'ChopHub'),
  (15, 'Parfait', 'A creamy, layered parfait treat.', 5000, '/Parfait.webp', 'dessert', true, 'ChopHub'),
  (16, 'Abáchà', 'Traditional African salad prepared with delicious local ingredients.', 4000, '/abacha.JPG', 'dessert', true, 'ChopHub')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  image = excluded.image,
  category = excluded.category,
  vendor_name = excluded.vendor_name;

select setval(
  pg_get_serial_sequence('public.meals', 'id'),
  coalesce((select max(id) from public.meals), 0) + 1,
  false
);
