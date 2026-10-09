import { NextResponse } from "next/server";
import { agentCookieName } from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(agentCookieName, "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return response;
}