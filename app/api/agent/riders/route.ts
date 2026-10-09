import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { agentCookieName, isValidAgentSession } from "@/lib/admin-auth";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

export async function GET() {
  const session = (await cookies()).get(agentCookieName)?.value;
  if (!isValidAgentSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const riders = await supabaseAdminRequest("riders?select=id,name,phone,base_area,availability,account_status&account_status=eq.approved&order=name.asc");
  return NextResponse.json(riders);
}