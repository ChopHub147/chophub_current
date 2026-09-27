import Link from "next/link";

const sections = [
  { title: "Cooked Food", description: "Ready-to-eat meals and treats.", href: "/cooked-food", image: "/cooked-food.png" },
  { title: "Groceries", description: "Pantry essentials and household supplies.", href: "/foodstuff", image: "/foodstuff.png" },
  { title: "Fresh Food", description: "Fresh ingredients, fruits, and produce.", href: "/fresh-food", image: "/fresh-food.png" },
  { title: "Full Menu", description: "Browse every dish ChopHub offers.", href: "/menu", icon: "📋" },
];

export default function CategoriesPage() {
  return (
    <main className="min-h-screen bg-[#fffefe] px-5 py-10 pb-24 text-[#10231b] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-semibold text-[#07833f]">← Back to Home</Link>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Categories</h1>
        <p className="mt-2 text-sm text-[#53625d]">Everything available to shop on ChopHub.</p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <Link key={section.title} href={section.href} className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              {"image" in section ? <img src={section.image} alt="" className="h-16 w-16 shrink-0 object-contain mix-blend-multiply" /> : <span className="text-4xl" aria-hidden="true">{section.icon}</span>}
              <div>
                <p className="font-bold">{section.title}</p>
                <p className="mt-1 text-sm text-[#53625d]">{section.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
