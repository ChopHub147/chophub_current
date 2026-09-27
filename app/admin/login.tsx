"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError("Invalid admin email or password.");
      return;
    }

    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-widest text-green-600">
          ChopHub Admin
        </p>
        <h1 className="mt-2 text-3xl font-bold text-green-900">Sign in</h1>
        <p className="mt-2 text-sm text-gray-600">
          Use the owner account to manage ChopHub behind the scenes.
        </p>
        <label className="mt-6 block text-sm font-semibold text-gray-800">
          Email
          <input
            name="email"
            type="email"
            defaultValue="chophub@aol.com"
            required
            className="mt-1 w-full rounded-lg border border-green-200 px-3 py-2.5"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-gray-800">
          Password
          <input
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded-lg border border-green-200 px-3 py-2.5"
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-full bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in to dashboard"}
        </button>
        <p className="mt-4 text-xs text-gray-500">
          Admin access is configured with server environment variables. Never place the
          password in frontend code.
        </p>
      </form>
    </main>
  );
}
