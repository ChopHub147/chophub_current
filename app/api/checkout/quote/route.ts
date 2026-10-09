import { NextResponse } from "next/server";
import { CheckoutError, getDeliveryQuote, priceCheckoutItems, signCheckoutQuote } from "@/lib/checkout";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { items?: unknown; latitude?: unknown; longitude?: unknown; deliveryAddress?: unknown; deliveryArea?: unknown };
    const { items: initialItems } = await priceCheckoutItems(body.items);
    const deliveryQuote = await getDeliveryQuote({ items: initialItems, latitude: body.latitude, longitude: body.longitude, address: body.deliveryAddress, area: body.deliveryArea });
    const selectedVendorByItem = Object.fromEntries(deliveryQuote.selectedVendors.map(({ itemId, vendorId }) => [itemId, vendorId]));
    const { items, foodSubtotal } = await priceCheckoutItems(body.items, selectedVendorByItem);
    const quote = { ...deliveryQuote, foodSubtotal, totalAmount: foodSubtotal + deliveryQuote.fees.totalDeliveryCharges };
    const quoteToken = signCheckoutQuote({ issuedAt: Date.now(), address: typeof body.deliveryAddress === "string" ? body.deliveryAddress.trim() : "", area: typeof body.deliveryArea === "string" ? body.deliveryArea.trim() : "", items, quote });
    const { routeDistanceKm, isEvening, deliveryLatitude, deliveryLongitude, locationSource, resolvedDeliveryLocation, fees, selectedVendors, foodSubtotal: quotedFoodSubtotal, totalAmount } = quote;
    return NextResponse.json({ routeDistanceKm, isEvening, deliveryLatitude, deliveryLongitude, locationSource, ...(resolvedDeliveryLocation ? { resolvedDeliveryLocation } : {}), fees, selectedVendors, items: items.map(({ id, price, vendorId, isMeal }) => ({ id, price, vendorId, isMeal })), foodSubtotal: quotedFoodSubtotal, totalAmount, quoteToken });
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message, ...error.details }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "A valid quote request is required." }, { status: 400 });
    console.error("Checkout quote failed", error);
    return NextResponse.json({ error: "We could not calculate delivery fees right now." }, { status: 500 });
  }
}
