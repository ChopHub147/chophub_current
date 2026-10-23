import { supabaseAdminRequest } from "@/lib/supabase-admin";

export type CatalogMeal = {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
  vendors: Array<{ id: number; name: string; price: number }>;
};

type MealRow = Omit<CatalogMeal, "vendors">;
type MealAssignment = { vendor_id: number; meal_id: number; price: number | null };
type MealVendor = { id: number; name: string; active: boolean; latitude: number | null; longitude: number | null };

function hasCoordinates(vendor: MealVendor) {
  return vendor.latitude !== null && vendor.longitude !== null
    && Number.isFinite(Number(vendor.latitude)) && Number.isFinite(Number(vendor.longitude))
    && Math.abs(Number(vendor.latitude)) <= 90 && Math.abs(Number(vendor.longitude)) <= 180;
}

export async function getMealCatalog(): Promise<CatalogMeal[]> {
  const [meals, assignments, vendors] = await Promise.all([
    supabaseAdminRequest<MealRow[]>("meals?select=id,name,description,price,image,category,available&order=id.asc"),
    supabaseAdminRequest<MealAssignment[]>("vendor_meals?select=vendor_id,meal_id,price"),
    supabaseAdminRequest<MealVendor[]>("vendors?select=id,name,active,latitude,longitude&active=eq.true"),
  ]);
  const eligibleVendors = new Map(vendors.filter(hasCoordinates).map((vendor) => [vendor.id, vendor]));

  return meals.map((meal) => {
    const mealVendors = assignments
      .filter((assignment) => assignment.meal_id === meal.id && eligibleVendors.has(assignment.vendor_id))
      .flatMap((assignment) => {
        const vendor = eligibleVendors.get(assignment.vendor_id)!;
        const price = assignment.price === null ? Number(meal.price) : Number(assignment.price);
        return Number.isFinite(price) && price > 0 ? [{ id: vendor.id, name: vendor.name, price }] : [];
      });
    return {
      ...meal,
      price: Number(meal.price),
      vendors: mealVendors,
      available: Boolean(meal.available) && mealVendors.length > 0,
    };
  });
}
