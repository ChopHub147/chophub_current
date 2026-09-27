import { NextResponse } from "next/server";
import { supabaseAdminRequest } from "@/lib/supabase-admin";
import { createCustomerSession, customerCookieName, verifyPassword } from "@/lib/customer-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { identifier?: unknown; phone?: unknown; password?: unknown };
  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : typeof body.phone === "string" ? body.phone.trim() : "";
  if (!identifier || identifier.length > 254 || typeof body.password !== "string") {
    return NextResponse.json({ error: "Enter your username, email address or phone number, and password." }, { status: 400 });
  }

  try {
    type CustomerLogin = { id: number; phone: string; password_hash: string };
    let customer: CustomerLogin | undefined;
    if (identifier.includes("@")) {
      if (!/^\S+@\S+\.\S+$/.test(identifier)) return NextResponse.json({ error: "Invalid sign-in details." }, { status: 401 });
      const matches = await supabaseAdminRequest<CustomerLogin[]>(`customers?select=id,phone,password_hash&email=ilike.${encodeURIComponent(identifier.toLowerCase())}`);
      customer = matches.find((candidate) => verifyPassword(body.password as string, candidate.password_hash));
    } else if (/^[+\d()\s-]+$/.test(identifier)) {
      [customer] = await supabaseAdminRequest<CustomerLogin[]>(`customers?select=id,phone,password_hash&phone=eq.${encodeURIComponent(identifier)}`);
    } else {
      const username = identifier.toLowerCase();
      [customer] = await supabaseAdminRequest<CustomerLogin[]>(`customers?select=id,phone,password_hash&username=eq.${encodeURIComponent(username)}`);
    }

    if (!customer || !verifyPassword(body.password, customer.password_hash)) {
      return NextResponse.json({ error: "Invalid sign-in details." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(customerCookieName, createCustomerSession(customer.id, customer.phone), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("Customer login failed", error);
    return NextResponse.json({ error: "Could not sign in" }, { status: 500 });
  }
}
