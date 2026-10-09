import { NextResponse } from "next/server";
import { getAuthenticatedRider } from "@/lib/rider-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const rider = await getAuthenticatedRider();
    if (!rider) return NextResponse.json({ error: "Please sign in with an approved rider account." }, { status: 401 });
    const orders = await supabaseAdminRequest<Array<Record<string, unknown>>>(`orders?rider_id=eq.${rider.id}&order=created_at.desc`);
    return NextResponse.json({ orders: orders || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Rider orders failed", error);
    return NextResponse.json({ error: "Could not load rider orders", orders: [] }, { status: 500 });
  }
}
