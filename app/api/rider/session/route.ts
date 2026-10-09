import { NextResponse } from "next/server";
import { getAuthenticatedRider } from "@/lib/rider-auth";

export async function GET() {
  try {
    const rider = await getAuthenticatedRider();
    return NextResponse.json({ rider: rider ? { id: rider.id, name: rider.name, phone: rider.phone, availability: rider.availability } : null });
  } catch (error) {
    console.error("Rider session lookup failed", error);
    return NextResponse.json({ error: "Could not check rider sign-in status" }, { status: 500 });
  }
}
