import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

type VendorPayload = { id?: unknown; name?: unknown; phone?: unknown; address?: unknown; latitude?: unknown; longitude?: unknown; notes?: unknown; active?: unknown; productIds?: unknown; mealIds?: unknown };

async function requireAdmin() {
  return isValidAdminSession((await cookies()).get(adminCookieName)?.value);
}

function vendorFields(body: VendorPayload) {
  return {
    ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
    ...(typeof body.phone === "string" ? { phone: body.phone.trim() } : {}),
    ...(typeof body.address === "string" ? { address: body.address.trim() } : {}),
    ...(typeof body.latitude === "number" && Number.isFinite(body.latitude) && body.latitude >= -90 && body.latitude <= 90 ? { latitude: body.latitude } : body.latitude === null ? { latitude: null } : {}),
    ...(typeof body.longitude === "number" && Number.isFinite(body.longitude) && body.longitude >= -180 && body.longitude <= 180 ? { longitude: body.longitude } : body.longitude === null ? { longitude: null } : {}),
    ...(typeof body.notes === "string" ? { notes: body.notes.trim() } : {}),
    ...(typeof body.active === "boolean" ? { active: body.active } : {}),
  };
}

function productIds(body: VendorPayload) {
  return Array.isArray(body.productIds) ? body.productIds.filter((id): id is string => typeof id === "string" && id.trim() !== "").map((id) => id.trim()) : [];
}

function mealIds(body: VendorPayload) {
  return Array.isArray(body.mealIds) ? body.mealIds.filter((id): id is number => typeof id === "number" && Number.isInteger(id)) : [];
}

async function replaceProducts(vendorId: number, ids: string[]) {
  await supabaseAdminRequest(`vendor_products?vendor_id=eq.${vendorId}`, { method: "DELETE" });
  if (ids.length > 0) {
    await supabaseAdminRequest("vendor_products", { method: "POST", body: JSON.stringify(ids.map((product_id) => ({ vendor_id: vendorId, product_id }))) });
  }
}

async function replaceMeals(vendorId: number, ids: number[]) {
  await supabaseAdminRequest(`vendor_meals?vendor_id=eq.${vendorId}`, { method: "DELETE" });
  if (ids.length > 0) await supabaseAdminRequest("vendor_meals", { method: "POST", body: JSON.stringify(ids.map((meal_id) => ({ vendor_id: vendorId, meal_id }))) });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown database error";
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [vendors, assignments, mealAssignments] = await Promise.all([
      supabaseAdminRequest<Array<Record<string, unknown>>>("vendors?select=*&order=name.asc"),
      supabaseAdminRequest<Array<{ vendor_id: number; product_id: string }>>("vendor_products?select=vendor_id,product_id"),
      supabaseAdminRequest<Array<{ vendor_id: number; meal_id: number }>>("vendor_meals?select=vendor_id,meal_id"),
    ]);
    return NextResponse.json(vendors.map((vendor) => ({ ...vendor, productIds: assignments.filter((assignment) => assignment.vendor_id === vendor.id).map((assignment) => assignment.product_id), mealIds: mealAssignments.filter((assignment) => assignment.vendor_id === vendor.id).map((assignment) => assignment.meal_id) })));
  } catch (error) {
    console.error("Vendor list request failed", error);
    return NextResponse.json({ error: `Could not load vendor services: ${errorMessage(error)}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let vendorId: number | undefined;
  try {
    const body = (await request.json()) as VendorPayload;
    const fields = vendorFields(body);
    if (!fields.name || !fields.phone) return NextResponse.json({ error: "Vendor name and phone are required" }, { status: 400 });
    const [vendor] = await supabaseAdminRequest<Array<{ id: number }>>("vendors", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(fields) });
    vendorId = vendor.id;
    await replaceProducts(vendor.id, productIds(body));
    await replaceMeals(vendor.id, mealIds(body));
    return NextResponse.json({ ...vendor, ...fields, productIds: productIds(body), mealIds: mealIds(body) });
  } catch (error) {
    if (vendorId !== undefined) await supabaseAdminRequest(`vendors?id=eq.${vendorId}`, { method: "DELETE" }).catch((rollbackError) => console.error("Could not roll back incomplete vendor save", rollbackError));
    console.error("Vendor create request failed", error);
    return NextResponse.json({ error: `Vendor could not be saved: ${errorMessage(error)}` }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as VendorPayload;
    const id = typeof body.id === "number" ? body.id : null;
    if (id === null) return NextResponse.json({ error: "Vendor id is required" }, { status: 400 });
    const fields = vendorFields(body);
    const [vendor] = Object.keys(fields).length > 0 ? await supabaseAdminRequest<Array<Record<string, unknown>>>(`vendors?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(fields) }) : [{}];
    if (Array.isArray(body.productIds)) await replaceProducts(id, productIds(body));
    if (Array.isArray(body.mealIds)) await replaceMeals(id, mealIds(body));
    return NextResponse.json({ ...vendor, productIds: Array.isArray(body.productIds) ? productIds(body) : undefined, mealIds: Array.isArray(body.mealIds) ? mealIds(body) : undefined });
  } catch (error) {
    console.error("Vendor update request failed", error);
    return NextResponse.json({ error: `Vendor services could not be saved: ${errorMessage(error)}` }, { status: 500 });
  }
}
