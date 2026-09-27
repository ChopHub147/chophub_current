"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CartItem = { quantity: number };
const cartStorageKey = "chophub-cart";

const menuLinks = [
  { label: "Categories", href: "/categories" },
  { label: "Cooked Food", href: "/cooked-food" },
  { label: "Groceries", href: "/foodstuff" },
  { label: "Fresh Food", href: "/fresh-food" },
  { label: "Full Menu", href: "/menu" },
  { label: "About", href: "/cooked-food#about" },
  { label: "Contact", href: "/cooked-food#contact" },
  { label: "Orders", href: "/orders" },
  { label: "Account", href: "/account" },
];

export default function SiteNav() {
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const stored = window.localStorage.getItem(cartStorageKey);
      if (!stored) {
        setCartCount(0);
        return;
      }
      try {
        const cart = JSON.parse(stored) as CartItem[];
        setCartCount(Array.isArray(cart) ? cart.reduce((total, item) => total + (item.quantity || 0), 0) : 0);
      } catch {
        setCartCount(0);
      }
    };

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("chophub-cart-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("chophub-cart-updated", refresh);
    };
  }, []);

  const focusSearch = () => {
    const input = document.getElementById("hero-search");
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      (input as HTMLInputElement).focus();
      return;
    }

    window.location.href = "/menu#search";
  };

  return (
    <>
      <header className="border-b border-black/5 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/Chop_icon.png" alt="ChopHub" className="h-11 w-11 rounded-full object-cover" />
            <div className="leading-none">
              <span className="block text-[1.45rem] font-black tracking-tight text-[#073b23]">ChopHub</span>
              <span className="mt-1 block text-[0.55rem] font-bold tracking-[0.38em] text-[#073b23]">CALABAR</span>
            </div>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#244438] sm:flex">
            <Link href="/menu">Menu</Link>
            <Link href="/foodstuff">Groceries</Link>
            <Link href="/fresh-food">Fresh Food</Link>
          </nav>
          <div className="flex items-center gap-4 text-[#10231b]">
            <button type="button" onClick={focusSearch} className="text-2xl" aria-label="Search for food or ingredients">⌕</button>
            <Link href="/cooked-food#cart" className="relative text-2xl" aria-label={`Open cart with ${cartCount} items`}>
              🛒
              {cartCount > 0 && <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#e84958] text-[0.65rem] font-bold text-white">{cartCount}</span>}
            </Link>
            <button type="button" onClick={() => setMenuOpen(true)} className="text-2xl sm:hidden" aria-label="Open menu">☰</button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-lg font-black text-[#073b23]">Menu</span>
              <button type="button" onClick={() => setMenuOpen(false)} className="text-2xl" aria-label="Close menu">×</button>
            </div>
            <nav className="mt-6 flex flex-col gap-1">
              {menuLinks.map((link) => (
                <Link key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-[#244438] hover:bg-[#f0f9f1]">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
