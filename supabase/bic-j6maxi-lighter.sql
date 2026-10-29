-- Add the confirmed BIC Maxi J6 lighter grocery product.
insert into public.products (id, name, description, category, section, unit, price, image, stock_status)
values
  ('foodstuff-bic-j6maxi-lighter', 'BIC Maxi J6 lighter', 'Colour is selected at random for each piece; customers cannot choose the colour.', 'Household', 'foodstuff', '1 piece', 1000, '/bic_j6maxi.webp', 'in_stock')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  section = excluded.section,
  unit = excluded.unit,
  price = excluded.price,
  image = excluded.image,
  stock_status = excluded.stock_status;
