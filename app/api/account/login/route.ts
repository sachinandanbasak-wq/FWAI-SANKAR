import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  CUSTOMER_COOKIE,
  MAX_AGE_SECONDS,
  createCustomerToken,
  verifyPassword,
} from "@/lib/customer-auth";
import { customerLoginSchema, firstIssueMessage } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Could not read the form." }, { status: 400 });
  }

  const parsed = customerLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssueMessage(parsed.error) },
      { status: 400 }
    );
  }
  const { email, password } = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    return NextResponse.json(
      { error: "Email or password is incorrect." },
      { status: 401 }
    );
  }

  await prisma.order.updateMany({
    where: { email, customerId: null },
    data: { customerId: customer.id },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_COOKIE, createCustomerToken(customer.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
