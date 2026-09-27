import { NextResponse } from "next/server";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const riderId = searchParams.get("riderId");

    if (!riderId) {
      return NextResponse.json(
        { error: "Rider ID is required" },
        { status: 400 }
      );
    }

    const orders =
      await supabaseAdminRequest<
        Array<Record<string, unknown>>
      >(
        `orders?rider_id=eq.${encodeURIComponent(
          riderId
        )}&order=created_at.desc`
      );

    return NextResponse.json({
      orders: orders || [],
    });
  } catch (error) {
    console.error(
      "Rider orders failed:",
      error
    );

    return NextResponse.json(
      {
        error: "Could not load rider orders",
        orders: [],
      },
      { status: 500 }
    );
  }
}