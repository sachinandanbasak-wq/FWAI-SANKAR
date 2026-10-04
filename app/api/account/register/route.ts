import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  CUSTOMER_COOKIE,
  MAX_AGE_SECONDS,
  createCustomerToken,
  hashPassword,
} from "@/lib/customer-auth";
import { customerRegisterSchema, firstIssueMessage } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Could not read the form." }, { status: 400 });
  }

  const parsed = customerRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssueMessage(parsed.error) },
      { status: 400 }
    );
  }
  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in." },
      { status: 409 }
    );
  }

  const customer = await prisma.customer.create({
    data: { name, email, phone, passwordHash: hashPassword(password), address: "" },
  });

  // Link any guest orders placed earlier with the same email, so the account
  // shows the customer's past orders straight away.
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
