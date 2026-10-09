import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

type UpdatedProduct = { id: string };

export async function DELETE(request: Request) {
  const session = (await cookies()).get(adminCookieName)?.value;
  if (!isValidAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const section = params.get("section");
  const category = params.get("category")?.trim();
  if ((section !== "foodstuff" && section !== "fresh-food") || !category) {
    return NextResponse.json({ error: "A valid section and category are required" }, { status: 400 });
  }
  if (category.toLowerCase() === "uncategorized") {
    return NextResponse.json({ error: "Uncategorized is the fallback category and cannot be deleted" }, { status: 400 });
  }

  const updated = await supabaseAdminRequest<UpdatedProduct[]>(
    `products?section=eq.${section}&category=eq.${encodeURIComponent(category)}&select=id`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ category: "Uncategorized" }),
    }
  );

  if (updated.length === 0) {
    return NextResponse.json({ error: "No saved products use this category. Save pending product edits first." }, { status: 404 });
  }

  return NextResponse.json({ deletedCategory: category, movedTo: "Uncategorized", productIds: updated.map((product) => product.id) });
}
