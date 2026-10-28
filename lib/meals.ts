import { supabaseAdminRequest } from "@/lib/supabase-admin";
import { currentServiceDay } from "@/lib/service-days";

export type CatalogMeal = {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
  vendors: Array<{ id: number; name: string; price: number; sidePrices: Partial<Record<MealSide, number>> }>;
};

export const mealSides = ["Salad", "Parboiled Beans", "Fried Plantain"] as const;
export type MealSide = (typeof mealSides)[number];
type MealRow = Omit<CatalogMeal, "vendors">;
type MealAssignment = { vendor_id: number; meal_id: number; price: number | null; available_days: string[] | null };
type MealSideAssignment = { vendor_id: number; side: MealSide; price: number | null };
type MealVendor = { id: number; name: string; active: boolean; latitude: number | null; longitude: number | null };

function hasCoordinates(vendor: MealVendor) {
  return vendor.latitude !== null && vendor.longitude !== null
    && Number.isFinite(Number(vendor.latitude)) && Number.isFinite(Number(vendor.longitude))
    && Math.abs(Number(vendor.latitude)) <= 90 && Math.abs(Number(vendor.longitude)) <= 180;
}

export async function getMealCatalog(): Promise<CatalogMeal[]> {
  const today = currentServiceDay();
  const [meals, assignments, vendors, sideAssignments] = await Promise.all([
    supabaseAdminRequest<MealRow[]>("meals?select=id,name,description,price,image,category,available&order=id.asc"),
    supabaseAdminRequest<MealAssignment[]>("vendor_meals?select=vendor_id,meal_id,price,available_days"),
    supabaseAdminRequest<MealVendor[]>("vendors?select=id,name,active,latitude,longitude&active=eq.true"),
    supabaseAdminRequest<MealSideAssignment[]>("vendor_meal_sides?select=vendor_id,side,price"),
  ]);
  const eligibleVendors = new Map(vendors.filter(hasCoordinates).map((vendor) => [vendor.id, vendor]));

  return meals.filter((meal) => meal.name !== "Plain/White Rice").map((meal) => {
    const mealVendors = assignments
      .filter((assignment) => assignment.meal_id === meal.id && eligibleVendors.has(assignment.vendor_id))
      .filter((assignment) => (assignment.available_days ?? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]).includes(today))
      .flatMap((assignment) => {
        const vendor = eligibleVendors.get(assignment.vendor_id)!;
        const price = assignment.price === null ? Number(meal.price) : Number(assignment.price);
        const sidePrices = Object.fromEntries(sideAssignments
          .filter((side) => side.vendor_id === vendor.id && side.price !== null && Number(side.price) > 0)
          .map((side) => [side.side, Number(side.price)])) as Partial<Record<MealSide, number>>;
        return Number.isFinite(price) && price > 0 ? [{ id: vendor.id, name: vendor.name, price, sidePrices }] : [];
      });
    return {
      ...meal,
      price: Number(meal.price),
      vendors: mealVendors,
      available: Boolean(meal.available) && mealVendors.length > 0,
    };
  });
}
