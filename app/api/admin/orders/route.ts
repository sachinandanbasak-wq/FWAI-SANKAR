import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const settings = await getSettings();

  const orders = await prisma.order.findMany({
    where: status && status !== "ALL" ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return NextResponse.json({
    statuses: settings.statuses,
    statusLabels: settings.statusLabels,
    printMethodLabels: settings.printMethodLabels,
    orders: orders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      items: o.items.map((i) => ({
        ...i,
        sizes: safeParse(i.sizesJson, {}),
        design: safeParse(i.designJson, { front: [], back: [] }),
        artworkUrls: safeParse(i.artworkUrlsJson ?? "[]", []),
      })),
    })),
  });
}

function safeParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
