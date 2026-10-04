import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let status = "";
  try {
    const body = await req.json();
    status = typeof body?.status === "string" ? body.status : "";
  } catch {
    status = "";
  }

  const settings = await getSettings();
  if (!settings.statuses.includes(status)) {
    return NextResponse.json(
      { error: "That is not a valid status." },
      { status: 400 }
    );
  }

  const existing = await prisma.order.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { status },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
