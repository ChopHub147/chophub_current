import Link from "next/link";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

type Meal = {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
};

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  section: "foodstuff" | "fresh-food";
  unit: string;
  price: number;
  image: string;
  stock_status: "in_stock" | "limited" | "unavailable";
};

const categoryLabels: Record<string, string> = {
  "soup-swallow": "Soup and Swallow",
  meat: "Meat",
  rice: "Rice",
  dessert: "Dessert",
};

const fallbackMeals: Meal[] = [
  { id: 1, name: "Afang Soup", description: "Rich traditional soup prepared with fresh ingredients.", price: 5000, image: "/afang.jpeg", category: "soup-swallow", available: true },
  { id: 2, name: "Edikang Ikong", description: "Traditional vegetable soup loaded with assorted ingredients.", price: 5000, image: "/edikanikong.jpeg", category: "soup-swallow", available: true },
  { id: 3, name: "Indigenous 404", description: "Well-seasoned, freshly prepared indigenous 404 meat.", price: 4000, image: "/404.JPG", category: "meat", available: true },
  { id: 4, name: "Indigenous Bush Meat", description: "Freshly prepared traditional indigenous bush meat.", price: 4000, image: "/Bushmeat.jpg", category: "meat", available: true },
  { id: 12, name: "Jollof Rice", description: "Fragrant party-style jollof rice served plain or with protein.", price: 2000, image: "/jollof.jpg", category: "rice", available: true },
  { id: 13, name: "Rice & Stew", description: "Steamed rice with rich, flavorful stew and protein.", price: 2000, image: "/rice_stew.jpg", category: "rice", available: true },
  { id: 15, name: "Parfait", description: "A creamy, layered parfait treat.", price: 5000, image: "/Parfait.webp", category: "dessert", available: true },
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const normalizedQuery = query.toLowerCase();
  let meals = fallbackMeals;
  let products: Product[] = [];

  try {
    const [databaseMeals, databaseProducts] = await Promise.all([
      supabaseAdminRequest<Meal[]>("meals?select=id,name,description,price,image,category,available&order=id.asc"),
      supabaseAdminRequest<Product[]>("products?select=id,name,description,category,section,unit,price,image,stock_status&order=section.asc,id.asc"),
    ]);
    if (databaseMeals.length > 0) meals = databaseMeals;
    products = databaseProducts;
  } catch {
    // Keep bundled meals searchable if the catalog service is temporarily unavailable.
  }

  const matches = (name: string, description: string, category: string) =>
    !normalizedQuery || `${name} ${description} ${category}`.toLowerCase().includes(normalizedQuery);
  const matchingMeals = meals.filter((meal) => matches(meal.name, meal.description, categoryLabels[meal.category] || meal.category));
  const matchingGroceries = products.filter((product) => product.section === "foodstuff" && matches(product.name, product.description, product.category));
  const matchingFreshFood = products.filter((product) => product.section === "fresh-food" && matches(product.name, product.description, product.category));
  const totalMatches = matchingMeals.length + matchingGroceries.length + matchingFreshFood.length;

  return (
    <main className="min-h-screen bg-[#f5fbf5] px-5 py-8 pb-24 text-[#10231b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-black text-[#073b23]">ChopHub</Link>
          <Link href="/" className="text-sm font-semibold text-[#07833f]">Back to home</Link>
        </div>
        <section className="mt-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#07833f]">Search all sections</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#073b23]">Find what you want to eat or buy</h1>
          <form action="/search" className="mt-6 flex max-w-2xl gap-2 rounded-2xl border border-[#d7ead9] bg-white p-2 shadow-sm">
            <label htmlFor="site-search" className="sr-only">Search all ChopHub sections</label>
            <span className="flex items-center px-2 text-xl text-[#07833f]" aria-hidden="true">⌕</span>
            <input id="site-search" name="q" defaultValue={query} autoFocus={!query} placeholder="Search meals, groceries, fresh food..." className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none" />
            <button type="submit" className="rounded-xl bg-[#07833f] px-4 py-2 text-sm font-bold text-white hover:bg-[#056b34]">Search</button>
          </form>
        </section>

        {query && <p className="mt-8 text-sm text-[#53625d]">{totalMatches} result{totalMatches === 1 ? "" : "s"} for <strong>“{query}”</strong></p>}
        {!query && <p className="mt-8 text-sm text-[#53625d]">Search across cooked meals, groceries, and fresh food.</p>}

        <div className="mt-5 grid gap-8 lg:grid-cols-3">
          <SearchGroup title="Cooked Food" href="/menu" accent="green" count={matchingMeals.length}>
            {matchingMeals.map((meal) => (
              <SearchCard key={meal.id} name={meal.name} description={meal.description} price={meal.price} image={meal.image} href={`/menu?category=${meal.category}`} available={meal.available} />
            ))}
          </SearchGroup>
          <SearchGroup title="Groceries" href="/foodstuff" accent="amber" count={matchingGroceries.length}>
            {matchingGroceries.map((product) => (
              <SearchCard key={product.id} name={product.name} description={product.description} price={product.price} image={product.image || "🛒"} href="/foodstuff" available={product.stock_status !== "unavailable"} unit={product.unit} />
            ))}
          </SearchGroup>
          <SearchGroup title="Fresh Food" href="/fresh-food" accent="emerald" count={matchingFreshFood.length}>
            {matchingFreshFood.map((product) => (
              <SearchCard key={product.id} name={product.name} description={product.description} price={product.price} image={product.image || "🥬"} href="/fresh-food" available={product.stock_status !== "unavailable"} unit={product.unit} />
            ))}
          </SearchGroup>
        </div>
      </div>
    </main>
  );
}

function SearchGroup({ title, href, accent, count, children }: { title: string; href: string; accent: "green" | "amber" | "emerald"; count: number; children: React.ReactNode }) {
  const styles = {
    green: "border-green-100 text-green-900",
    amber: "border-amber-100 text-amber-950",
    emerald: "border-emerald-100 text-emerald-950",
  }[accent];
  return (
    <section className={`rounded-2xl border bg-white p-4 shadow-sm ${styles}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">{title}</h2>
        <Link href={href} className="text-xs font-bold text-[#07833f]">Browse all →</Link>
      </div>
      <p className="mt-1 text-xs text-[#53625d]">{count} match{count === 1 ? "" : "es"}</p>
      <div className="mt-4 space-y-3">{children}</div>
      {count === 0 && <p className="mt-4 rounded-xl bg-[#f5fbf5] p-4 text-sm text-[#53625d]">No matching items in this section.</p>}
    </section>
  );
}

function SearchCard({ name, description, price, image, href, available, unit }: { name: string; description: string; price: number; image: string; href: string; available: boolean; unit?: string }) {
  return (
    <Link href={href} className="flex gap-3 rounded-xl border border-black/5 p-3 transition hover:bg-[#f5fbf5]">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f5fbf5] text-3xl">
        {image.startsWith("/") ? <img src={image} alt="" className="h-full w-full object-cover" /> : image}
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold">{name}</h3>
          <span className="shrink-0 text-sm font-bold text-[#07833f]">₦{price.toLocaleString()}</span>
        </div>
        {unit && <p className="text-xs text-[#718087]">{unit}</p>}
        <p className="mt-1 text-xs text-[#53625d]">{description}</p>
        {!available && <p className="mt-1 text-xs font-semibold text-red-600">Currently unavailable</p>}
      </div>
    </Link>
  );
}
