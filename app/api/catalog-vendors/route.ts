import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

export async function GET() {
  const session = (await cookies()).get(adminCookieName)?.value;
  if (!isValidAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [vendors, assignments, mealAssignments] = await Promise.all([
      supabaseAdminRequest<Array<{ id: number; name: string; active: boolean }>>("vendors?select=id,name,active"),
      supabaseAdminRequest<Array<{ vendor_id: number; product_id: string }>>("vendor_products?select=vendor_id,product_id"),
      supabaseAdminRequest<Array<{ vendor_id: number; meal_id: number }>>("vendor_meals?select=vendor_id,meal_id"),
    ]);
    const activeVendors = new Map(vendors.filter((vendor) => vendor.active).map((vendor) => [vendor.id, vendor.name]));
    return NextResponse.json([
      ...assignments.map((assignment) => ({ itemId: assignment.product_id, vendor: activeVendors.get(assignment.vendor_id) })),
      ...mealAssignments.map((assignment) => ({ itemId: `meal-${assignment.meal_id}`, vendor: activeVendors.get(assignment.vendor_id) })),
    ].filter((assignment): assignment is { itemId: string; vendor: string } => Boolean(assignment.vendor)));
  } catch {
    return NextResponse.json([]);
  }
}
