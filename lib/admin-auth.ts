import { createHmac, timingSafeEqual } from "node:crypto";

export const adminCookieName = "chophub-admin";
export const agentCookieName = "chophub-agent";
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

export const createAgentSession = (email: string) => {
  const value = `${email}:${Date.now()}`;
  return `${value}:${sign(value)}`;
};

export const isValidAdminCredentials = (email: string, password: string) =>
  email === (process.env.ADMIN_EMAIL || "chophub@aol.com") &&
  Boolean(process.env.ADMIN_PASSWORD) &&
  password === process.env.ADMIN_PASSWORD;

export const isValidAgentCredentials = (email: string, password: string) =>
  Boolean(process.env.AGENT_EMAIL && process.env.AGENT_PASSWORD) &&
  email === process.env.AGENT_EMAIL &&
  password === process.env.AGENT_PASSWORD;

const isValidSession = (session: string | undefined, expectedEmail: string) => {
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
    email === expectedEmail &&
    Date.now() - timestamp < sessionDurationMs &&
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

export const isValidAdminSession = (session: string | undefined) =>
  isValidSession(session, process.env.ADMIN_EMAIL || "chophub@aol.com");

export const isValidAgentSession = (session: string | undefined) =>
  Boolean(process.env.AGENT_EMAIL) && isValidSession(session, process.env.AGENT_EMAIL || "");
