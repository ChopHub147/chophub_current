import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdminRequest } from "@/lib/supabase-admin";
import { readCustomerSession, customerCookieName } from "@/lib/customer-auth";

const imageSignatures: Record<string, (bytes: Buffer) => boolean> = {
  "image/jpeg": (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) => bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/webp": (bytes) => bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP",
};

export async function POST(request: Request) {
  const session = readCustomerSession((await cookies()).get(customerCookieName)?.value);
  if (!session) return NextResponse.json({ error: "Please sign in to upload a profile photo." }, { status: 401 });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return NextResponse.json({ error: "Private photo storage is not configured." }, { status: 503 });
  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return NextResponse.json({ error: "Choose a valid image file." }, { status: 400 }); }
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (file.size < 1 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Profile photos must be 5 MB or smaller." }, { status: 400 });
  const verifySignature = imageSignatures[file.type];
  if (!verifySignature || !verifySignature(Buffer.from(await file.slice(0, 16).arrayBuffer()))) return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });

  const path = `${session.id}/profile`;
  try {
    const upload = await fetch(`${base.replace(/\/$/, "")}/storage/v1/object/customer-avatars/${path}`, {
      method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": file.type, "x-upsert": "true" },
      body: file, cache: "no-store",
    });
    if (!upload.ok) {
      const errorText = await upload.text();
      console.error("Private customer photo upload failed", upload.status, errorText);
      return NextResponse.json({ error: "Could not upload the profile photo." }, { status: 502 });
    }
    await supabaseAdminRequest(`customers?id=eq.${session.id}`, { method: "PATCH", body: JSON.stringify({ avatar_path: path }) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Customer avatar upload failed", error);
    return NextResponse.json({ error: "Could not upload the profile photo." }, { status: 500 });
  }
}
