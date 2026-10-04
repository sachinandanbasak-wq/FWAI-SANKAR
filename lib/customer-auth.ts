import crypto from "crypto";

// Customer accounts use the same signed-cookie idea as the admin gate, but the
// token carries the customer's id. Passwords are hashed with Node's built-in
// scrypt, so there is no native dependency to install.

export const CUSTOMER_COOKIE = "sg_customer";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set.");
  return s;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const calculated = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (calculated.length !== expected.length) return false;
  return crypto.timingSafeEqual(calculated, expected);
}

export function createCustomerToken(customerId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ cid: customerId, iat: Date.now() })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

/** Returns the customer id from a valid token, or null. */
export function verifyCustomerToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof parsed.cid !== "string" || typeof parsed.iat !== "number")
      return null;
    if (Date.now() - parsed.iat > MAX_AGE_SECONDS * 1000) return null;
    return parsed.cid;
  } catch {
    return null;
  }
}

export { MAX_AGE_SECONDS };
