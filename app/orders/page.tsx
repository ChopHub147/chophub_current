"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Order = {
  id: number;
  created_at: string;
  subtotal: number;
  total_amount?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  delivery_distance_km?: number | null;
  delivery_fee?: number | null;
  extra_pickup_fee?: number | null;
  evening_driver_fee?: number | null;
  status: string;
  delivery_area: string;
};
type MealToRate = { id: number; name: string; orderIds: number[]; review: { rating: number } | null };
type RatingDraft = { rating: number; originalRating: number };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [mealsToRate, setMealsToRate] = useState<MealToRate[]>([]);
  const [ratingDrafts, setRatingDrafts] = useState<Record<number, RatingDraft>>({});
  const [error, setError] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [ratingMessage, setRatingMessage] = useState("");
  const [savingMealId, setSavingMealId] = useState<number | null>(null);

  const loadEligibleMeals = async () => {
    const response = await fetch("/api/customers/reviews", { cache: "no-store" });
    if (!response.ok) return;
    const result = await response.json() as { meals?: MealToRate[] };
    const meals = result.meals ?? [];
    setMealsToRate(meals);
    setRatingDrafts(Object.fromEntries(meals.map((meal) => [meal.id, { rating: meal.review?.rating ?? 0, originalRating: meal.review?.rating ?? 0 }])));
  };

  useEffect(() => {
    fetch("/api/customers/orders")
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          setError(data.error || "Please sign in to view your orders");
          return;
        }
        setOrders((await response.json()) as Order[]);
      })
      .catch(() => setError("Could not load order history"));
    loadEligibleMeals().catch(() => undefined);
  }, []);

  const saveRating = async (meal: MealToRate) => {
    const rating = ratingDrafts[meal.id]?.rating ?? 0;
    if (!rating || !meal.orderIds.length) return;
    setSavingMealId(meal.id);
    setRatingError("");
    setRatingMessage("");
    try {
      const response = await fetch("/api/customers/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealId: meal.id, orderId: meal.orderIds[0], rating }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save your rating.");
      setRatingMessage(`Your rating for ${meal.name} was saved.`);
      await loadEligibleMeals();
    } catch (caught) {
      setRatingError(caught instanceof Error ? caught.message : "Could not save your rating.");
    } finally {
      setSavingMealId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#fffefe] px-5 py-10 pb-24 text-[#10231b] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold text-[#07833f]">← Back to Home</Link>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Order History</h1>

        {error && (
          <div className="mt-6 rounded-2xl border border-black/5 bg-white p-6 text-center">
            <p className="text-sm text-[#53625d]">{error}</p>
            <Link href="/account" className="mt-4 inline-flex rounded-full bg-[#07833f] px-6 py-3 text-sm font-bold text-white">Sign In</Link>
          </div>
        )}

        {mealsToRate.length > 0 && <section className="mt-6 rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-green-900">Rate meals you’ve ordered</h2>
          <p className="mt-1 text-sm text-gray-600">You can rate meals from paid, delivered orders. You may update your rating later.</p>
          <div className="mt-4 space-y-3">
            {mealsToRate.map((meal) => {
              const draft = ratingDrafts[meal.id] ?? { rating: 0, originalRating: 0 };
              return <article key={meal.id} className="rounded-xl border border-green-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-green-950">{meal.name}</h3>
                  {meal.review && <span className="text-xs font-semibold text-gray-500">Your current rating: {meal.review.rating} / 5</span>}
                </div>
                <div className="mt-2 flex gap-1" role="group" aria-label={`Rate ${meal.name}`}>
                  {[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" aria-label={`${star} star${star === 1 ? "" : "s"}`} aria-pressed={draft.rating === star} onClick={() => setRatingDrafts((current) => ({ ...current, [meal.id]: { ...draft, rating: star } }))} className={`text-2xl leading-none ${star <= draft.rating ? "text-amber-500" : "text-gray-300"}`}>★</button>)}
                </div>
                <button type="button" disabled={!draft.rating || draft.rating === draft.originalRating || savingMealId === meal.id} onClick={() => saveRating(meal)} className="mt-3 rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{savingMealId === meal.id ? "Saving…" : meal.review ? "Update rating" : "Submit rating"}</button>
              </article>;
            })}
          </div>
          {ratingError && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{ratingError}</p>}
          {ratingMessage && <p role="status" className="mt-3 text-sm font-semibold text-green-700">{ratingMessage}</p>}
        </section>}

        {orders && orders.length === 0 && !error && <p className="mt-6 text-sm text-[#53625d]">You have no orders yet.</p>}

        {orders && orders.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="font-bold">Order #{order.id}</p>
                  <span className="rounded-full bg-[#f0f9f1] px-3 py-1 text-xs font-bold uppercase text-[#07833f]">{order.status}</span>
                </div>
                <p className="mt-1 text-sm text-[#53625d]">{new Date(order.created_at).toLocaleString()}</p>
                <p className="mt-1 text-sm text-[#53625d]">Delivery area: {order.delivery_area}</p>
                {order.payment_status && <p className="mt-2 text-sm font-semibold text-[#53625d]">Payment: {order.payment_status === "paid" ? "Paid" : order.payment_status === "pending" ? "Awaiting confirmation" : order.payment_status}</p>}
                <div className="mt-3 space-y-1 border-t pt-3 text-sm text-[#53625d]">
                  <p>Food: ₦{Number(order.subtotal).toLocaleString()}</p>
                  {order.total_amount != null && <>
                    <p>Route ({Number(order.delivery_distance_km || 0).toLocaleString()} km): ₦{Number(order.delivery_fee || 0).toLocaleString()}</p>
                    {Number(order.extra_pickup_fee) > 0 && <p>Additional pickup charge: ₦{Number(order.extra_pickup_fee).toLocaleString()}</p>}
                    {Number(order.evening_driver_fee) > 0 && <p>Evening driver: ₦{Number(order.evening_driver_fee).toLocaleString()}</p>}
                  </>}
                  <p className="pt-1 font-bold text-[#10231b]">Total: ₦{Number(order.total_amount ?? order.subtotal).toLocaleString()}</p>
                  {order.payment_method && <p>Payment method: {order.payment_method === "paystack" ? "Paystack" : "Bank transfer"}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
