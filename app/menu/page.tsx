import Link from "next/link";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

type DatabaseMeal = {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
};

type MenuDish = [string, number, string, string, string, boolean?];

const dishes: MenuDish[] = [
  ["Afang Soup", 5000, "Rich traditional soup prepared with fresh ingredients.", "/afang.jpeg", "soup-swallow", true],
  ["Edikang Ikong", 5000, "Traditional vegetable soup loaded with assorted ingredients.", "/edikanikong.jpeg", "soup-swallow", true],
  ["Fisherman Soup", 8000, "Calabar-style seafood soup packed with fresh fish and seafood.", "/fisherman_soup.JPG", "soup-swallow"],
  ["White Soup", 5500, "Traditional white soup with a rich, aromatic taste.", "/white_soup.jpg", "soup-swallow"],
  ["Ogbono Soup", 5000, "Rich, smooth ogbono soup prepared with traditional spices.", "/ogbono.jpg", "soup-swallow"],
  ["Okro Soup", 5000, "Freshly prepared okro soup with a traditional Calabar flavor.", "/okro_.JPG", "soup-swallow"],
  ["Egusi Soup", 5000, "Rich and hearty egusi soup prepared with assorted ingredients.", "/egusi.JPG", "soup-swallow"],
  ["Oha Soup", 5000, "Traditional Oha soup with a comforting indigenous flavor.", "/oha.JPG", "soup-swallow"],
  ["Indigenous 404", 4000, "Well-seasoned, freshly prepared indigenous 404 meat.", "/404.JPG", "meat"],
  ["Indigenous Bush Meat", 4000, "Freshly prepared traditional indigenous bush meat.", "/Bushmeat.jpg", "meat"],
  ["Shawarma", 6500, "The King's Shawarma, generously filled and freshly prepared.", "/sharwama.jpeg", "meat"],
  ["Jollof Rice", 2000, "Fragrant party-style jollof rice served plain or with protein.", "/jollof.jpg", "rice"],
  ["Rice & Stew", 2000, "Steamed rice with rich, flavorful stew and protein.", "/rice_stew.jpg", "rice"],
  ["Parfait", 5000, "A creamy, layered parfait treat.", "/Parfait.webp", "dessert"],
  ["Fresh Roasted Fish", 8000, "Well-seasoned roasted fish served with spicy pepper sauce.", "/grilled_fish.JPG", "meat"],
  ["Abáchà", 4000, "Traditional African salad prepared with delicious local ingredients.", "/abacha.JPG", "dessert"],
];

const dishIds: Record<string, number> = {
  "Afang Soup": 1,
  "Edikang Ikong": 2,
  "Indigenous 404": 3,
  "Indigenous Bush Meat": 4,
  "Fisherman Soup": 5,
  "White Soup": 6,
  "Ogbono Soup": 7,
  "Okro Soup": 8,
  "Egusi Soup": 9,
  "Oha Soup": 10,
  "Fresh Roasted Fish": 11,
  "Jollof Rice": 12,
  "Rice & Stew": 13,
  Shawarma: 14,
  Parfait: 15,
  "Abáchà": 16,
};

const defaultCategoryNames: Record<string, string> = {
  "soup-swallow": "Soup and Swallow",
  meat: "Meat",
  rice: "Rice",
  dessert: "Dessert",
};

const categoryLabel = (category: string) => defaultCategoryNames[category] ?? category
  .split(/[-_\s]+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const searchQuery = q?.trim().toLowerCase() ?? "";
  let menuDishes = dishes;
  const ratingTotals = new Map<number, { total: number; count: number }>();

  try {
    const meals = await supabaseAdminRequest<DatabaseMeal[]>(
      "meals?select=id,name,description,price,image,category,available&order=id.asc"
    );
    menuDishes = meals.map((meal) => [
      meal.name,
      meal.price,
      meal.description,
      meal.image,
      meal.category,
      meal.available,
    ]);
  } catch {
    // Keep the bundled menu available if Supabase is temporarily unavailable.
  }
  try {
    const reviews = await supabaseAdminRequest<Array<{ meal_id: number; rating: number }>>("meal_reviews?select=meal_id,rating");
    for (const review of reviews) {
      const current = ratingTotals.get(review.meal_id) ?? { total: 0, count: 0 };
      current.total += Number(review.rating);
      current.count += 1;
      ratingTotals.set(review.meal_id, current);
    }
  } catch {
    // Ratings appear after the customer reviews table is installed.
  }

  const categoryNames = Object.fromEntries(menuDishes.map((dish) => [dish[4], categoryLabel(dish[4])]));
  const categoryDishes = category && category in categoryNames
    ? menuDishes.filter((dish) => dish[4] === category)
    : menuDishes;
  const filteredDishes = searchQuery
    ? categoryDishes.filter(([name, , description, , dishCategory]) =>
        `${name} ${description} ${dishCategory}`.toLowerCase().includes(searchQuery)
      )
    : categoryDishes;
  const title = category && category in categoryNames
    ? categoryNames[category as keyof typeof categoryNames]
    : "Full Menu";
  const categoryLinks = Object.entries(categoryNames).sort((a, b) => a[1].localeCompare(b[1]));
  return (
    <main className="min-h-screen bg-green-50 text-gray-900">
      <header className="bg-white border-b border-green-100">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <Link href="/cooked-food" className="text-xl font-extrabold text-green-800">ChopHub</Link>
          <Link href="/cooked-food" className="text-sm font-semibold text-green-700 hover:text-green-900">
            Back to Cooked Food
          </Link>
        </div>
      </header>
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-green-600 mb-3">
            ChopHub Calabar
          </p>
          <h1 className="text-4xl font-bold text-green-900">{title}</h1>
          <p className="text-gray-600 mt-3">
            {category ? `Explore our ${title.toLowerCase()} selection.` : "Explore everything available to order."}
          </p>
        </div>
        <form id="search" action="/menu" className="mx-auto mb-6 flex max-w-2xl gap-2 rounded-2xl border border-green-100 bg-white p-2 shadow-sm">
          <label htmlFor="menu-search" className="sr-only">Search the menu</label>
          <span className="flex items-center px-2 text-xl text-green-700" aria-hidden="true">⌕</span>
          <input id="menu-search" name="q" defaultValue={q ?? ""} placeholder="Search meals, soups, rice..." className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none" />
          {category && <input type="hidden" name="category" value={category} />}
          <button type="submit" className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">Search</button>
        </form>
        <nav aria-label="Menu categories" className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link href={q ? `/menu?q=${encodeURIComponent(q)}` : "/menu"} className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold ${!category ? "border-green-600 bg-green-600 text-white" : "border-green-100 bg-white text-green-900 hover:bg-green-50"}`}>
            All dishes
          </Link>
          {categoryLinks.map(([value, label]) => (
            <Link key={value} href={`/menu?category=${encodeURIComponent(value)}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold ${category === value ? "border-green-600 bg-green-600 text-white" : "border-green-100 bg-white text-green-900 hover:bg-green-50"}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {filteredDishes.map(([name, price, description, image, , available = true]) => (
            <article key={name} className={`bg-white rounded-2xl overflow-hidden border border-green-100 shadow-sm ${
              available ? "" : "opacity-75"
            }`}>
              <div className="h-32 md:h-44 overflow-hidden">
                <img src={image} alt={name} className="w-full h-full object-cover" />
              </div>
              <div className="p-3 md:p-4">
                <div className="flex justify-between gap-2 items-start">
                  <h2 className="font-bold text-sm md:text-base text-green-900">{name}</h2>
                  <span className="text-xs md:text-sm font-bold text-green-700 whitespace-nowrap">
                    ₦{price.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-gray-600 mt-2">{description}</p>
                {ratingTotals.has(dishIds[name]) && <p className="mt-2 text-xs font-semibold text-amber-700">★ {(ratingTotals.get(dishIds[name])!.total / ratingTotals.get(dishIds[name])!.count).toFixed(1)} <span className="font-normal text-gray-500">({ratingTotals.get(dishIds[name])!.count} verified rating{ratingTotals.get(dishIds[name])!.count === 1 ? "" : "s"})</span></p>}
                {!available && <p className="mt-3 text-sm font-semibold text-red-600">Currently unavailable</p>}
                {available ? (
                  <Link
                    href={`/cooked-food?dish=${dishIds[name]}&returnCategory=${category ?? ""}#menu`}
                    className="mt-4 block rounded-full bg-green-600 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-green-700"
                  >
                    Customize &amp; Add
                  </Link>
                ) : (
                  <span className="mt-4 block rounded-full bg-gray-200 py-2.5 text-center text-sm font-semibold text-gray-500">
                    Unavailable
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/cooked-food#menu" className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-semibold">
            Customize and Order
          </Link>
        </div>
      </section>
    </main>
  );
}
