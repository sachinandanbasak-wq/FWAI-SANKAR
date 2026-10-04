import { NextRequest, NextResponse } from "next/server";
import { customerIdFromRequest } from "@/lib/customer-guard";
import { prisma } from "@/lib/db";
import {
  computeLineTotal,
  computeOrderTotal,
  computeUnitPrice,
  sumSizeQuantities,
} from "@/lib/pricing";
import { firstIssueMessage, orderSchema } from "@/lib/validation";
import type { DesignElement } from "@/lib/design";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function orderNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SG-${ymd}-${rand}`;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Could not read the order. Please try again." },
      { status: 400 }
    );
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssueMessage(parsed.error) },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Prices are recomputed here from the database tiers. The client's price is
  // never trusted.
  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { tiers: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const resolved = input.items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) throw new Error("unknown-product:" + item.productId);
    if (product.tiers.length === 0)
      throw new Error("no-tiers:" + item.productId);

    const qty = sumSizeQuantities(item.sizes);
    const unitPricePaise = computeUnitPrice(product.tiers, qty);
    const lineTotalPaise = computeLineTotal(unitPricePaise, qty);

    const artworkUrls = (item.artworkUrls ?? []).length
      ? item.artworkUrls!
      : [
          ...item.design.front,
          ...item.design.back,
        ]
          .filter((e: DesignElement) => e.type === "image" && e.src)
          .map((e: DesignElement) => e.src as string);

    return {
      product,
      qty,
      unitPricePaise,
      lineTotalPaise,
      artworkUrls,
      item,
    };
  });

  const subtotalPaise = computeOrderTotal(
    resolved.map((r) => r.lineTotalPaise)
  );
  const orderType = resolved.reduce((a, r) => a + r.qty, 0) > 1 ? "bulk" : input.orderType;
  const customerId = customerIdFromRequest(req);

  try {
    const order = await prisma.order.create({
      data: {
        orderNumber: orderNumber(),
        customerId: customerId ?? null,
        customerName: input.customerName,
        phone: input.phone,
        email: input.email,
        address: input.address,
        notes: input.notes || null,
        orderType,
        printMethod: input.printMethod,
        status: "NEW",
        subtotalPaise,
        totalPaise: subtotalPaise,
        items: {
          create: resolved.map((r) => ({
            productId: r.product.id,
            productSlug: r.product.slug,
            productName: r.product.name,
            colorName: r.item.colorName,
            colorHex: r.item.colorHex,
            sizesJson: JSON.stringify(r.item.sizes),
            unitPricePaise: r.unitPricePaise,
            quantity: r.qty,
            lineTotalPaise: r.lineTotalPaise,
            designJson: JSON.stringify(r.item.design),
            artworkUrlsJson: JSON.stringify(r.artworkUrls),
            printFrontUrl: r.item.printFrontUrl ?? null,
            printBackUrl: r.item.printBackUrl ?? null,
            printLeftSleeveUrl: r.item.printLeftSleeveUrl ?? null,
            printRightSleeveUrl: r.item.printRightSleeveUrl ?? null,
          })),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      id: order.id,
      orderNumber: order.orderNumber,
      totalPaise: order.totalPaise,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("unknown-product")) {
      return NextResponse.json(
        { error: "One of the products in your cart no longer exists." },
        { status: 400 }
      );
    }
    if (msg.startsWith("no-tiers")) {
      return NextResponse.json(
        { error: "That product has no price set. Please contact us." },
        { status: 400 }
      );
    }
    console.error("order create failed", e);
    return NextResponse.json(
      { error: "Could not place the order. Please try again." },
      { status: 500 }
    );
  }
}
