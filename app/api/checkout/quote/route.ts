import { NextResponse } from "next/server";
import { CheckoutError, getDeliveryQuote, priceCheckoutItems, signCheckoutQuote } from "@/lib/checkout";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { items?: unknown; latitude?: unknown; longitude?: unknown; deliveryAddress?: unknown; deliveryArea?: unknown };
    const { items, foodSubtotal } = await priceCheckoutItems(body.items);
    const quote = await getDeliveryQuote({ items, latitude: body.latitude, longitude: body.longitude, address: body.deliveryAddress, area: body.deliveryArea });
    const quoted = { ...quote, foodSubtotal, totalAmount: foodSubtotal + quote.fees.totalDeliveryCharges };
    const quoteToken = signCheckoutQuote({ issuedAt: Date.now(), address: typeof body.deliveryAddress === "string" ? body.deliveryAddress.trim() : "", area: typeof body.deliveryArea === "string" ? body.deliveryArea.trim() : "", items, quote: quoted });
    const { routeDistanceKm, isEvening, deliveryLatitude, deliveryLongitude, locationSource, resolvedDeliveryLocation, fees, foodSubtotal: quotedFoodSubtotal, totalAmount } = quoted;
    return NextResponse.json({ routeDistanceKm, isEvening, deliveryLatitude, deliveryLongitude, locationSource, ...(resolvedDeliveryLocation ? { resolvedDeliveryLocation } : {}), fees, foodSubtotal: quotedFoodSubtotal, totalAmount, quoteToken });
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message, ...error.details }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "A valid quote request is required." }, { status: 400 });
    console.error("Checkout quote failed", error);
    return NextResponse.json({ error: "We could not calculate delivery fees right now." }, { status: 500 });
  }
}
