import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

type RiderPayload = {
  id?: unknown;
  name?: unknown;
  phone?: unknown;
  baseArea?: unknown;
  availability?: unknown;
};

async function requireAdmin() {
  return isValidAdminSession((await cookies()).get(adminCookieName)?.value);
}

function riderFields(body: RiderPayload) {
  return {
    ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
    ...(typeof body.phone === "string" ? { phone: body.phone.trim() } : {}),
    ...(typeof body.baseArea === "string" ? { base_area: body.baseArea.trim() } : {}),
    ...(body.availability === "available" || body.availability === "busy" || body.availability === "offline" ? { availability: body.availability } : {}),
  };
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await supabaseAdminRequest("riders?select=*&order=name.asc"));
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fields = riderFields((await request.json()) as RiderPayload);
  if (!fields.name || !fields.phone) return NextResponse.json({ error: "Rider name and phone are required" }, { status: 400 });
  return NextResponse.json(await supabaseAdminRequest("riders", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(fields) }));
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as RiderPayload;
  const id = typeof body.id === "number" ? body.id : null;
  const fields = riderFields(body);
  if (id === null || Object.keys(fields).length === 0) return NextResponse.json({ error: "A rider id and update are required" }, { status: 400 });
  return NextResponse.json(await supabaseAdminRequest(`riders?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(fields) }));
}
