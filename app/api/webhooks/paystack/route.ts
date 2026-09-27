import { NextResponse } from "next/server";
import { confirmPaystackReference, isValidPaystackSignature } from "@/lib/paystack";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!isValidPaystackSignature(rawBody, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }
  try {
    const event = JSON.parse(rawBody) as { event?: string; data?: { reference?: unknown } };
    if (event.event !== "charge.success" || typeof event.data?.reference !== "string") return NextResponse.json({ received: true });
    await confirmPaystackReference(event.data.reference);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook handling failed", error);
    return NextResponse.json({ error: "Could not process Paystack event." }, { status: 500 });
  }
}
