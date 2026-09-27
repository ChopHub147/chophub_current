import { NextResponse } from "next/server";
import { customerCookieName } from "@/lib/customer-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(customerCookieName, "", { path: "/", maxAge: 0 });
  return response;
}
