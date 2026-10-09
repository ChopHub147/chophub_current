import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/customer-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

type RiderRecord = { id: number; password_hash: string | null };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: unknown; phone?: unknown; baseArea?: unknown; password?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const baseArea = typeof body?.baseArea === "string" ? body.baseArea.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (name.length < 2 || name.length > 100 || phone.length < 7 || phone.length > 30 || password.length < 10 || password.length > 128) {
    return NextResponse.json({ error: "Enter your name, phone number, and a password with at least 10 characters." }, { status: 400 });
  }

  try {
    const encodedPhone = encodeURIComponent(phone);
    const [existing] = await supabaseAdminRequest<RiderRecord[]>(`riders?select=id,password_hash&phone=eq.${encodedPhone}&limit=1`);
    if (existing?.password_hash) {
      return NextResponse.json({ error: "An account already exists for this phone number. Please sign in." }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    if (existing) {
      await supabaseAdminRequest(`riders?id=eq.${existing.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ name, base_area: baseArea, password_hash: passwordHash, account_status: "pending", availability: "offline" }),
      });
    } else {
      await supabaseAdminRequest("riders", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ name, phone, base_area: baseArea, password_hash: passwordHash, account_status: "pending", availability: "offline" }),
      });
    }
    return NextResponse.json({ ok: true, pendingApproval: true }, { status: 201 });
  } catch (error) {
    console.error("Rider signup failed", error);
    return NextResponse.json({ error: "We could not create your rider account. Please try again." }, { status: 500 });
  }
}
