-- Add the Baby Food and Pet Food starter products without changing existing catalog rows.
insert into public.products (id, name, description, category, section, unit, price, image, stock_status)
values
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
on conflict (id) do nothing;
