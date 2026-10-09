import { NextResponse } from "next/server";
import {
  agentCookieName,
  createAgentSession,
  isValidAgentCredentials,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: unknown; password?: unknown };
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidAgentCredentials(email, password)) {
    return NextResponse.json({ error: "Invalid staff email or password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(agentCookieName, createAgentSession(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60,
    path: "/",
  });

  return response;
}