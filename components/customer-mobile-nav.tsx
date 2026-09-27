"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type CartItem = { quantity: number };
const cartStorageKey = "chophub-cart";

const links = [
  { label: "Home", href: "/", icon: "⌂" },
  { label: "Categories", href: "/categories", icon: "⊞" },
  { label: "Cart", href: "/cooked-food#cart", icon: "🛒" },
  { label: "Orders", href: "/orders", icon: "♡" },
  { label: "Account", href: "/account", icon: "♙" },
];

export default function CustomerMobileNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      try {
        const cart = JSON.parse(window.localStorage.getItem(cartStorageKey) || "[]") as CartItem[];
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

  if (pathname.startsWith("/admin") || pathname.startsWith("/rider")) {
  return null;
}

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 px-5 py-3 shadow-[0_-8px_25px_rgba(10,50,30,0.08)] backdrop-blur md:hidden" aria-label="Customer navigation">
      <div className="mx-auto flex max-w-md items-end justify-between text-[0.68rem] font-medium text-[#66716c]">
        {links.map((link) => {
          const isCart = link.label === "Cart";
          const isActive = link.href === "/" ? pathname === "/" : pathname === link.href;
          return (
            <Link key={link.label} href={link.href} className={`${isCart ? "-mt-7 rounded-full bg-[#07833f] px-4 py-3 text-white shadow-lg" : isActive ? "text-[#07833f]" : ""} relative text-center`}>
              <span className="block text-xl">{link.icon}</span>
              {link.label}
              {isCart && cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#e84958] text-[0.65rem] font-bold text-white">{cartCount}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
