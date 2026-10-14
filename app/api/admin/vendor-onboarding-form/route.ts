import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";

export async function GET() {
  if (!isValidAdminSession((await cookies()).get(adminCookieName)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await readFile(join(process.cwd(), "ChopHub_Vendor_Onboarding_Form.pdf"));
    return new Response(new Uint8Array(form), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="ChopHub_Vendor_Onboarding_Form.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Vendor onboarding form download failed", error);
    return NextResponse.json({ error: "The vendor onboarding PDF could not be found." }, { status: 404 });
  }
}
