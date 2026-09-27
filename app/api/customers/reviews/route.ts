import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdminRequest } from "@/lib/supabase-admin";
import { readCustomerSession, customerCookieName } from "@/lib/customer-auth";

type EligibleOrder = { id: number };
type OrderItem = { order_id: number; product_id: string | null };
type SavedReview = { id: number; meal_id: number; order_id: number; rating: number; updated_at: string };

async function currentCustomer() {
  return readCustomerSession((await cookies()).get(customerCookieName)?.value);
}

async function listEligibleMeals(customerId: number, phone: string) {
  const orders = await supabaseAdminRequest<EligibleOrder[]>(`orders?select=id&or=(customer_id.eq.${customerId},customer_phone.eq.${encodeURIComponent(phone)})&payment_status=eq.paid&status=eq.delivered&order=id.desc`);
  if (!orders.length) return { orders, mealOrders: new Map<number, number[]>() };
  const orderIds = orders.map((order) => order.id);
  const items = await supabaseAdminRequest<OrderItem[]>(`order_items?order_id=in.(${orderIds.join(",")})&select=order_id,product_id`);
  const mealOrders = new Map<number, number[]>();
  for (const item of items) {
    const mealId = item.product_id ? Number(/^([0-9]+)(?:-|$)/.exec(item.product_id)?.[1]) : NaN;
    if (!Number.isSafeInteger(mealId) || mealId < 1) continue;
    const ids = mealOrders.get(mealId) ?? [];
    if (!ids.includes(item.order_id)) ids.push(item.order_id);
    mealOrders.set(mealId, ids);
  }
  return { orders, mealOrders };
}

export async function GET() {
  const session = await currentCustomer();
  if (!session) return NextResponse.json({ error: "Sign in to rate meals you have ordered." }, { status: 401 });
  try {
    const { mealOrders } = await listEligibleMeals(session.id, session.phone);
    const mealIds = [...mealOrders.keys()];
    if (!mealIds.length) return NextResponse.json({ meals: [] });
    const [meals, reviews] = await Promise.all([
      supabaseAdminRequest<Array<{ id: number; name: string }>>(`meals?id=in.(${mealIds.join(",")})&select=id,name&order=name.asc`),
      supabaseAdminRequest<SavedReview[]>(`meal_reviews?customer_id=eq.${session.id}&meal_id=in.(${mealIds.join(",")})&select=id,meal_id,order_id,rating,updated_at`),
    ]);
    const reviewByMeal = new Map(reviews.map((review) => [review.meal_id, review]));
    return NextResponse.json({ meals: meals.map((meal) => ({ ...meal, orderIds: mealOrders.get(meal.id) ?? [], review: reviewByMeal.get(meal.id) ?? null })) });
  } catch (error) {
    console.error("Fetching eligible meal ratings failed", error);
    return NextResponse.json({ error: "Could not load meals available for rating." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await currentCustomer();
  if (!session) return NextResponse.json({ error: "Sign in to rate meals you have ordered." }, { status: 401 });
  let body: { mealId?: unknown; orderId?: unknown; rating?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "A valid meal rating is required." }, { status: 400 }); }
  const mealId = Number(body.mealId);
  const orderId = Number(body.orderId);
  const rating = Number(body.rating);
  if (!Number.isSafeInteger(mealId) || mealId < 1 || !Number.isSafeInteger(orderId) || orderId < 1 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Choose a rating from 1 to 5 stars." }, { status: 400 });
  }
  try {
    const [order] = await supabaseAdminRequest<EligibleOrder[]>(`orders?id=eq.${orderId}&or=(customer_id.eq.${session.id},customer_phone.eq.${encodeURIComponent(session.phone)})&payment_status=eq.paid&status=eq.delivered&select=id`);
    if (!order) return NextResponse.json({ error: "You can rate a meal after its paid order has been delivered." }, { status: 403 });
    const purchased = await supabaseAdminRequest<OrderItem[]>(`order_items?order_id=eq.${orderId}&select=order_id,product_id`);
    if (!purchased.some((line) => line.product_id && new RegExp(`^${mealId}(?:-|$)`).test(line.product_id))) {
      return NextResponse.json({ error: "This meal was not included in that order." }, { status: 403 });
    }
    const [review] = await supabaseAdminRequest<SavedReview[]>("meal_reviews?on_conflict=customer_id,meal_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ customer_id: session.id, meal_id: mealId, order_id: orderId, rating, updated_at: new Date().toISOString() }),
    });
    return NextResponse.json({ ok: true, review });
  } catch (error) {
    console.error("Saving meal rating failed", error);
    return NextResponse.json({ error: "Could not save this meal rating." }, { status: 500 });
  }
}
