import { NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "./auth";

export function isAdmin(req: NextRequest): boolean {
  return verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
}
