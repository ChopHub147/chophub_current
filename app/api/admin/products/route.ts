import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

type ProductPayload = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  category?: unknown;
  subcategory?: unknown;
  section?: unknown;
  unit?: unknown;
  price?: unknown;
  image?: unknown;
  stock_status?: unknown;
  variant_options?: unknown;
};

type ProductVariant = { name: string; price: number };

function productVariants(value: unknown): ProductVariant[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const variants: ProductVariant[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) return null;
    const variant = entry as Record<string, unknown>;
    if (typeof variant.name !== "string" || !variant.name.trim() || variant.name.trim().length > 80 || typeof variant.price !== "number" || !Number.isFinite(variant.price) || variant.price < 0) return null;
    const name = variant.name.trim();
    if (variants.some((existing) => existing.name.toLowerCase() === name.toLowerCase())) return null;
    variants.push({ name, price: variant.price });
  }
  return variants;
}

async function requireAdmin() {
  const session = (await cookies()).get(adminCookieName)?.value;
  return isValidAdminSession(session);
}

function productFields(body: ProductPayload) {
  return {
    ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
    ...(typeof body.description === "string" ? { description: body.description.trim() } : {}),
    ...(typeof body.category === "string" ? { category: body.category.trim() } : {}),
    ...(typeof body.subcategory === "string" ? { subcategory: body.subcategory.trim() } : {}),
    ...(body.section === "foodstuff" || body.section === "fresh-food" ? { section: body.section } : {}),
    ...(typeof body.unit === "string" ? { unit: body.unit.trim() } : {}),
    ...(typeof body.price === "number" && Number.isFinite(body.price) && body.price >= 0 ? { price: body.price } : {}),
    ...(typeof body.image === "string" ? { image: body.image.trim() } : {}),
    ...(body.variant_options !== undefined && productVariants(body.variant_options) !== null ? { variant_options: productVariants(body.variant_options) } : {}),
    ...(body.stock_status === "in_stock" || body.stock_status === "limited" || body.stock_status === "unavailable"
      ? { stock_status: body.stock_status }
      : {}),
  };
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await supabaseAdminRequest("products?select=*&order=section.asc,id.asc"));
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as ProductPayload;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const fields = productFields(body);
  if (body.variant_options !== undefined && productVariants(body.variant_options) === null) return NextResponse.json({ error: "Product options must have unique names and valid prices." }, { status: 400 });
  if (!id || !fields.name || !fields.category || !fields.section || !fields.unit || fields.price === undefined) {
    return NextResponse.json({ error: "Id, name, category, section, unit, and price are required" }, { status: 400 });
  }
  return NextResponse.json(await supabaseAdminRequest("products", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ id, ...fields }),
  }));
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as ProductPayload;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const fields = productFields(body);
  if (body.variant_options !== undefined && productVariants(body.variant_options) === null) return NextResponse.json({ error: "Product options must have unique names and valid prices." }, { status: 400 });
  if (!id || Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "A product id and at least one valid field are required" }, { status: 400 });
  }
  return NextResponse.json(await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(fields),
  }));
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A product id is required" }, { status: 400 });
  await supabaseAdminRequest(`products?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  return NextResponse.json({ success: true });
}
