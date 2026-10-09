import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { supabaseAdminRequest } from "@/lib/supabase-admin";

export const riderCookieName = "chophub-rider";
const sessionDurationMs = 14 * 24 * 60 * 60 * 1000;

const getSecret = () => {
  const secret = process.env.RIDER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("RIDER_SESSION_SECRET or ADMIN_SESSION_SECRET must be configured");
  return secret;
};

const sign = (value: string) => createHmac("sha256", getSecret()).update(value).digest("hex");

export const createRiderSession = (riderId: number) => {
  const value = `${riderId}:${Date.now()}`;
  return `${value}:${sign(value)}`;
};

export const readRiderSession = (session: string | undefined) => {
  if (!session) return null;
  const [idText, timestampText, signature] = session.split(":");
  const id = Number(idText);
  const timestamp = Number(timestampText);
  if (!idText || !timestampText || !signature || !Number.isSafeInteger(id) || id < 1 || !Number.isFinite(timestamp)) return null;
  if (Date.now() - timestamp > sessionDurationMs || timestamp > Date.now() + 60_000) return null;
  const expected = Buffer.from(sign(`${idText}:${timestampText}`));
  const provided = Buffer.from(signature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  return { id };
};

export async function getAuthenticatedRider() {
  const session = readRiderSession((await cookies()).get(riderCookieName)?.value);
  if (!session) return null;
  const [rider] = await supabaseAdminRequest<Array<{
    id: number;
    name: string;
    phone: string;
    base_area: string;
    availability: "available" | "busy" | "offline";
    account_status: "pending" | "approved" | "suspended";
  }>>(`riders?select=id,name,phone,base_area,availability,account_status&id=eq.${session.id}&limit=1`);
  if (!rider || rider.account_status !== "approved") return null;
  return rider;
}
