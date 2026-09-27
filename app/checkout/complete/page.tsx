"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PaymentResult = { orderId?: number; totalAmount?: number; error?: string };

export default function CheckoutCompletePage() {
  const [state, setState] = useState<"checking" | "paid" | "failed">("checking");
  const [result, setResult] = useState<PaymentResult>({});

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference") || new URLSearchParams(window.location.search).get("trxref");
    if (!reference) { setResult({ error: "No Paystack payment reference was found." }); setState("failed"); return; }
    fetch("/api/checkout/paystack/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }) })
      .then(async (response) => {
        const data = await response.json() as PaymentResult;
        if (!response.ok) throw new Error(data.error || "Payment could not be confirmed.");
        setResult(data); setState("paid"); window.localStorage.removeItem("chophub-cart");
      })
      .catch((error: unknown) => { setResult({ error: error instanceof Error ? error.message : "Payment could not be confirmed." }); setState("failed"); });
  }, []);

  return <main className="min-h-screen bg-[#fffefe] px-5 py-16 text-[#10231b]"><section className="mx-auto max-w-lg rounded-2xl border border-black/5 bg-white p-8 text-center shadow-sm">
    <h1 className="text-2xl font-black">{state === "checking" ? "Confirming your payment…" : state === "paid" ? "Payment confirmed" : "Payment not confirmed"}</h1>
    <p className="mt-3 text-sm text-[#53625d]">{state === "checking" ? "Please wait while ChopHub verifies the transaction." : state === "paid" ? `Order #${result.orderId} is paid. ChopHub will confirm item availability and preparation time before fulfilment.` : `${result.error} If money left your account, contact ChopHub with your Paystack reference before paying again.`}</p>
    {state === "paid" && result.totalAmount !== undefined && <p className="mt-4 font-bold">Paid: ₦{Number(result.totalAmount).toLocaleString()}</p>}
    <Link href="/" className="mt-6 inline-flex rounded-full bg-[#07833f] px-6 py-3 text-sm font-bold text-white">Back to ChopHub</Link>
  </section></main>;
}
