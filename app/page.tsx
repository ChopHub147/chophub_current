import Link from "next/link";
import SiteNav from "@/components/site-nav";

const categories = [
  { title: "Cooked Food", description: "Ready-to-eat meals and treats.", href: "/cooked-food", image: "/cooked-food.png", imageClassName: "h-48 w-52", className: "bg-[#e8f9e9] text-[#073b23]" },
  { title: "Groceries", description: "Pantry essentials and household supplies.", href: "/foodstuff", image: "/foodstuff.png", imageClassName: "h-52 w-56", className: "bg-[#fff7d8] text-[#5d3218]" },
  { title: "Fresh Food", description: "Fresh ingredients, fruits, and produce.", href: "/fresh-food", image: "/fresh-food.png", imageClassName: "h-48 w-52", className: "bg-[#e6f8e9] text-[#073b23]" },
];

const benefits = [
  ["✦", "Fresh & Quality", "Products", "bg-[#dff8d9] text-[#08783d]"],
  ["⚡", "Fast & Reliable", "Delivery", "bg-[#fff0de] text-[#f26b21]"],
  ["🛡", "Trusted", "Quality", "bg-[#fff4bb] text-[#8c6800]"],
  ["♡", "Support", "Local Businesses", "bg-[#ffe0eb] text-[#e64e78]"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fffefe] pb-24 text-[#10231b]">
      <SiteNav />

      <section className="relative aspect-[3/2] overflow-hidden bg-gradient-to-b from-[#f8fff9] via-[#f8fff9] to-white sm:aspect-auto sm:min-h-[calc(100svh-76px)]">
        <div className="absolute inset-0">
          <img src="/hero-banner.png" alt="Good Food, Brighter Days" className="h-full w-full object-contain object-top sm:object-cover sm:object-center" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent via-white/70 to-white sm:h-44" aria-hidden="true" />
        </div>
        <div className="relative mx-auto h-full max-w-7xl sm:min-h-[calc(100svh-76px)]">
          <form action="/search" className="absolute left-[4%] top-[67%] flex h-[14%] w-[68%] items-center gap-2 rounded-full bg-white/95 p-[0.6%] shadow-[0_8px_20px_rgba(19,74,42,0.12)]" aria-label="Search all ChopHub sections">
            <label htmlFor="hero-search" className="sr-only">Search for food or ingredients</label>
            <span className="pl-[4%] text-[clamp(1rem,2.8vw,1.8rem)] text-[#123b27]" aria-hidden="true">⌕</span>
            <input id="hero-search" name="q" placeholder="Search for food, ingredients..." className="h-full min-w-0 flex-1 bg-transparent px-[1%] text-[clamp(0.7rem,2.2vw,1.4rem)] text-[#44565a] outline-none placeholder:text-[#718087]" />
            <button type="submit" className="h-full w-[25%] rounded-full bg-[#07833f] text-[clamp(0.7rem,2vw,1.25rem)] font-bold text-white hover:bg-[#056b34]" aria-label="Search">Search</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-10"><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{categories.map((category) => <Link key={category.title} href={category.href} className={`group relative min-h-64 overflow-hidden rounded-[1.8rem] p-5 shadow-[0_8px_24px_rgba(16,50,32,0.08)] transition hover:-translate-y-1 ${category.className}`}><div className="relative z-10 max-w-[12rem]"><h2 className="text-2xl font-black tracking-tight">{category.title}</h2><p className="mt-2 text-sm leading-5 opacity-80">{category.description}</p><span className="mt-6 inline-flex rounded-full bg-[#07833f] px-5 py-2.5 text-sm font-bold text-white">Browse →</span></div><img src={category.image} alt="" className={`absolute bottom-0 right-0 object-contain object-center mix-blend-multiply transition duration-500 group-hover:scale-105 ${category.imageClassName}`} /></Link>)}</div></section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8"><div className="relative overflow-hidden rounded-[1.8rem] bg-[#c9f2b9] px-6 py-7 sm:px-12 sm:py-9"><div className="relative z-10 max-w-md"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#16713d]">Local food, delivered</p><h2 className="mt-2 text-3xl font-black leading-tight text-[#07502a]">Fresh Food<br />at Your Doorstep</h2><p className="mt-2 text-sm text-[#24563a]">Shop local. Eat better.</p><Link href="/fresh-food" className="mt-5 inline-flex rounded-full bg-[#07833f] px-6 py-3 text-sm font-bold text-white">Order Now →</Link></div><img src="/delivery-rider.png" alt="ChopHub delivery rider" className="absolute -bottom-8 right-0 h-44 w-52 object-contain sm:right-8 sm:h-56 sm:w-64" /></div></section>

      <section className="mx-auto max-w-6xl px-5 pb-4 pt-10 sm:px-8 sm:pt-14"><h2 className="text-2xl font-black tracking-tight text-[#14252a]">Why Shop on ChopHub?</h2><div className="mt-6 grid grid-cols-2 gap-y-6 sm:grid-cols-4">{benefits.map(([icon, title, subtitle, color]) => <div key={title} className="text-center"><span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${color}`}>{icon}</span><p className="mt-3 text-sm font-bold text-[#14252a]">{title}<br /><span className="font-normal">{subtitle}</span></p></div>)}</div></section>

    </main>
  );
}
