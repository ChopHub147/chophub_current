import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/customer-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";
import { sendWelcomeEmail } from "@/lib/email";

type RiderRecord = { id: number; password_hash: string | null };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: unknown; phone?: unknown; email?: unknown; baseArea?: unknown; password?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const baseArea = typeof body?.baseArea === "string" ? body.baseArea.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (name.length < 2 || name.length > 100 || phone.length < 7 || phone.length > 30 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 10 || password.length > 128) {
    return NextResponse.json({ error: "Enter your name, phone number, a valid email, and a password with at least 10 characters." }, { status: 400 });
  }

  try {
    const encodedPhone = encodeURIComponent(phone);
    const [existing] = await supabaseAdminRequest<RiderRecord[]>(`riders?select=id,password_hash&phone=eq.${encodedPhone}&limit=1`);
    if (existing?.password_hash) {
      return NextResponse.json({ error: "An account already exists for this phone number. Please sign in." }, { status: 409 });
    }
    const [existingEmail] = await supabaseAdminRequest<Array<{ id: number }>>(`riders?select=id&email=ilike.${encodeURIComponent(email)}&limit=1`);
    if (existingEmail && existingEmail.id !== existing?.id) {
      return NextResponse.json({ error: "An account already uses this email address. Please use another email." }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    if (existing) {
      await supabaseAdminRequest(`riders?id=eq.${existing.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ name, phone, email, base_area: baseArea, password_hash: passwordHash, account_status: "pending", availability: "offline" }),
      });
    } else {
      await supabaseAdminRequest("riders", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ name, phone, email, base_area: baseArea, password_hash: passwordHash, account_status: "pending", availability: "offline" }),
      });
    }
    const welcomeEmailSent = await sendWelcomeEmail(email, name, "rider");
    return NextResponse.json({ ok: true, pendingApproval: true, welcomeEmailSent }, { status: 201 });
  } catch (error) {
    console.error("Rider signup failed", error);
    return NextResponse.json({ error: "We could not create your rider account. Please try again." }, { status: 500 });
  }
}
