import crypto from "crypto";

export const ADMIN_COOKIE = "sg_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set.");
  return s;
}

export function createAdminToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ role: "admin", iat: Date.now() })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof parsed.iat !== "number") return false;
    if (Date.now() - parsed.iat > MAX_AGE_SECONDS * 1000) return false;
  } catch {
    return false;
  }
  return true;
}

export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD is not set.");
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export { MAX_AGE_SECONDS };
