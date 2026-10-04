import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
