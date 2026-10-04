import { NextRequest, NextResponse } from "next/server";
import { customerIdFromRequest } from "@/lib/customer-guard";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  const cid = customerIdFromRequest(req);
  if (!cid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const settings = await getSettings();
  const orders = await prisma.order.findMany({
    where: { customerId: cid },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return NextResponse.json({
    statusLabels: settings.statusLabels,
    printMethodLabels: settings.printMethodLabels,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      orderType: o.orderType,
      printMethod: o.printMethod,
      totalPaise: o.totalPaise,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => {
        const sizes = safeParse<Record<string, number>>(i.sizesJson, {});
        const design = safeParse<{ front: unknown[]; back: unknown[] }>(
          i.designJson,
          { front: [], back: [] }
        );
        return {
          id: i.id,
          productName: i.productName,
          colorName: i.colorName,
          colorHex: i.colorHex,
          sizes,
          quantity: i.quantity,
          lineTotalPaise: i.lineTotalPaise,
          designCount: design.front.length + design.back.length,
          printFrontUrl: i.printFrontUrl,
          printBackUrl: i.printBackUrl,
        };
      }),
    })),
  });
}
