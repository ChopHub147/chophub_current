import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { agentCookieName, isValidAgentSession } from "@/lib/admin-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

export async function GET() {
  const session = (await cookies()).get(agentCookieName)?.value;
  if (!isValidAgentSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendors = await supabaseAdminRequest("vendors?select=id,name,phone,address,active&active=eq.true&order=name.asc");
  return NextResponse.json(vendors);
}