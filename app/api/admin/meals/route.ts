import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

type MealUpdate = {
  id?: unknown;
  available?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  category?: unknown;
  image?: unknown;
};

type NewMeal = {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  category?: unknown;
  image?: unknown;
};

async function requireAdmin() {
  const session = (await cookies()).get(adminCookieName)?.value;
  return isValidAdminSession(session);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meals = await supabaseAdminRequest("meals?select=*&order=id.asc");
  return NextResponse.json(meals);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: NewMeal;
  try {
    body = (await request.json()) as NewMeal;
  } catch {
    return NextResponse.json({ error: "A valid meal is required" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const image = typeof body.image === "string" ? body.image.trim() : "";
  const price = body.price;

  if (!name || !category || typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Meal name, category, and a valid non-negative price are required" }, { status: 400 });
  }

  const meals = await supabaseAdminRequest<Array<Record<string, unknown>>>("meals", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name, category, description, image, price, available: true, vendor_name: "ChopHub" }),
  });

  return NextResponse.json(meals[0], { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as MealUpdate;
  const id = typeof body.id === "number" ? body.id : null;
  const updates = {
    ...(typeof body.available === "boolean" ? { available: body.available } : {}),
    ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
    ...(typeof body.description === "string" ? { description: body.description.trim() } : {}),
    ...(typeof body.price === "number" ? { price: body.price } : {}),
    ...(typeof body.category === "string" ? { category: body.category } : {}),
    ...(typeof body.image === "string" ? { image: body.image.trim() } : {}),
  };

  if (id === null || Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "A meal id and at least one valid field are required" }, { status: 400 });
  }

  const meals = await supabaseAdminRequest(`meals?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(updates),
  });

  return NextResponse.json(meals);
}
