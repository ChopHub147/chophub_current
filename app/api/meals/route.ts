import { NextResponse } from "next/server";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const meals = await supabaseAdminRequest(
    "meals?select=id,name,description,price,image,category,available&order=id.asc"
  );

  return NextResponse.json(meals, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
