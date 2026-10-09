import { NextResponse } from "next/server";
import { getAuthenticatedRider } from "@/lib/rider-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

const riderStatuses = ["pickup_in_progress", "items_collected", "out_for_delivery", "delivered", "exception"] as const;
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const rider = await getAuthenticatedRider();
    if (!rider) return NextResponse.json({ error: "Please sign in with an approved rider account." }, { status: 401 });
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    const [order] = await supabaseAdminRequest<Array<Record<string, unknown>>>(`orders?id=eq.${encodeURIComponent(id)}&rider_id=eq.${rider.id}&limit=1`);
    if (!order) return NextResponse.json({ error: "Order not found or not assigned to this rider" }, { status: 404 });
    return NextResponse.json({ order }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Rider order GET failed", error);
    return NextResponse.json({ error: "Failed to load rider order" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const rider = await getAuthenticatedRider();
    if (!rider) return NextResponse.json({ error: "Please sign in with an approved rider account." }, { status: 401 });
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    const body = await request.json().catch(() => null) as { status?: unknown } | null;
    const status = body?.status;
    if (typeof status !== "string" || !riderStatuses.includes(status as (typeof riderStatuses)[number])) {
      return NextResponse.json({ error: "Invalid rider status" }, { status: 400 });
    }

    const [existingOrder] = await supabaseAdminRequest<Array<{ id: number; status: string }>>(`orders?id=eq.${encodeURIComponent(id)}&rider_id=eq.${rider.id}&select=id,status&limit=1`);
    if (!existingOrder) return NextResponse.json({ error: "Order not found or not assigned to this rider" }, { status: 404 });
    const allowedNextStatus: Record<string, string[]> = {
      rider_assigned: ["pickup_in_progress", "exception"],
      pickup_in_progress: ["items_collected", "exception"],
      items_collected: ["out_for_delivery", "exception"],
      out_for_delivery: ["delivered", "exception"],
      exception: ["pickup_in_progress", "items_collected", "out_for_delivery", "delivered"],
    };
    if (!allowedNextStatus[existingOrder.status]?.includes(status)) {
      return NextResponse.json({ error: "That delivery status change is not allowed." }, { status: 409 });
    }

    const [order] = await supabaseAdminRequest<Array<Record<string, unknown>>>(`orders?id=eq.${encodeURIComponent(id)}&rider_id=eq.${rider.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status }),
    });
    if (!order) return NextResponse.json({ error: "Order could not be updated" }, { status: 500 });
    if (status === "delivered") {
      await supabaseAdminRequest(`riders?id=eq.${rider.id}`, { method: "PATCH", body: JSON.stringify({ availability: "available" }) });
    }
    return NextResponse.json({ order });
  } catch (error) {
    console.error("Rider order PATCH failed", error);
    return NextResponse.json({ error: "Failed to update rider order" }, { status: 500 });
  }
}
