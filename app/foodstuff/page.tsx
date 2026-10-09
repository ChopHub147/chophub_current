"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getGrocerySizeOptions, type GrocerySizeOption } from "@/lib/grocery-size-options";

type Product = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  pack: string;
  price: number;
  description: string;
  icon: string;
  available: boolean;
  variant_options: Array<{ name: string; price: number }>;
};

type CartItem = {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

const cartStorageKey = "chophub-cart";

type ProductSeed = readonly [string, string, string, string, number, string, string];

const products: Product[] = ([
  ["garri", "Garri", "Grains & Staples", "1 kg", 1800, "Crispy cassava flakes for drinks, soaking, and meals.", "🌾"],
  ["long-rice", "Long-grain rice", "Grains & Staples", "5 kg", 12500, "Everyday rice for family meals and special dishes.", "🍚"],
  ["ofada-rice", "Ofada rice", "Grains & Staples", "1 kg", 4200, "Locally grown aromatic rice, perfect with traditional sauces.", "🍚"],
  ["abakaliki-rice", "Abakaliki rice", "Grains & Staples", "5 kg", 11000, "Locally grown rice with a hearty texture for everyday meals.", "🍚"],
  ["basmati-rice", "Basmati rice", "Grains & Staples", "1 kg", 4500, "Fragrant long-grain rice for jollof, fried rice, and special meals.", "🍚"],
  ["brown-rice", "Brown rice", "Grains & Staples", "1 kg", 3500, "Whole-grain rice with a naturally nutty taste and texture.", "🍚"],
  ["parboiled-rice", "Parboiled rice", "Grains & Staples", "5 kg", 12000, "Firm, fluffy rice that works well for everyday cooking.", "🍚"],
  ["white-beans", "White beans", "Grains & Staples", "1 kg", 2800, "Clean, sorted beans for soups, stews, and bean dishes.", "🫘"],
  ["honey-beans", "Honey beans (Oloyin)", "Grains & Staples", "1 kg", 3200, "Naturally sweet beans ideal for porridge, moi moi, and akara.", "🫘"],
  ["yam", "Yam", "Grains & Staples", "1 tuber", 3500, "Fresh yam for pounded yam, boiled yam, fries, and other meals.", "🍠"],
  ["semolina", "Semolina", "Grains & Staples", "1 kg", 2800, "Smooth staple flour for preparing swallow and hearty meals.", "🥣"],
  ["wheat-meal", "Wheat meal", "Grains & Staples", "1 kg", 2500, "Wheat-based swallow option for traditional Nigerian soups.", "🥣"],
  ["oats", "Oats", "Grains & Staples", "500 g", 2800, "Easy-to-prepare oats for breakfast and healthy meals.", "🥣"],
  ["spaghetti", "Spaghetti", "Grains & Staples", "500 g", 1800, "Versatile pasta for quick family meals and side dishes.", "🍝"],
  ["macaroni", "Macaroni", "Grains & Staples", "500 g", 1800, "Short pasta ideal for quick meals, sauces, and salads.", "🍝"],
  ["wheat-flour", "Wheat flour", "Flours & Baking", "1 kg", 2200, "For baking, pastries, and home cooking.", "🥣"],
  ["plain-flour", "Plain flour", "Flours & Baking", "1 kg", 2000, "Versatile flour for cakes, pancakes, pastries, and cooking.", "🥣"],
  ["self-raising-flour", "Self-raising flour", "Flours & Baking", "1 kg", 2500, "Convenient baking flour with raising agents already added.", "🥣"],
  ["corn-flour", "Corn flour", "Flours & Baking", "500 g", 1500, "Fine corn flour for baking, thickening, and cooking.", "🌽"],
  ["custard", "Custard powder", "Flours & Baking", "500 g", 2200, "Smooth, creamy powder for breakfast and desserts.", "🍮"],
  ["pancake-mix", "Pancake mix", "Flours & Baking", "500 g", 2500, "Easy-to-use mix for quick homemade pancakes.", "🥞"],
  ["baking-powder", "Baking powder", "Flours & Baking", "100 g", 700, "Helps cakes, pastries, and baked goods rise.", "🧁"],
  ["baking-soda", "Baking soda", "Flours & Baking", "100 g", 600, "Useful raising agent for cakes, cookies, and baking recipes.", "🧁"],
  ["cocoa", "Cocoa powder", "Flours & Baking", "250 g", 1800, "Rich cocoa powder for cakes, drinks, and desserts.", "🍫"],
  ["icing-sugar", "Icing sugar", "Flours & Baking", "500 g", 1800, "Fine sugar for cake decoration, icing, and desserts.", "🍰"],
  ["vanilla", "Vanilla flavour", "Flours & Baking", "50 ml", 900, "Adds a sweet vanilla aroma to cakes and desserts.", "🧴"],
  ["yeast", "Yeast", "Flours & Baking", "100 g", 900, "Baking yeast for bread, doughnuts, and other dough recipes.", "🍞"],
  ["cake-mix", "Cake mix", "Flours & Baking", "500 g", 2500, "Convenient baking mix for quick homemade cakes.", "🍰"],
  ["vegetable-oil", "Vegetable oil", "Cooking Oils", "1 litre", 4200, "Everyday cooking oil for frying, stews, and sauces.", "🫗"],
  ["palm-oil", "Palm oil", "Cooking Oils", "1 litre", 3500, "Traditional red oil for soups, stews, and Nigerian dishes.", "🫗"],
  ["sunflower-oil", "Sunflower oil", "Cooking Oils", "1 litre", 5000, "Light cooking oil suitable for frying and everyday meals.", "🫗"],
  ["soybean-oil", "Soybean oil", "Cooking Oils", "1 litre", 4000, "Versatile cooking oil for frying and meal preparation.", "🫗"],
  ["canola-oil", "Canola oil", "Cooking Oils", "1 litre", 5500, "Mild-flavoured oil for cooking, frying, and baking.", "🫗"],
  ["coconut-oil", "Coconut oil", "Cooking Oils", "500 ml", 3500, "Aromatic oil for cooking, baking, and selected recipes.", "🥥"],
  ["olive-oil", "Olive oil", "Cooking Oils", "500 ml", 7000, "Premium oil for salads, cooking, marinades, and dressings.", "🫒"],
  ["sesame-oil", "Sesame oil", "Cooking Oils", "250 ml", 3500, "Fragrant oil that adds flavour to stir-fries and sauces.", "🫗"],
  ["tomato-paste", "Tomato paste", "Canned & Packaged", "400 g", 1800, "Rich tomato concentrate for stews, jollof, and sauces.", "🥫"],
  ["canned-tomatoes", "Canned tomatoes", "Canned & Packaged", "400 g", 2200, "Convenient tomatoes for sauces, soups, and stews.", "🥫"],
  ["baked-beans", "Baked beans", "Canned & Packaged", "400 g", 2000, "Ready-to-eat beans in a rich tomato sauce.", "🥫"],
  ["sweet-corn", "Canned sweet corn", "Canned & Packaged", "400 g", 1800, "Sweet corn for salads, rice dishes, and side meals.", "🌽"],
  ["canned-peas", "Canned peas", "Canned & Packaged", "400 g", 1800, "Tender peas for rice, sauces, salads, and side dishes.", "🫛"],
  ["sardines", "Sardines", "Canned & Packaged", "125 g", 2200, "Ready-to-eat canned fish for bread, rice, and quick meals.", "🐟"],
  ["canned-mackerel", "Canned mackerel", "Canned & Packaged", "155 g", 2500, "Convenient fish for stews, sauces, and quick meals.", "🐟"],
  ["tuna", "Tuna", "Canned & Packaged", "185 g", 3000, "Ready-to-use canned fish for sandwiches, salads, and meals.", "🐟"],
  ["coconut-milk", "Coconut milk", "Canned & Packaged", "400 ml", 2200, "Creamy coconut milk for sauces, curries, and desserts.", "🥥"],
  ["evaporated-milk", "Evaporated milk", "Canned & Packaged", "170 g", 1200, "Creamy canned milk for drinks, cooking, and desserts.", "🥛"],
  ["ketchup", "Tomato ketchup", "Canned & Packaged", "500 g", 2500, "Classic tomato sauce for snacks, fries, and meals.", "🍅"],
  ["mayonnaise", "Mayonnaise", "Canned & Packaged", "500 g", 3000, "Creamy spread for sandwiches, salads, and snacks.", "🥫"],
  ["maggi", "Maggi seasoning cubes", "Seasonings", "Pack", 1200, "Classic seasoning cubes for soups, stews, and everyday cooking.", "🧂"],
  ["knorr", "Knorr seasoning cubes", "Seasonings", "Pack", 1200, "Convenient seasoning for adding savoury flavour to meals.", "🧂"],
  ["curry", "Curry powder", "Seasonings", "100 g", 1000, "Aromatic spice blend for rice, chicken, stews, and sauces.", "🌿"],
  ["thyme", "Thyme", "Seasonings", "50 g", 800, "Fragrant herb for rice, meat, chicken, and stews.", "🌿"],
  ["bay-leaves", "Bay leaves", "Seasonings", "Pack", 700, "Aromatic leaves that add depth to rice, soups, and stews.", "🌿"],
  ["black-pepper", "Black pepper", "Seasonings", "50 g", 900, "Warm, peppery spice for meat, sauces, and everyday cooking.", "🌶️"],
  ["white-pepper", "White pepper", "Seasonings", "50 g", 900, "Mildly spicy seasoning for soups, sauces, and meat dishes.", "🌶️"],
  ["paprika", "Paprika", "Seasonings", "100 g", 1000, "Mild red spice that adds colour and flavour to meals.", "🌶️"],
  ["ginger-powder", "Ginger powder", "Seasonings", "100 g", 1000, "Warm, aromatic spice for cooking, baking, and drinks.", "🫚"],
  ["garlic-powder", "Garlic powder", "Seasonings", "100 g", 1000, "Convenient garlic seasoning for meat, sauces, and cooking.", "🧄"],
  ["cameroon-pepper", "Cameroon pepper", "Seasonings", "50 g", 900, "Hot, aromatic pepper for soups, stews, and traditional dishes.", "🌶️"],
  ["salt", "Salt", "Seasonings", "1 kg", 700, "Everyday kitchen essential for seasoning and cooking.", "🧂"],
  ["milo", "Milo", "Beverages", "500 g", 3500, "Chocolate malt drink powder for breakfast and hot drinks.", "🥤"],
  ["bournvita", "Bournvita", "Beverages", "500 g", 3500, "Malted chocolate drink mix for a rich breakfast beverage.", "🥤"],
  ["horlicks", "Horlicks", "Beverages", "500 g", 4500, "Malted drink mix for warm, comforting beverages.", "🥤"],
  ["tea", "Tea bags", "Beverages", "25 bags", 1800, "Convenient tea bags for a quick cup of tea.", "🍵"],
  ["coffee", "Coffee", "Beverages", "100 g", 2500, "Rich coffee for a quick morning or anytime drink.", "☕"],
  ["hot-chocolate", "Hot chocolate", "Beverages", "250 g", 2500, "Smooth chocolate drink mix for warm beverages.", "🍫"],
  ["powdered-milk", "Powdered milk", "Beverages", "500 g", 3500, "Convenient milk powder for tea, cereal, drinks, and cooking.", "🥛"],
  ["drinking-chocolate", "Drinking chocolate", "Beverages", "250 g", 2500, "Chocolate drink powder for a rich and comforting beverage.", "🍫"],
  ["fruit-juice", "Fruit juice", "Beverages", "1 litre", 2500, "Refreshing fruit drink for meals and everyday occasions.", "🧃"],
  ["malt-drink", "Malt drink", "Beverages", "330 ml", 900, "Refreshing malt beverage served chilled or with meals.", "🥤"],
  ["soft-drink", "Soft drink", "Beverages", "50 cl", 700, "Carbonated drink for meals, gatherings, and refreshments.", "🥤"],
  ["water", "Bottled water", "Beverages", "1.5 litre", 500, "Convenient drinking water for home and everyday use.", "💧"],
  ["gala", "Gala sausage roll", "Snacks", "1 pack", 800, "Convenient savoury snack filled with seasoned sausage.", "🌭"],
  ["chin-chin", "Chin chin", "Snacks", "500 g", 2500, "Crunchy Nigerian snack made from lightly sweetened dough.", "🍪"],
  ["plantain-chips", "Plantain chips", "Snacks", "100 g", 1000, "Crispy plantain slices for a tasty everyday snack.", "🍌"],
  ["potato-chips", "Potato chips", "Snacks", "100 g", 1000, "Crunchy potato snack perfect for quick bites.", "🍟"],
  ["biscuits", "Biscuits", "Snacks", "Pack", 1500, "Assorted crunchy biscuits for snacks and tea time.", "🍪"],
  ["crackers", "Crackers", "Snacks", "Pack", 1500, "Light, crispy crackers for quick snacks and spreads.", "🍘"],
  ["popcorn", "Popcorn", "Snacks", "100 g", 700, "Easy-to-prepare snack for movie nights and family time.", "🍿"],
  ["groundnuts", "Groundnuts", "Snacks", "250 g", 1500, "Crunchy roasted peanuts for a simple protein-rich snack.", "🥜"],
  ["cashews", "Cashew nuts", "Snacks", "250 g", 3500, "Crunchy nuts with a naturally rich and buttery flavour.", "🥜"],
  ["coconut-chips", "Coconut chips", "Snacks", "100 g", 1200, "Crisp coconut slices for a naturally sweet snack.", "🥥"],
  ["granola", "Granola", "Snacks", "500 g", 3500, "Crunchy oat-based mix for breakfast, yoghurt, and snacking.", "🥣"],
  ["baby-rice-cereal", "Baby rice cereal", "Baby Food", "300 g", 3500, "Packaged baby cereal; follow the age and preparation guidance on the label.", "🥣"],
  ["baby-multigrain-cereal", "Baby multigrain cereal", "Baby Food", "300 g", 3800, "Packaged multigrain baby cereal; follow the age and preparation guidance on the label.", "🥣"],
  ["baby-oat-cereal", "Baby oat cereal", "Baby Food", "300 g", 3200, "Packaged oat cereal for babies; follow the age and preparation guidance on the label.", "🥣"],
  ["apple-banana-puree", "Apple and banana baby puree", "Baby Food", "90 g pouch", 1500, "Fruit puree pouch; check the product label for age guidance and ingredients.", "🍎"],
  ["carrot-sweet-potato-puree", "Carrot and sweet potato baby puree", "Baby Food", "90 g pouch", 1500, "Vegetable puree pouch; check the product label for age guidance and ingredients.", "🥕"],
  ["baby-fruit-puree-jar", "Mixed fruit baby puree", "Baby Food", "125 g jar", 1800, "Ready-to-serve fruit puree; check the product label for age guidance and ingredients.", "🍐"],
  ["baby-puffs", "Baby snack puffs", "Baby Food", "50 g pack", 2200, "Packaged baby snack; follow the age and serving guidance on the label.", "🍼"],
  ["teething-biscuits", "Teething biscuits", "Baby Food", "100 g pack", 2500, "Packaged teething biscuits; follow the age and serving guidance on the label.", "🍪"],
  ["adult-dog-food", "Adult dog food", "Pet Food", "1 kg bag", 6500, "Packaged dog food; follow the feeding guide on the product label.", "🐕"],
  ["puppy-food", "Puppy food", "Pet Food", "1 kg bag", 7000, "Packaged puppy food; follow the feeding guide on the product label.", "🐶"],
  ["dry-cat-food", "Dry cat food", "Pet Food", "1 kg bag", 7500, "Packaged cat food; follow the feeding guide on the product label.", "🐈"],
  ["wet-cat-food", "Wet cat food", "Pet Food", "85 g pouch", 1500, "Single-serve wet cat food pouch; check the product label for feeding guidance.", "🐈"],
  ["wet-dog-food", "Wet dog food", "Pet Food", "400 g tin", 2500, "Packaged wet dog food; check the product label for feeding guidance.", "🐕"],
  ["dog-treats", "Dog treats", "Pet Food", "100 g pack", 2500, "Packaged dog treats; follow the serving guidance on the product label.", "🦴"],
  ["cat-treats", "Cat treats", "Pet Food", "60 g pack", 2000, "Packaged cat treats; follow the serving guidance on the product label.", "🐟"],
  ["fish-food-flakes", "Fish food flakes", "Pet Food", "50 g pack", 1800, "Packaged ornamental fish food; follow the feeding instructions on the label.", "🐠"],
  ["dishwashing-liquid", "Dishwashing liquid", "Household", "500 ml", 1800, "Cuts through grease and keeps dishes clean and fresh.", "🧼"],
  ["liquid-laundry-detergent", "Liquid laundry detergent", "Household", "1 litre", 3500, "Laundry aid that softens clothes, reduces static, and adds a fresh scent.", "🧴"],
  ["bar-soap", "Bar soap", "Household", "1 bar", 700, "Multipurpose soap for household washing and cleaning.", "🧼"],
  ["toilet-cleaner", "Toilet cleaner", "Household", "500 ml", 1800, "Cleaning solution for keeping toilets fresh and hygienic.", "🧴"],
  ["bleach", "Bleach", "Household", "1 litre", 1800, "Household bleach for cleaning, whitening, and disinfection.", "🧴"],
  ["disinfectant", "Disinfectant", "Household", "500 ml", 2200, "Helps clean household surfaces and maintain freshness.", "🧴"],
  ["floor-cleaner", "Floor cleaner", "Household", "1 litre", 2500, "Fresh-scented cleaner for everyday floor cleaning.", "🧴"],
  ["glass-cleaner", "Glass cleaner", "Household", "500 ml", 1800, "Helps remove dirt and marks from glass and mirrors.", "🧴"],
  ["kitchen-sponge", "Kitchen sponge", "Household", "Pack", 800, "Handy sponges for washing dishes and cleaning kitchen surfaces.", "🧽"],
  ["scouring-pad", "Scouring pad", "Household", "Pack", 700, "Durable cleaning pads for pots, pans, and tough surfaces.", "🧽"],
  ["aluminum-foil", "Aluminum foil", "Household", "10 m", 2500, "Useful for food storage, cooking, and covering dishes.", "📦"],
  ["cling-film", "Cling film", "Household", "30 m", 2500, "Convenient wrap for keeping food fresh and covered.", "📦"],
  ["storage-bags", "Food storage bags", "Household", "Pack", 1500, "Handy bags for storing snacks, ingredients, and leftovers.", "🛍️"],
  ["garbage-bags", "Garbage bags", "Household", "Pack", 1800, "Strong disposable bags for everyday household waste.", "🛍️"],
  ["paper-towels", "Paper towels", "Household", "Roll", 1800, "Absorbent towels for kitchen spills and everyday cleaning.", "🧻"],
  ["toilet-tissue", "Toilet tissue", "Household", "4 rolls", 2500, "Soft everyday tissue for household bathroom use.", "🧻"],
  ["facial-tissues", "Facial tissues", "Household", "Box", 1500, "Soft tissues for everyday personal and household use.", "🧻"],
  ["mosquito-coils", "Mosquito coils", "Household", "Pack", 1000, "Convenient household mosquito protection for outdoor and indoor use.", "🌀"],
  ["air-freshener", "Air freshener", "Household", "300 ml", 1800, "Helps keep rooms smelling fresh and pleasant.", "🌿"],
  ["laundry-pegs", "Laundry pegs", "Household", "Pack", 900, "Reusable pegs for hanging and drying clothes.", "📌"],
] as ProductSeed[]).map(([id, name, category, pack, price, description, icon]) => ({ id: `foodstuff-${id}`, name, category, subcategory: "", pack, price, description, icon, available: true, variant_options: [] }));

const groceryPhotos = {
  garri: "https://homefoodly.com/cdn/shop/files/7259.jpg?v=1752598574",
  yam: "https://www.surulerefoods.com/cdn/shop/files/Yam_Collection.jpg?v=1762123362&width=900",
  rice: "https://images.unsplash.com/photo-1651793371427-ad065df0d208?auto=format&fit=crop&w=900&q=80",
  beans: "https://images.unsplash.com/photo-1679146656308-ec92afe7b0c1?auto=format&fit=crop&w=900&q=80",
  flour: "https://images.unsplash.com/photo-1714842981153-ffeaf74e7a1a?auto=format&fit=crop&w=900&q=80",
  pasta: "https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?auto=format&fit=crop&w=900&q=80",
  oil: "https://images.unsplash.com/photo-1662058595162-10e024b1a907?auto=format&fit=crop&w=900&q=80",
  canned: "https://images.unsplash.com/photo-1622985445103-fa1f01e80709?auto=format&fit=crop&w=900&q=80",
  spices: "https://images.unsplash.com/photo-1672842056361-1838711c5aeb?auto=format&fit=crop&w=900&q=80",
  drinks: "https://images.unsplash.com/photo-1585861299373-491140ca920e?auto=format&fit=crop&w=900&q=80",
  snacks: "https://images.unsplash.com/photo-1755752917179-28746dd4dd74?auto=format&fit=crop&w=900&q=80",
  cleaning: "https://images.unsplash.com/photo-1716625300720-b34970a2d890?auto=format&fit=crop&w=900&q=80",
  tissue: "https://images.unsplash.com/photo-1599033232689-1b154cbfc2c5?auto=format&fit=crop&w=900&q=80",
} as const;

function photoForGrocery(product: Product) {
  const name = `${product.id} ${product.name}`.toLowerCase();
  if (/^(https?:\/\/|\/)/i.test(product.icon)) return product.icon;
  if (/baby|pet|puppy|kitten|dog|cat|fish food/.test(name)) return null;
  // Prefer the matching product photos already bundled with the site. The
  // external category photos below remain a fallback for products without one.
  if (/garri/.test(name)) return "/garri.jpeg";
  if (/basmati/.test(name)) return "/basmati_rice.jpg";
  if (/rice/.test(name)) return "/Long-grain_rice.webp";
  if (/baked beans/.test(name)) return "/canned_beans.webp";
  if (/honey beans/.test(name)) return "/honey-beans.webp";
  if (/yam/.test(name)) return groceryPhotos.yam;
  if (/wheat flour|plain flour|self-raising flour|corn flour/.test(name)) return "/wheat_flour.jpg";
  if (/tomato paste|canned tomatoes/.test(name)) return "/canned_tomatoes.webp";
  if (/coconut milk/.test(name)) return "/coconut_milk.jpg";
  if (/evaporated milk/.test(name)) return "/evaporated_milk.jpg";
  if (/mackerel/.test(name)) return "/mackerel_groceries.webp";
  if (/tuna/.test(name)) return "/tuna.avif";
  if (/ketchup/.test(name)) return "/ketchup.webp";
  if (/mayonnaise/.test(name)) return "/mayonnaise.webp";
  if (/sweet corn/.test(name)) return "/sweet_corn.jpg";
  if (/milo/.test(name)) return "/milo-food.webp";
  if (/bournvita/.test(name)) return "/bournvita.jpg";
  if (/horlicks/.test(name)) return "/horlicks.png";
  if (/coffee/.test(name)) return "/Coffee.jpg";
  if (/popcorn/.test(name)) return "/popcorn.jpeg";
  if (/plantain chips/.test(name)) return "/chips.webp";
  if (/chin chin/.test(name)) return "/Chin-Chin.png";
  if (/baked beans|canned|tomato paste|ketchup|mayonnaise|sardine|mackerel|tuna|evaporated milk|coconut milk/.test(name)) return groceryPhotos.canned;
  if (/white beans|honey beans|legume|peanut|groundnut|cashew/.test(name)) return groceryPhotos.beans;
  if (/rice|semolina|wheat meal|oats|grain/.test(name)) return groceryPhotos.rice;
  if (/spaghetti|macaroni|pasta/.test(name)) return groceryPhotos.pasta;
  if (/flour|custard|pancake|baking|cocoa|icing sugar|vanilla|yeast|cake mix/.test(name)) return groceryPhotos.flour;
  if (/oil/.test(name)) return groceryPhotos.oil;
  if (/seasoning|maggi|knorr|curry|thyme|bay leaf|pepper|paprika|ginger powder|garlic powder|salt/.test(name)) return groceryPhotos.spices;
  if (/beverage|milo|bournvita|horlicks|tea|coffee|chocolate|juice|malt drink|soft drink|water/.test(name)) return groceryPhotos.drinks;
  if (/snack|gala|chin chin|plantain chips|potato chips|biscuit|cracker|popcorn|granola|coconut chips/.test(name)) return groceryPhotos.snacks;
  if (/tissue|paper towel/.test(name)) return groceryPhotos.tissue;
  if (/household|clean|soap|detergent|bleach|disinfectant|sponge|scouring|foil|cling film|storage bag|garbage bag|mosquito coil|air freshener|laundry peg/.test(name)) return groceryPhotos.cleaning;
  const category = product.category.toLowerCase();
  if (category.includes("grain") || category.includes("staple")) return groceryPhotos.rice;
  if (category.includes("flour") || category.includes("baking")) return groceryPhotos.flour;
  if (category.includes("oil")) return groceryPhotos.oil;
  if (category.includes("canned") || category.includes("packaged")) return groceryPhotos.canned;
  if (category.includes("season")) return groceryPhotos.spices;
  if (category.includes("beverage")) return groceryPhotos.drinks;
  if (category.includes("snack")) return groceryPhotos.snacks;
  if (category.includes("household")) return groceryPhotos.cleaning;
  return null;
}

export default function FoodstuffPage() {
  const [catalogProducts, setCatalogProducts] = useState(products);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const categories = useMemo(() => ["All", ...Array.from(new Set(catalogProducts.map((product) => product.category.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))], [catalogProducts]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const subcategories = useMemo(() => ["All", ...Array.from(new Set(catalogProducts.filter((product) => product.category === selectedCategory).map((product) => product.subcategory.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))], [catalogProducts, selectedCategory]);
  const [showCategories, setShowCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const filteredProducts = useMemo(
    () => {
      const query = searchQuery.trim().toLowerCase();
      return catalogProducts.filter((product) => {
        const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
        const matchesSubcategory = selectedSubcategory === "All" || product.subcategory === selectedSubcategory;
        const matchesSearch = !query || `${product.name} ${product.category} ${product.subcategory} ${product.description}`.toLowerCase().includes(query);
        return matchesCategory && matchesSubcategory && matchesSearch;
      });
    },
    [catalogProducts, searchQuery, selectedCategory, selectedSubcategory]
  );

  useEffect(() => {
    fetch("/api/products?section=foodstuff", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load Groceries products");
        return response.json();
      })
      .then((databaseProducts: Array<Record<string, unknown>>) => {
        if (databaseProducts.length > 0) {
          const databaseCatalog = databaseProducts.map((product) => ({
            id: String(product.id),
            name: String(product.name),
            category: String(product.category),
            subcategory: String(product.subcategory || ""),
            pack: String(product.unit),
            price: Number(product.price),
            description: String(product.description),
            icon: String(product.image || "🛒"),
            available: product.stock_status !== "unavailable",
            variant_options: Array.isArray(product.variant_options) ? product.variant_options as Product["variant_options"] : [],
          }));
          const mergedCatalog = new Map(products.map((product) => [product.id, product]));
          for (const databaseProduct of databaseCatalog) {
            const matchingSeed = products.find((product) => product.name.trim().toLowerCase() === databaseProduct.name.trim().toLowerCase());
            if (matchingSeed && matchingSeed.id !== databaseProduct.id) mergedCatalog.delete(matchingSeed.id);
            // Database rows are authoritative when an id exists in both sources.
            mergedCatalog.set(databaseProduct.id, databaseProduct);
          }
          setCatalogProducts([...mergedCatalog.values()]);
        }
      })
      .catch(() => undefined);
  }, []);

  const addToCart = (product: Product, selectedSize: GrocerySizeOption) => {
    const stored = window.localStorage.getItem(cartStorageKey);
    const cart: CartItem[] = stored ? JSON.parse(stored) : [];
    const sizeOptions = product.variant_options.length ? product.variant_options : getGrocerySizeOptions(product.name, product.pack, product.price).map((option) => ({ name: option.unit, price: option.price }));
    const cartId = sizeOptions.length > 1 ? `${product.id}::option-${encodeURIComponent(selectedSize.unit)}` : product.id;
    const itemName = `${product.name} (${selectedSize.unit})`;
    const existing = cart.find((item) => item.id === cartId);
    const nextCart = existing
      ? cart.map((item) => item.id === cartId ? { ...item, quantity: item.quantity + 1 } : item)
      : [...cart, { id: cartId, productId: product.id, name: itemName, price: selectedSize.price, quantity: 1, image: photoForGrocery(product) || product.icon }];
    window.localStorage.setItem(cartStorageKey, JSON.stringify(nextCart));
    window.dispatchEvent(new Event("chophub-cart-updated"));
    setCartCount(nextCart.reduce((total, item) => total + item.quantity, 0));
    setAddedProductId(product.id);
    window.setTimeout(() => setAddedProductId(null), 1600);
  };

  return (
    <main className="min-h-screen bg-amber-50 text-gray-900">
      <header className="border-b border-amber-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <Link href="/" className="text-xl font-extrabold text-green-800">ChopHub</Link>
          <Link href="/" className="text-sm font-semibold text-green-700 hover:text-green-900">Change section</Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">ChopHub Groceries</p>
          <h1 className="mt-3 text-4xl font-bold text-amber-950">Stock up for home</h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-700">Packaged groceries and household essentials delivered with your ChopHub order.</p>
        </div>
        <form onSubmit={(event) => event.preventDefault()} className="mx-auto mt-8 flex max-w-2xl gap-2 rounded-2xl border border-amber-100 bg-white p-2 shadow-sm">
          <label htmlFor="groceries-search" className="sr-only">Search groceries</label>
          <span className="flex items-center px-2 text-xl text-amber-700" aria-hidden="true">⌕</span>
          <input id="groceries-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search groceries..." className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none" />
          <button type="submit" className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">Search</button>
        </form>
        <div className="mt-8">
          <button type="button" onClick={() => setShowCategories((open) => !open)} aria-expanded={showCategories} className="flex w-full items-center justify-between rounded-2xl border border-amber-100 bg-white px-4 py-3 text-left text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-50">
            <span>{selectedCategory === "All" ? "Browse grocery categories" : selectedSubcategory === "All" ? selectedCategory : `${selectedCategory} · ${selectedSubcategory}`}</span>
            <span aria-hidden="true">{showCategories ? "⌃" : "⌄"}</span>
          </button>
          {showCategories && <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-amber-100 bg-white p-3 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <button key={category} type="button" onClick={() => { setSelectedCategory(category); setSelectedSubcategory("All"); }} className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ${selectedCategory === category ? "bg-amber-600 text-white" : "text-amber-900 hover:bg-amber-50"}`}>
                {category}
              </button>
            ))}
            {selectedCategory !== "All" && subcategories.length > 1 && <div className="col-span-full flex flex-wrap gap-2 border-t border-amber-100 pt-3">{subcategories.map((subcategory) => <button key={subcategory} type="button" onClick={() => { setSelectedSubcategory(subcategory); setShowCategories(false); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedSubcategory === subcategory ? "border-amber-600 bg-amber-600 text-white" : "border-amber-200 text-amber-900 hover:bg-amber-50"}`}>{subcategory === "All" ? `All ${selectedCategory}` : subcategory}</button>)}</div>}
          </div>}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => {
            const sizeOptions = product.variant_options.length ? product.variant_options.map((option) => ({ unit: option.name, price: option.price })) : getGrocerySizeOptions(product.name, product.pack, product.price);
            const selectedSize = sizeOptions.find((option) => option.unit === selectedSizes[product.id]) ?? sizeOptions.find((option) => option.unit === product.pack) ?? sizeOptions[0];
            return (
              <article key={product.id} className={`rounded-2xl border border-amber-100 bg-white p-4 shadow-sm ${product.available ? "" : "opacity-70"}`}>
                <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-amber-50 text-5xl sm:h-40">
                  {photoForGrocery(product)
                    ? <img src={photoForGrocery(product)!} alt={`${product.name} grocery photo`} loading="lazy" className="h-full w-full object-cover" />
                    : product.icon}
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-700">{product.category}</p>
                {product.subcategory && <p className="mt-0.5 text-xs font-medium text-amber-600">{product.subcategory}</p>}
                <h2 className="mt-1 font-bold text-amber-950">{product.name}</h2>
                {sizeOptions.length > 1 ? (
                  <label className="mt-2 flex items-center justify-between gap-2 text-xs font-medium text-gray-600">
                    <span>{product.variant_options.length ? "Option" : "Size"}</span>
                    <select value={selectedSize.unit} onChange={(event) => setSelectedSizes((current) => ({ ...current, [product.id]: event.target.value }))} aria-label={`Choose size for ${product.name}`} className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm text-amber-950">
                      {sizeOptions.map((option) => <option key={option.unit} value={option.unit}>{option.unit}</option>)}
                    </select>
                  </label>
                ) : <p className="mt-1 text-xs text-gray-500">{product.pack}</p>}
                <p className="mt-2 text-sm text-gray-600">{product.description}</p>
                {!product.available && <p className="mt-2 text-xs font-semibold text-red-600">Currently unavailable</p>}
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="font-bold text-amber-800">₦{selectedSize.price.toLocaleString()}</span>
                  <button type="button" disabled={!product.available} onClick={() => addToCart(product, selectedSize)} className="rounded-full bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">
                    {product.available ? (addedProductId === product.id ? "Added ✓" : "Add") : "Unavailable"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-600">{cartCount > 0 ? `${cartCount} item${cartCount === 1 ? "" : "s"} added to your ChopHub cart.` : "Select products to add them to your ChopHub cart."}</p>
          <Link href="/cooked-food#cart" className="mt-4 inline-block rounded-full bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700">Continue to checkout</Link>
        </div>
      </section>
    </main>
  );
}
