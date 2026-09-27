import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdminRequest } from "@/lib/supabase-admin";
import { readCustomerSession, customerCookieName } from "@/lib/customer-auth";

const profileFields = "id,name,username,phone,email,avatar_path,delivery_address,delivery_area,delivery_latitude,delivery_longitude";

async function signedInCustomer() {
  return readCustomerSession((await cookies()).get(customerCookieName)?.value);
}

async function avatarUrl(path: unknown) {
  if (typeof path !== "string" || !path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  const response = await fetch(`${base.replace(/\/$/, "")}/storage/v1/object/sign/customer-avatars/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 3600 }), cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not create a private profile photo link");
  const result = await response.json() as { signedURL?: string };
  if (!result.signedURL) return null;
  return result.signedURL.startsWith("http") ? result.signedURL : `${base.replace(/\/$/, "")}/storage/v1${result.signedURL}`;
}

export async function GET() {
  const session = await signedInCustomer();
  if (!session) return NextResponse.json({ error: "Please sign in to view your saved details." }, { status: 401 });
  try {
    const [profile] = await supabaseAdminRequest<Array<Record<string, unknown>>>(`customers?id=eq.${session.id}&select=${profileFields}`);
    if (!profile) return NextResponse.json({ error: "Customer account was not found." }, { status: 404 });
    return NextResponse.json({ profile: { ...profile, avatar_url: await avatarUrl(profile.avatar_path) } });
  } catch (error) {
    console.error("Fetching customer profile failed", error);
    return NextResponse.json({ error: "Could not load your saved details." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await signedInCustomer();
  if (!session) return NextResponse.json({ error: "Please sign in to update your profile." }, { status: 401 });
  let body: { name?: unknown; username?: unknown; deliveryAddress?: unknown; deliveryArea?: unknown; deliveryLatitude?: unknown; deliveryLongitude?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "A valid profile update is required." }, { status: 400 }); }

  const fields: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) return NextResponse.json({ error: "Enter a valid name." }, { status: 400 });
    fields.name = body.name.trim();
  }
  if (body.username !== undefined) {
    if (typeof body.username !== "string" || !/^(?=.*[a-z])[a-z0-9_.-]{3,24}$/i.test(body.username.trim())) return NextResponse.json({ error: "Username must be 3–24 characters and include at least one letter." }, { status: 400 });
    const username = body.username.trim().toLowerCase();
    const [existing] = await supabaseAdminRequest<Array<{ id: number }>>(`customers?select=id&username=eq.${encodeURIComponent(username)}&id=neq.${session.id}`);
    if (existing) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    fields.username = username;
  }
  if (body.deliveryAddress !== undefined || body.deliveryArea !== undefined || body.deliveryLatitude !== undefined || body.deliveryLongitude !== undefined) {
    const address = typeof body.deliveryAddress === "string" ? body.deliveryAddress.trim() : "";
    const area = typeof body.deliveryArea === "string" ? body.deliveryArea.trim() : "";
    const latitude = body.deliveryLatitude;
    const longitude = body.deliveryLongitude;
    if (!address || address.length > 500 || !area || area.length > 100) return NextResponse.json({ error: "Enter a delivery address and area to save them." }, { status: 400 });
    const hasLatitude = latitude !== null && latitude !== undefined;
    const hasLongitude = longitude !== null && longitude !== undefined;
    if (hasLatitude !== hasLongitude || (hasLatitude && (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180))) return NextResponse.json({ error: "The saved map location is invalid." }, { status: 400 });
    Object.assign(fields, { delivery_address: address, delivery_area: area, delivery_latitude: hasLatitude ? latitude : null, delivery_longitude: hasLongitude ? longitude : null });
  }
  if (Object.keys(fields).length === 0) return NextResponse.json({ error: "No profile changes were provided." }, { status: 400 });

  try {
    const [profile] = await supabaseAdminRequest<Array<Record<string, unknown>>>(`customers?id=eq.${session.id}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(fields),
    });
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error("Saving customer profile failed", error);
    return NextResponse.json({ error: "Could not save your profile changes." }, { status: 500 });
  }
}
