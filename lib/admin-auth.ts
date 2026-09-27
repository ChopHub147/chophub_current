import { createHmac, timingSafeEqual } from "node:crypto";

export const adminCookieName = "chophub-admin";
const sessionDurationMs = 8 * 60 * 60 * 1000;

const getSecret = () => {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }

  return secret;
};

const sign = (value: string) =>
  createHmac("sha256", getSecret()).update(value).digest("hex");

export const createAdminSession = (email: string) => {
  const value = `${email}:${Date.now()}`;
  return `${value}:${sign(value)}`;
};

export const isValidAdminCredentials = (email: string, password: string) =>
  email === (process.env.ADMIN_EMAIL || "chophub@aol.com") &&
  Boolean(process.env.ADMIN_PASSWORD) &&
  password === process.env.ADMIN_PASSWORD;

export const isValidAdminSession = (session: string | undefined) => {
  if (!session) return false;

  const [email, timestampText, signature] = session.split(":");
  const timestamp = Number(timestampText);
  if (!email || !timestampText || !signature || !Number.isFinite(timestamp)) {
    return false;
  }

  const value = `${email}:${timestampText}`;
  const expected = sign(value);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    email === (process.env.ADMIN_EMAIL || "chophub@aol.com") &&
    Date.now() - timestamp < sessionDurationMs &&
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
};
