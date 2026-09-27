"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  category: string;
  pack: string;
  price: number;
  description: string;
  icon: string;
  available: boolean;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

const cartStorageKey = "chophub-cart";
const categories = ["All", "Grains & Staples", "Flours & Baking", "Cooking Oils", "Canned & Packaged", "Seasonings", "Beverages", "Snacks", "Household"];

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
] as ProductSeed[]).map(([id, name, category, pack, price, description, icon]) => ({ id: `foodstuff-${id}`, name, category, pack, price, description, icon, available: true }));

export default function FoodstuffPage() {
  const [catalogProducts, setCatalogProducts] = useState(products);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showCategories, setShowCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const filteredProducts = useMemo(
    () => {
      const query = searchQuery.trim().toLowerCase();
      return catalogProducts.filter((product) => {
        const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
        const matchesSearch = !query || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
      });
    },
    [catalogProducts, searchQuery, selectedCategory]
  );

  useEffect(() => {
    fetch("/api/products?section=foodstuff")
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
            pack: String(product.unit),
            price: Number(product.price),
            description: String(product.description),
            icon: String(product.image || "🛒"),
            available: product.stock_status !== "unavailable",
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

  const addToCart = (product: Product) => {
    const stored = window.localStorage.getItem(cartStorageKey);
    const cart: CartItem[] = stored ? JSON.parse(stored) : [];
    const existing = cart.find((item) => item.id === product.id);
    const nextCart = existing
      ? cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...cart, { id: product.id, name: `${product.name} (${product.pack})`, price: product.price, quantity: 1, image: product.icon }];
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
            <span>{selectedCategory === "All" ? "Browse grocery categories" : selectedCategory}</span>
            <span aria-hidden="true">{showCategories ? "⌃" : "⌄"}</span>
          </button>
          {showCategories && <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-amber-100 bg-white p-3 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <button key={category} type="button" onClick={() => { setSelectedCategory(category); setShowCategories(false); }} className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ${selectedCategory === category ? "bg-amber-600 text-white" : "text-amber-900 hover:bg-amber-50"}`}>
                {category}
              </button>
            ))}
          </div>}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <article key={product.id} className={`rounded-2xl border border-amber-100 bg-white p-4 shadow-sm ${product.available ? "" : "opacity-70"}`}>
              <div className="flex h-24 items-center justify-center rounded-xl bg-amber-50 text-5xl">{product.icon}</div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-700">{product.category}</p>
              <h2 className="mt-1 font-bold text-amber-950">{product.name}</h2>
              <p className="mt-1 text-xs text-gray-500">{product.pack}</p>
              <p className="mt-2 text-sm text-gray-600">{product.description}</p>
              {!product.available && <p className="mt-2 text-xs font-semibold text-red-600">Currently unavailable</p>}
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="font-bold text-amber-800">₦{product.price.toLocaleString()}</span>
                <button type="button" disabled={!product.available} onClick={() => addToCart(product)} className="rounded-full bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">
                  {product.available ? (addedProductId === product.id ? "Added ✓" : "Add") : "Unavailable"}
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-600">{cartCount > 0 ? `${cartCount} item${cartCount === 1 ? "" : "s"} added to your ChopHub cart.` : "Select products to add them to your ChopHub cart."}</p>
          <Link href="/cooked-food#cart" className="mt-4 inline-block rounded-full bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700">Continue to checkout</Link>
        </div>
      </section>
    </main>
  );
}
