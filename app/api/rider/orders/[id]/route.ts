import { NextResponse } from "next/server";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

const RIDER_STATUSES = [
  "rider_assigned",
  "pickup_in_progress",
  "items_collected",
  "out_for_delivery",
  "delivered",
  "exception",
] as const;

type RiderStatus = (typeof RIDER_STATUSES)[number];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/*
 * GET
 *
 * /api/rider/orders/[id]?riderId=1
 */
export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const riderId = searchParams.get("riderId");

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!riderId) {
      return NextResponse.json(
        { error: "Rider ID is required" },
        { status: 400 }
      );
    }

    const orders = await supabaseAdminRequest<
      Array<Record<string, unknown>>
    >(
      `orders?id=eq.${encodeURIComponent(
        id
      )}&rider_id=eq.${encodeURIComponent(riderId)}&limit=1`
    );

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: "Order not found or not assigned to this rider" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order: orders[0],
    });
  } catch (error) {
    console.error("Rider order GET failed:", error);

    return NextResponse.json(
      { error: "Failed to load rider order" },
      { status: 500 }
    );
  }
}

/*
 * PATCH
 *
 * Changes the delivery status of an order.
 *
 * Body:
 *
 * {
 *   riderId: 1,
 *   status: "pickup_in_progress"
 * }
 */
export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const riderId = body?.riderId;
    const status = body?.status as RiderStatus;

    if (!riderId) {
      return NextResponse.json(
        { error: "Rider ID is required" },
        { status: 400 }
      );
    }

    if (!status || !RIDER_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: "Invalid rider status",
          allowedStatuses: RIDER_STATUSES,
        },
        { status: 400 }
      );
    }

    /*
     * Make sure this order belongs to this rider.
     */
    const existingOrders =
      await supabaseAdminRequest<
        Array<Record<string, unknown>>
      >(
        `orders?id=eq.${encodeURIComponent(
          id
        )}&rider_id=eq.${encodeURIComponent(
          riderId
        )}&limit=1`
      );

    if (
      !existingOrders ||
      existingOrders.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Order not found or not assigned to this rider",
        },
        { status: 404 }
      );
    }

    const updatedOrders =
      await supabaseAdminRequest<
        Array<Record<string, unknown>>
      >(
        `orders?id=eq.${encodeURIComponent(id)}&rider_id=eq.${encodeURIComponent(
          riderId
        )}`,
        {
          method: "PATCH",
          headers: {
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

    if (
      !updatedOrders ||
      updatedOrders.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Order could not be updated",
        },
        { status: 500 }
      );
    }

    /*
     * If the rider has completed the delivery,
     * make the rider available again.
     */
    if (status === "delivered") {
      try {
        await supabaseAdminRequest(
          `riders?id=eq.${encodeURIComponent(riderId)}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              availability: "available",
            }),
          }
        );
      } catch (riderError) {
        console.error(
          "Could not free rider after delivery:",
          riderError
        );
      }
    }

    return NextResponse.json({
      order: updatedOrders[0],
    });
  } catch (error) {
    console.error(
      "Rider order PATCH failed:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to update rider order",
      },
      { status: 500 }
    );
  }
}