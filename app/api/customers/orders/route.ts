import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdminRequest } from "@/lib/supabase-admin";
import { readCustomerSession, customerCookieName } from "@/lib/customer-auth";

export async function GET() {
  const session = readCustomerSession((await cookies()).get(customerCookieName)?.value);

  if (!session) {
    return NextResponse.json({ error: "Please sign in to view your orders" }, { status: 401 });
  }

  try {
    const [accountOrders, legacyPhoneOrders] = await Promise.all([
      supabaseAdminRequest<Array<Record<string, unknown>>>(`orders?select=*&customer_id=eq.${session.id}&order=created_at.desc`),
      supabaseAdminRequest<Array<Record<string, unknown>>>(`orders?select=*&customer_phone=eq.${encodeURIComponent(session.phone)}&order=created_at.desc`),
    ]);
    const byId = new Map<number, Record<string, unknown>>();
    for (const order of [...accountOrders, ...legacyPhoneOrders]) byId.set(Number(order.id), order);
    return NextResponse.json([...byId.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
  } catch (error) {
    console.error("Fetching customer orders failed", error);
    return NextResponse.json({ error: "Could not load order history" }, { status: 500 });
  }
}
