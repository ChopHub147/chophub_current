"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type CartItem = { quantity: number };
const cartStorageKey = "chophub-cart";

export default function GlobalCart() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      const stored = window.localStorage.getItem(cartStorageKey);
      if (!stored) {
        setCount(0);
        return;
      }

      try {
        const cart = JSON.parse(stored) as CartItem[];
        setCount(Array.isArray(cart) ? cart.reduce((total, item) => total + (item.quantity || 0), 0) : 0);
      } catch {
        setCount(0);
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

  return (
    <>
      {pathname !== "/cooked-food" && (
        <Link
          href="/cooked-food#cart"
          className="fixed right-4 top-4 z-50 hidden rounded-full bg-white p-3 text-2xl shadow-md ring-1 ring-green-100 transition hover:bg-green-50 md:block"
          aria-label={`Open cart with ${count} items`}
        >
          🛒
          {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">{count}</span>}
        </Link>
      )}
    </>
  );
}
