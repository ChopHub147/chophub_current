import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

type PaymentOrder = { id: number; total_amount: number; payment_status: string | null; payment_method: string | null };

export function isValidPaystackSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const expectedBytes = Buffer.from(expected, "hex");
  const providedBytes = Buffer.from(signature, "hex");
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

export async function confirmPaystackReference(reference: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Paystack is not configured.");
  const [order] = await supabaseAdminRequest<PaymentOrder[]>(`orders?payment_reference=eq.${encodeURIComponent(reference)}&select=id,total_amount,payment_status,payment_method`);
  if (!order || order.payment_method !== "paystack") return { status: "not_found" as const };
  if (order.payment_status === "paid") return { status: "paid" as const, orderId: order.id, totalAmount: Number(order.total_amount) };

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` }, cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as {
    status?: boolean;
    message?: string;
    data?: { status?: string; reference?: string; amount?: number; requested_amount?: number; currency?: string };
  };
  if (!response.ok || !result.status || !result.data) throw new Error(result.message || "Paystack could not verify this payment.");
  const transaction = result.data;
  const amountMatches = typeof transaction.requested_amount === "number" && transaction.requested_amount === Math.round(Number(order.total_amount) * 100);
  if (transaction.reference !== reference || transaction.currency !== "NGN" || !amountMatches) return { status: "mismatch" as const };
  if (transaction.status !== "success") {
    if (order.payment_status === "pending") await supabaseAdminRequest(`orders?id=eq.${order.id}&payment_status=eq.pending`, { method: "PATCH", body: JSON.stringify({ payment_status: "failed" }) });
    return { status: "failed" as const };
  }

  const confirmed = await supabaseAdminRequest<Array<{ id: number }>>(`orders?id=eq.${order.id}&payment_method=eq.paystack&payment_status=eq.pending`, {
    method: "PATCH", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ payment_status: "paid", payment_confirmed_at: new Date().toISOString(), status: "new" }),
  });
  if (!confirmed.length) {
    const [latest] = await supabaseAdminRequest<PaymentOrder[]>(`orders?id=eq.${order.id}&select=id,total_amount,payment_status,payment_method`);
    if (latest?.payment_status === "paid") return { status: "paid" as const, orderId: order.id, totalAmount: Number(order.total_amount) };
    return { status: "failed" as const };
  }
  await supabaseAdminRequest("order_events", {
    method: "POST",
    body: JSON.stringify({ order_id: order.id, event_type: "payment_confirmed", note: "Paystack verified the full order payment." }),
  }).catch((error) => console.error("Could not record Paystack payment event", error));
  return { status: "paid" as const, orderId: order.id, totalAmount: Number(order.total_amount) };
}
