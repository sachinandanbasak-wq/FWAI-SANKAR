import { NextRequest, NextResponse } from "next/server";
import { customerIdFromRequest } from "@/lib/customer-guard";
import { prisma } from "@/lib/db";
import { customerProfileSchema, firstIssueMessage } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cid = customerIdFromRequest(req);
  if (!cid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const customer = await prisma.customer.findUnique({ where: { id: cid } });
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const cid = customerIdFromRequest(req);
  if (!cid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Could not read the form." }, { status: 400 });
  }

  const parsed = customerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssueMessage(parsed.error) },
      { status: 400 }
    );
  }
  const { name, email, phone, address } = parsed.data;

  const current = await prisma.customer.findUnique({ where: { id: cid } });
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (email !== current.email) {
    const clash = await prisma.customer.findUnique({ where: { email } });
    if (clash) {
      return NextResponse.json(
        { error: "That email is already used by another account." },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.customer.update({
    where: { id: cid },
    data: { name, email, phone, address },
  });

  return NextResponse.json({
    ok: true,
    customer: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
    },
  });
}
