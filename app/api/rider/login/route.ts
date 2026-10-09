import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/customer-auth";
import { createRiderSession, riderCookieName } from "@/lib/rider-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

type RiderRecord = { id: number; name: string; phone: string; password_hash: string | null; account_status: "pending" | "approved" | "suspended" };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: unknown; password?: unknown } | null;
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!phone || !password) return NextResponse.json({ error: "Enter your phone number and password." }, { status: 400 });

  try {
    const [rider] = await supabaseAdminRequest<RiderRecord[]>(`riders?select=id,name,phone,password_hash,account_status&phone=eq.${encodeURIComponent(phone)}&limit=1`);
    if (!rider?.password_hash || !verifyPassword(password, rider.password_hash)) {
      return NextResponse.json({ error: "Phone number or password is incorrect." }, { status: 401 });
    }
    if (rider.account_status !== "approved") {
      const message = rider.account_status === "pending" ? "Your account is waiting for ChopHub approval." : "This rider account is not active. Please contact ChopHub.";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const response = NextResponse.json({ rider: { id: rider.id, name: rider.name, phone: rider.phone } });
    response.cookies.set(riderCookieName, createRiderSession(rider.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 14 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("Rider login failed", error);
    return NextResponse.json({ error: "Sign-in is temporarily unavailable. Please try again." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(riderCookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
