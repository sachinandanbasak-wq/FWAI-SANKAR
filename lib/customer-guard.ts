import { NextRequest } from "next/server";
import { CUSTOMER_COOKIE, verifyCustomerToken } from "./customer-auth";

/** Returns the signed-in customer id from the request cookie, or null. */
export function customerIdFromRequest(req: NextRequest): string | null {
  return verifyCustomerToken(req.cookies.get(CUSTOMER_COOKIE)?.value);
}
