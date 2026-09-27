import { NextResponse } from "next/server";
import { supabaseAdminRequest } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { customerCookieName, readCustomerSession } from "@/lib/customer-auth";
import { randomUUID } from "node:crypto";
import { CheckoutError, verifyCheckoutQuote, priceCheckoutItems } from "@/lib/checkout";

type OrderRequest = {
  customerName?: unknown;
  customerEmail?: unknown;
  customerPhone?: unknown;
  deliveryAddress?: unknown;
  deliveryArea?: unknown;
  deliveryLatitude?: unknown;
  deliveryLongitude?: unknown;
  deliveryLocationConfirmed?: unknown;
  expectedTotal?: unknown;
  quoteToken?: unknown;
  paymentMethod?: unknown;
  items?: unknown;
};

const orderStatuses = [
  "new",
  "vendor_confirmation",
  "vendors_confirmed",
  "rider_assigned",
  "pickup_in_progress",
  "items_collected",
  "out_for_delivery",
  "delivered",
  "exception",
  "cancelled",
] as const;

type OrderStatus = (typeof orderStatuses)[number];

export async function POST(request: Request) {
  let body: OrderRequest;

  try {
    body = (await request.json()) as OrderRequest;
  } catch {
    return NextResponse.json(
      { error: "A valid JSON order is required" },
      { status: 400 }
    );
  }

  try {
    const requiredText = [body.customerName, body.customerPhone, body.deliveryAddress, body.deliveryArea];
    if (requiredText.some((value) => typeof value !== "string" || !value.trim())) {
      return NextResponse.json({ error: "Complete your name, phone number and delivery address." }, { status: 400 });
    }
    if (body.paymentMethod !== "paystack" && body.paymentMethod !== "bank_transfer") {
      return NextResponse.json({ error: "Choose Paystack or bank transfer through WhatsApp." }, { status: 400 });
    }
    if (body.paymentMethod === "paystack" && (typeof body.customerEmail !== "string" || !/^\S+@\S+\.\S+$/.test(body.customerEmail.trim()))) {
      return NextResponse.json({ error: "Enter a valid email address for your Paystack receipt." }, { status: 400 });
    }
    if (typeof body.expectedTotal !== "number" || !Number.isFinite(body.expectedTotal) || body.expectedTotal < 0) {
      return NextResponse.json({ error: "Review the delivery quote before submitting your order." }, { status: 400 });
    }
    const { items, foodSubtotal } = await priceCheckoutItems(body.items);
    const customerSession = readCustomerSession((await cookies()).get(customerCookieName)?.value);
    const quote = verifyCheckoutQuote(body.quoteToken, (body.deliveryAddress as string).trim(), (body.deliveryArea as string).trim(), items);
    if (quote.locationSource === "address" && body.deliveryLocationConfirmed !== true) return NextResponse.json({ error: "Confirm the matched delivery location before submitting the order." }, { status: 400 });
    const totalAmount = quote.totalAmount;
    if (Math.round(body.expectedTotal * 100) !== Math.round(totalAmount * 100) || Math.round(foodSubtotal * 100) !== Math.round(quote.foodSubtotal * 100)) return NextResponse.json({ error: "Your cart total changed. Recalculate delivery charges before continuing." }, { status: 409 });
    const customerQuote = {
      routeDistanceKm: quote.routeDistanceKm,
      isEvening: quote.isEvening,
      deliveryLatitude: quote.deliveryLatitude,
      deliveryLongitude: quote.deliveryLongitude,
      locationSource: quote.locationSource,
      ...(quote.resolvedDeliveryLocation ? { resolvedDeliveryLocation: quote.resolvedDeliveryLocation } : {}),
      fees: quote.fees,
      foodSubtotal: quote.foodSubtotal,
      totalAmount: quote.totalAmount,
    };

    const paymentReference = `CH-${Date.now()}-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    const [order] = await supabaseAdminRequest<Array<{ id: number }>>("orders", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        customer_id: customerSession?.id ?? null,
        customer_name: (body.customerName as string).trim(),
        customer_email: typeof body.customerEmail === "string" && body.customerEmail.trim() ? body.customerEmail.trim() : null,
        customer_phone: (body.customerPhone as string).trim(),
        delivery_address: (body.deliveryAddress as string).trim(),
        delivery_area: (body.deliveryArea as string).trim(),
        customer_latitude: quote.deliveryLatitude,
        customer_longitude: quote.deliveryLongitude,
        subtotal: foodSubtotal,
        food_subtotal: foodSubtotal,
        delivery_distance_km: quote.routeDistanceKm,
        delivery_fee: quote.fees.deliveryFee,
        extra_pickup_fee: quote.fees.extraPickupFee,
        evening_driver_fee: quote.fees.eveningDriverFee,
        total_amount: totalAmount,
        payment_method: body.paymentMethod,
        payment_status: "pending",
        payment_reference: paymentReference,
        pickup_vendors: quote.pickupVendors,
        status: "new",
        delivery_status: "pending",
      }),
    });

    try {
      await supabaseAdminRequest("order_items", {
        method: "POST",
        body: JSON.stringify(items.map((item) => ({ order_id: order.id, product_id: item.id, product_name: item.name, meal_name: item.name, price: item.price, unit_price: item.price, quantity: item.quantity }))),
      });
    } catch (error) {
      await supabaseAdminRequest(`orders?id=eq.${order.id}`, { method: "DELETE" }).catch(() => undefined);
      throw error;
    }

    if (body.paymentMethod === "paystack") {
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        await supabaseAdminRequest(`orders?id=eq.${order.id}`, { method: "PATCH", body: JSON.stringify({ payment_status: "failed" }) });
        return NextResponse.json({ error: "Paystack is not configured yet." }, { status: 503 });
      }
      const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: (body.customerEmail as string).trim(), amount: Math.round(totalAmount * 100), currency: "NGN", reference: paymentReference, callback_url: new URL("/checkout/complete", request.url).toString(), metadata: { order_id: order.id, cancel_action: new URL("/cooked-food#cart", request.url).toString() } }),
        cache: "no-store",
      });
      const paymentResult = await paystackResponse.json().catch(() => ({})) as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };
      if (!paystackResponse.ok || !paymentResult.status || !paymentResult.data?.authorization_url || paymentResult.data.reference !== paymentReference) {
        await supabaseAdminRequest(`orders?id=eq.${order.id}`, { method: "PATCH", body: JSON.stringify({ payment_status: "failed" }) });
        return NextResponse.json({ error: paymentResult.message || "Paystack could not start this payment. Please try again." }, { status: 502 });
      }
      return NextResponse.json({ orderId: order.id, paymentReference, authorizationUrl: paymentResult.data.authorization_url, foodSubtotal, totalAmount, quote: customerQuote }, { status: 201 });
    }

    return NextResponse.json({ orderId: order.id, paymentReference, foodSubtotal, totalAmount, quote: customerQuote }, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message, ...error.details }, { status: error.status });
    console.error("Order save failed", error);

    return NextResponse.json(
      { error: "The order could not be saved" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = (await cookies()).get(adminCookieName)?.value;

  if (!isValidAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders =
    await supabaseAdminRequest<Array<Record<string, unknown>>>(
      "orders?select=*&order=created_at.desc"
    );

  try {
    const events =
      await supabaseAdminRequest<Array<Record<string, unknown>>>(
        "order_events?select=*&order=created_at.desc"
      );

    return NextResponse.json(
      orders.map((order) => ({
        ...order,
        events: events.filter((event) => event.order_id === order.id),
      }))
    );
  } catch {
    return NextResponse.json(orders);
  }
}

export async function PATCH(request: Request) {
  const session = (await cookies()).get(adminCookieName)?.value;

  if (!isValidAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id?: unknown;
    status?: unknown;
    riderId?: unknown;
    riderName?: unknown;
    riderPhone?: unknown;
    attentionReason?: unknown;
    eventType?: unknown;
    note?: unknown;
    paymentStatus?: unknown;
  };

  const id = typeof body.id === "number" ? body.id : null;

  const status =
    typeof body.status === "string"
      ? (body.status as OrderStatus)
      : null;

  if (
    id === null ||
    (status !== null && !orderStatuses.includes(status))
  ) {
    return NextResponse.json(
      { error: "A valid order id and operation are required" },
      { status: 400 }
    );
  }

  const hasRiderId = Object.prototype.hasOwnProperty.call(body, "riderId");
  const needsFulfilmentPermission = hasRiderId || (status !== null && !["new", "cancelled", "exception"].includes(status));
  const shouldLoadPayment = needsFulfilmentPermission || body.paymentStatus === "paid";
  let currentPayment: { payment_method: string | null; payment_status: string | null } | undefined;
  if (shouldLoadPayment) {
    const [paymentOrder] = await supabaseAdminRequest<Array<{ id: number; payment_method: string | null; payment_status: string | null }>>(
      `orders?id=eq.${id}&select=id,payment_method,payment_status`
    );
    if (!paymentOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    currentPayment = paymentOrder;
  }
  if (needsFulfilmentPermission && currentPayment?.payment_status && currentPayment.payment_status !== "paid") {
    return NextResponse.json({ error: "Confirm payment before starting vendor or rider fulfilment." }, { status: 409 });
  }
  if (body.paymentStatus !== undefined && body.paymentStatus !== "paid") {
    return NextResponse.json({ error: "The only manual payment action is confirming a received bank transfer." }, { status: 400 });
  }
  if (body.paymentStatus === "paid" && (currentPayment?.payment_method !== "bank_transfer" || currentPayment.payment_status !== "pending")) {
    return NextResponse.json({ error: "Only a pending bank transfer can be confirmed manually." }, { status: 409 });
  }

  /*
   * ---------------------------------------------------------
   * RIDER ASSIGNMENT
   * ---------------------------------------------------------
   *
   * We only run this section when riderId was actually
   * included in the request.
   *
   * riderId: number = assign rider
   * riderId: null   = unassign rider
   */

  let riderAssignmentEvent:
    | {
        order_id: number;
        event_type: string;
        note: string;
      }
    | null = null;

  let riderUpdates: Record<string, unknown> = {};

  if (hasRiderId) {
    /*
     * Get the current order so we know whether another
     * rider is already assigned.
     */
    const currentOrders =
      await supabaseAdminRequest<Array<Record<string, unknown>>>(
        `orders?id=eq.${id}&select=id,rider_id,rider_name,rider_phone`
      );

    const currentOrder = currentOrders[0];

    if (!currentOrder) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const previousRiderId =
      typeof currentOrder.rider_id === "number"
        ? currentOrder.rider_id
        : null;

    /*
     * Determine whether the new value is:
     * - null = remove rider
     * - number = assign rider
     */
    const newRiderId =
      body.riderId === null
        ? null
        : typeof body.riderId === "number"
          ? body.riderId
          : null;

    /*
     * -------------------------------------------------------
     * UNASSIGN RIDER
     * -------------------------------------------------------
     */
    if (newRiderId === null) {
      if (previousRiderId !== null) {
        await supabaseAdminRequest(
          `riders?id=eq.${previousRiderId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              availability: "available",
            }),
          }
        );

        riderAssignmentEvent = {
          order_id: id,
          event_type: "rider_unassigned",
          note: "Rider was removed from this order.",
        };
      }

      riderUpdates = {
        rider_id: null,
        rider_name: "",
        rider_phone: "",
      };
    } else {
      /*
       * -------------------------------------------------------
       * GET NEW RIDER
       * -------------------------------------------------------
       */
      const riders =
        await supabaseAdminRequest<
          Array<{
            id: number;
            name: string;
            phone: string;
            availability: "available" | "busy" | "offline";
          }>
        >(
          `riders?id=eq.${newRiderId}&select=id,name,phone,availability`
        );

      const newRider = riders[0];

      if (!newRider) {
        return NextResponse.json(
          { error: "Rider not found" },
          { status: 404 }
        );
      }

      /*
       * Don't allow an unavailable rider to be assigned
       * unless that rider is already assigned to this order.
       */
      if (
        newRider.availability !== "available" &&
        newRider.id !== previousRiderId
      ) {
        return NextResponse.json(
          {
            error: `Rider ${newRider.name} is currently ${newRider.availability}.`,
          },
          { status: 409 }
        );
      }

      /*
       * -------------------------------------------------------
       * FREE OLD RIDER
       * -------------------------------------------------------
       */
      if (
        previousRiderId !== null &&
        previousRiderId !== newRider.id
      ) {
        await supabaseAdminRequest(
          `riders?id=eq.${previousRiderId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              availability: "available",
            }),
          }
        );
      }

      /*
       * -------------------------------------------------------
       * MARK NEW RIDER BUSY
       * -------------------------------------------------------
       */
      await supabaseAdminRequest(
        `riders?id=eq.${newRider.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            availability: "busy",
          }),
        }
      );

      /*
       * -------------------------------------------------------
       * SAVE RIDER ON ORDER
       * -------------------------------------------------------
       *
       * Name and phone are copied onto the order as well.
       * rider_id remains the main relationship.
       */
      riderUpdates = {
        rider_id: newRider.id,
        rider_name: newRider.name,
        rider_phone: newRider.phone,
      };

      /*
       * Automatically move the order into rider_assigned
       * when a rider is assigned, unless the admin explicitly
       * supplied another status.
       */
      if (status === null) {
        riderUpdates.status = "rider_assigned";
      }

      if (previousRiderId !== newRider.id) {
        riderAssignmentEvent = {
          order_id: id,
          event_type: "rider_assigned",
          note: `${newRider.name} (${newRider.phone}) was assigned to this order.`,
        };
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * NORMAL ORDER UPDATES
   * ---------------------------------------------------------
   */

  const updates = {
    ...riderUpdates,

    ...(status ? { status } : {}),
    ...(body.paymentStatus === "paid" ? { payment_status: "paid", payment_confirmed_at: new Date().toISOString(), status: "new" } : {}),

    /*
     * These are retained for compatibility with your
     * existing admin dashboard.
     *
     * When riderId is supplied, the values from the actual
     * rider record above take priority.
     */
    ...(!hasRiderId &&
    typeof body.riderName === "string"
      ? { rider_name: body.riderName.trim() }
      : {}),

    ...(!hasRiderId &&
    typeof body.riderPhone === "string"
      ? { rider_phone: body.riderPhone.trim() }
      : {}),

    ...(typeof body.attentionReason === "string"
      ? { attention_reason: body.attentionReason.trim() }
      : {}),
  };

  if (
    Object.keys(updates).length === 0 &&
    typeof body.eventType !== "string" &&
    riderAssignmentEvent === null
  ) {
    return NextResponse.json(
      { error: "Choose a status or log an operation" },
      { status: 400 }
    );
  }

  /*
   * ---------------------------------------------------------
   * SAVE ORDER
   * ---------------------------------------------------------
   */

  const orders =
    Object.keys(updates).length > 0
      ? await supabaseAdminRequest<Array<Record<string, unknown>>>(
          `orders?id=eq.${id}`,
          {
            method: "PATCH",
            headers: {
              Prefer: "return=representation",
            },
            body: JSON.stringify(updates),
          }
        )
      : [];

  /*
   * ---------------------------------------------------------
   * SAVE MANUAL EVENT
   * ---------------------------------------------------------
   */

  let event;

  if (typeof body.eventType === "string") {
    [event] =
      await supabaseAdminRequest<Array<Record<string, unknown>>>(
        "order_events",
        {
          method: "POST",
          headers: {
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            order_id: id,
            event_type: body.eventType,
            note:
              typeof body.note === "string"
                ? body.note.trim()
                : "",
          }),
        }
      );
  }

  /*
   * ---------------------------------------------------------
   * SAVE AUTOMATIC RIDER EVENT
   * ---------------------------------------------------------
   */

  let assignmentEvent;

  if (riderAssignmentEvent) {
    [assignmentEvent] =
      await supabaseAdminRequest<Array<Record<string, unknown>>>(
        "order_events",
        {
          method: "POST",
          headers: {
            Prefer: "return=representation",
          },
          body: JSON.stringify(riderAssignmentEvent),
        }
      );
  }

  return NextResponse.json({
    order: orders[0],
    event,
    assignmentEvent,
  });
}
