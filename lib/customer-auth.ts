import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const customerCookieName = "chophub-customer";
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;

const getSecret = () => {
  const secret = process.env.CUSTOMER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("CUSTOMER_SESSION_SECRET is not configured");
  }

  return secret;
};

const sign = (value: string) => createHmac("sha256", getSecret()).update(value).digest("hex");

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, stored: string) => {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
};

export type CustomerSession = { id: number; phone: string };

export const createCustomerSession = (id: number, phone: string) => {
  const value = `${id}:${phone}:${Date.now()}`;
  return `${value}:${sign(value)}`;
};

export const readCustomerSession = (session: string | undefined): CustomerSession | null => {
  if (!session) return null;

  const [idText, phone, timestampText, signature] = session.split(":");
  const id = Number(idText);
  const timestamp = Number(timestampText);

  if (!idText || !phone || !timestampText || !signature || !Number.isFinite(id) || !Number.isFinite(timestamp)) {
    return null;
  }

  const value = `${idText}:${phone}:${timestampText}`;
  const expected = sign(value);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    Date.now() - timestamp > sessionDurationMs ||
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  return { id, phone };
};
