import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdminRequest } from "@/lib/supabase-admin";
import { createCustomerSession, customerCookieName, hashPassword } from "@/lib/customer-auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: unknown; username?: unknown; phone?: unknown; email?: unknown; password?: unknown };

  if (
    typeof body.name !== "string" || !body.name.trim() ||
    typeof body.phone !== "string" || !body.phone.trim() ||
    typeof body.username !== "string" || !/^(?=.*[a-z])[a-z0-9_.-]{3,24}$/i.test(body.username.trim()) ||
    typeof body.email !== "string" || !/^\S+@\S+\.\S+$/.test(body.email.trim()) ||
    typeof body.password !== "string" || body.password.length < 6
  ) {
    return NextResponse.json({ error: "Name, username (3–24 characters, including a letter), phone, a valid email, and a password of at least 6 characters are required" }, { status: 400 });
  }

  try {
    const phone = (body.phone as string).trim();
    const [existing] = await supabaseAdminRequest<Array<{ id: number }>>(
      `customers?select=id&phone=eq.${encodeURIComponent(phone)}`
    );

    if (existing) {
      return NextResponse.json({ error: "An account with this phone number already exists" }, { status: 409 });
    }
    const username = (body.username as string).trim().toLowerCase();
    const email = (body.email as string).trim().toLowerCase();
    const [existingUsername] = await supabaseAdminRequest<Array<{ id: number }>>(`customers?select=id&username=eq.${encodeURIComponent(username)}`);
    if (existingUsername) return NextResponse.json({ error: "That username is already taken. Please choose another." }, { status: 409 });
    const [existingEmail] = await supabaseAdminRequest<Array<{ id: number }>>(`customers?select=id&email=ilike.${encodeURIComponent(email)}`);
    if (existingEmail) return NextResponse.json({ error: "An account with this email already exists. Sign in or use another email." }, { status: 409 });

    const [customer] = await supabaseAdminRequest<Array<{ id: number }>>("customers", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name: (body.name as string).trim(),
        username,
        phone,
        email,
        password_hash: hashPassword(body.password),
      }),
    });

    const welcomeEmailSent = await sendWelcomeEmail(email, (body.name as string).trim());

    const response = NextResponse.json({ ok: true, welcomeEmailSent }, { status: 201 });
    response.cookies.set(customerCookieName, createCustomerSession(customer.id, phone), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("Customer signup failed", error);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}

export async function GET() {
  const session = (await cookies()).get(customerCookieName)?.value;
  return NextResponse.json({ signedIn: Boolean(session) });
}
