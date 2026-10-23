import { NextResponse } from "next/server";
import { getMealCatalog } from "@/lib/meals";

export const dynamic = "force-dynamic";

export async function GET() {
  const meals = await getMealCatalog();
  return NextResponse.json(meals, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
