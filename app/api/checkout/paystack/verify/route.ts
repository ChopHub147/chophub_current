import { NextResponse } from "next/server";
import { confirmPaystackReference } from "@/lib/paystack";

export async function POST(request: Request) {
  let body: { reference?: unknown };
  try { body = await request.json() as { reference?: unknown }; }
  catch { return NextResponse.json({ error: "A Paystack reference is required." }, { status: 400 }); }
  if (typeof body.reference !== "string" || !/^CH-[A-Z0-9-]{15,80}$/i.test(body.reference)) return NextResponse.json({ error: "The payment reference is invalid." }, { status: 400 });
  try {
    const result = await confirmPaystackReference(body.reference);
    if (result.status === "not_found") return NextResponse.json({ error: "We could not find this order." }, { status: 404 });
    if (result.status === "mismatch") return NextResponse.json({ error: "The payment does not match this order. Please contact ChopHub." }, { status: 409 });
    if (result.status === "failed") return NextResponse.json({ error: "Payment was not completed." }, { status: 402 });
    return NextResponse.json({ status: result.status, orderId: result.orderId, totalAmount: result.totalAmount });
  } catch (error) {
    console.error("Paystack verification failed", error);
    return NextResponse.json({ error: "We could not verify your payment yet. Refresh to try again." }, { status: 502 });
  }
}
