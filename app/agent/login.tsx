"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AgentLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/agent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
      });
      if (!response.ok) {
        setError("That staff email and password could not be verified.");
        return;
      }
      router.refresh();
    } catch {
      setError("ChopHub could not reach the server. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f7f1] px-4 py-10 text-slate-900">
      <form onSubmit={submit} className="w-full max-w-md border border-emerald-100 bg-white p-7 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">ChopHub · Operations</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Staff sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Coordinate vendor confirmations, pickups, and rider handoffs.</p>
        <label className="mt-7 block text-sm font-semibold text-slate-800">
          Staff email
          <input name="email" type="email" autoComplete="username" required className="mt-1.5 min-h-11 w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
        </label>
        <label className="mt-4 block text-sm font-semibold text-slate-800">
          Password
          <input name="password" type="password" autoComplete="current-password" required className="mt-1.5 min-h-11 w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="mt-6 min-h-11 w-full bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
          {isSubmitting ? "Signing in..." : "Open operations portal"}
        </button>
      </form>
    </main>
  );
}