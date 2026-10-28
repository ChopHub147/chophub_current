import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";
import { sendWelcomeEmail } from "@/lib/email";

type VendorPayload = { id?: unknown; name?: unknown; phone?: unknown; address?: unknown; latitude?: unknown; longitude?: unknown; notes?: unknown; active?: unknown; productIds?: unknown; mealIds?: unknown; mealPrices?: unknown; mealDays?: unknown; onboardingData?: unknown };

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
    ...(body.onboardingData !== null && typeof body.onboardingData === "object" && !Array.isArray(body.onboardingData) ? { onboarding_data: body.onboardingData } : {}),
  };
}

function hasValidOnboardingData(body: VendorPayload) {
  if (body.onboardingData === undefined) return true;
  if (body.onboardingData === null || typeof body.onboardingData !== "object" || Array.isArray(body.onboardingData)) return false;
  return JSON.stringify(body.onboardingData).length <= 50_000;
}

function productIds(body: VendorPayload) {
  return Array.isArray(body.productIds) ? body.productIds.filter((id): id is string => typeof id === "string" && id.trim() !== "").map((id) => id.trim()) : [];
}

function mealIds(body: VendorPayload) {
  return Array.isArray(body.mealIds) ? body.mealIds.filter((id): id is number => typeof id === "number" && Number.isInteger(id)) : [];
}

function mealPrices(body: VendorPayload) {
  if (typeof body.mealPrices !== "object" || body.mealPrices === null || Array.isArray(body.mealPrices)) return {};
  const prices: Record<number, number | null> = {};
  for (const [id, price] of Object.entries(body.mealPrices)) {
    const mealId = Number(id);
    if (!Number.isInteger(mealId) || mealId < 1) continue;
    if (price === null || price === "") {
      prices[mealId] = null;
      continue;
    }
    const amount = Number(price);
    if (Number.isFinite(amount) && amount >= 0) prices[mealId] = amount;
  }
  return prices;
}

function mealDays(body: VendorPayload) {
  if (!body.mealDays || typeof body.mealDays !== "object" || Array.isArray(body.mealDays)) return {};
  const daysByMeal: Record<number, string[]> = {};
  for (const [id, days] of Object.entries(body.mealDays)) {
    const mealId = Number(id);
    if (!Number.isInteger(mealId) || mealId < 1 || !Array.isArray(days)) continue;
    daysByMeal[mealId] = [...new Set(days.filter((day): day is string => typeof day === "string" && ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(day)))];
  }
  return daysByMeal;
}

async function replaceProducts(vendorId: number, ids: string[]) {
  await supabaseAdminRequest(`vendor_products?vendor_id=eq.${vendorId}`, { method: "DELETE" });
  if (ids.length > 0) {
    await supabaseAdminRequest("vendor_products", { method: "POST", body: JSON.stringify(ids.map((product_id) => ({ vendor_id: vendorId, product_id }))) });
  }
}

async function replaceMeals(vendorId: number, ids: number[], prices: Record<number, number | null>, days: Record<number, string[]>) {
  await supabaseAdminRequest(`vendor_meals?vendor_id=eq.${vendorId}`, { method: "DELETE" });
  if (ids.length > 0) await supabaseAdminRequest("vendor_meals", { method: "POST", body: JSON.stringify(ids.map((meal_id) => ({ vendor_id: vendorId, meal_id, price: prices[meal_id] ?? null, available_days: days[meal_id] ?? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] }))) });
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
      supabaseAdminRequest<Array<{ vendor_id: number; meal_id: number; price: number | null; available_days: string[] }>>("vendor_meals?select=vendor_id,meal_id,price,available_days"),
    ]);
    return NextResponse.json(vendors.map((vendor) => {
      const vendorMeals = mealAssignments.filter((assignment) => assignment.vendor_id === vendor.id);
      return { ...vendor, onboardingData: vendor.onboarding_data ?? undefined, productIds: assignments.filter((assignment) => assignment.vendor_id === vendor.id).map((assignment) => assignment.product_id), mealIds: vendorMeals.map((assignment) => assignment.meal_id), mealPrices: Object.fromEntries(vendorMeals.map((assignment) => [assignment.meal_id, assignment.price])), mealDays: Object.fromEntries(vendorMeals.map((assignment) => [assignment.meal_id, assignment.available_days ?? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]])) };
    }));
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
    if (!hasValidOnboardingData(body)) return NextResponse.json({ error: "Vendor onboarding details must be an object under 50 KB." }, { status: 400 });
    const fields = vendorFields(body);
    if (!fields.name || !fields.phone) return NextResponse.json({ error: "Vendor name and phone are required" }, { status: 400 });
    const [vendor] = await supabaseAdminRequest<Array<{ id: number }>>("vendors", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(fields) });
    vendorId = vendor.id;
    await replaceProducts(vendor.id, productIds(body));
    await replaceMeals(vendor.id, mealIds(body), mealPrices(body), mealDays(body));
    const onboarding = body.onboardingData as { email?: unknown; ownerName?: unknown } | undefined;
    const vendorEmail = typeof onboarding?.email === "string" ? onboarding.email.trim().toLowerCase() : "";
    const ownerName = typeof onboarding?.ownerName === "string" && onboarding.ownerName.trim() ? onboarding.ownerName.trim() : fields.name;
    const welcomeEmailSent = /^\S+@\S+\.\S+$/.test(vendorEmail)
      ? await sendWelcomeEmail(vendorEmail, ownerName, "vendor")
      : false;
    return NextResponse.json({ ...vendor, ...fields, onboardingData: body.onboardingData, productIds: productIds(body), mealIds: mealIds(body), mealPrices: mealPrices(body), mealDays: mealDays(body), welcomeEmailSent });
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
    if (!hasValidOnboardingData(body)) return NextResponse.json({ error: "Vendor onboarding details must be an object under 50 KB." }, { status: 400 });
    const id = typeof body.id === "number" ? body.id : null;
    if (id === null) return NextResponse.json({ error: "Vendor id is required" }, { status: 400 });
    const fields = vendorFields(body);
    const [vendor] = Object.keys(fields).length > 0 ? await supabaseAdminRequest<Array<Record<string, unknown>>>(`vendors?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(fields) }) : [{}];
    if (Array.isArray(body.productIds)) await replaceProducts(id, productIds(body));
    if (Array.isArray(body.mealIds)) await replaceMeals(id, mealIds(body), mealPrices(body), mealDays(body));
    return NextResponse.json({ ...vendor, onboardingData: body.onboardingData, productIds: Array.isArray(body.productIds) ? productIds(body) : undefined, mealIds: Array.isArray(body.mealIds) ? mealIds(body) : undefined, mealPrices: Array.isArray(body.mealIds) ? mealPrices(body) : undefined, mealDays: Array.isArray(body.mealIds) ? mealDays(body) : undefined });
  } catch (error) {
    console.error("Vendor update request failed", error);
    return NextResponse.json({ error: `Vendor services could not be saved: ${errorMessage(error)}` }, { status: 500 });
  }
}
