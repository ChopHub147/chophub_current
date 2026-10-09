import { NextResponse } from "next/server";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const [meals, assignments, vendors] = await Promise.all([
    supabaseAdminRequest<Array<Record<string, unknown>>>(
      "meals?select=id,name,description,price,image,category,available&order=id.asc"
    ),
    supabaseAdminRequest<Array<{ vendor_id: number; meal_id: number; price: number | null }>>(
      "vendor_meals?select=vendor_id,meal_id,price"
    ),
    supabaseAdminRequest<Array<{ id: number; name: string; active: boolean; latitude: number | null; longitude: number | null }>>(
      "vendors?select=id,name,active,latitude,longitude&active=eq.true"
    ),
  ]);
  const eligibleVendors = new Map(vendors
    .filter((vendor) => vendor.latitude !== null && vendor.longitude !== null
      && Number.isFinite(Number(vendor.latitude)) && Number.isFinite(Number(vendor.longitude))
      && Math.abs(Number(vendor.latitude)) <= 90 && Math.abs(Number(vendor.longitude)) <= 180)
    .map((vendor) => [vendor.id, vendor]));
  const mealsWithVendors = meals.map((meal) => ({
    ...meal,
    vendors: assignments
      .filter((assignment) => assignment.meal_id === meal.id && eligibleVendors.has(assignment.vendor_id))
      .map((assignment) => ({
        id: assignment.vendor_id,
        name: eligibleVendors.get(assignment.vendor_id)!.name,
        price: assignment.price === null ? Number(meal.price) : Number(assignment.price),
      })),
  }));

  return NextResponse.json(mealsWithVendors, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
