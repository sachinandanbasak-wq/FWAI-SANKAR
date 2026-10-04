import { prisma } from "./db";
import {
  DEFAULT_LEFT_SLEEVE_PRINT,
  DEFAULT_RIGHT_SLEEVE_PRINT,
  type PrintArea,
  type ShirtBox,
} from "./design";
import type { Tier } from "./pricing";

export type { PrintArea, ShirtBox };

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  retailPricePaise: number;
  shirtBox: { widthIn: number; heightIn: number };
  printFront: PrintArea;
  printBack: PrintArea;
  printLeftSleeve: PrintArea;
  printRightSleeve: PrintArea;
  colors: { name: string; hex: string }[];
  sizes: string[];
  tiers: Tier[];
};

function parse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

type ProductRow = Awaited<ReturnType<typeof prisma.product.findMany>>[number] & {
  colors: { name: string; hex: string; sortOrder: number }[];
  sizes: { label: string; sortOrder: number }[];
  tiers: Tier[];
};

export function toPublicProduct(p: ProductRow): PublicProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    description: p.description,
    retailPricePaise: p.retailPricePaise,
    shirtBox: parse(p.shirtBoxJson, { widthIn: 20, heightIn: 24 }),
    printFront: parse(p.printFrontJson, {
      xIn: 4.5,
      yIn: 5.5,
      widthIn: 11,
      heightIn: 14,
    }),
    printBack: parse(p.printBackJson, {
      xIn: 4.5,
      yIn: 4.5,
      widthIn: 11,
      heightIn: 15,
    }),
    printLeftSleeve: parse(
      p.printLeftSleeveJson ?? "",
      DEFAULT_LEFT_SLEEVE_PRINT
    ),
    printRightSleeve: parse(
      p.printRightSleeveJson ?? "",
      DEFAULT_RIGHT_SLEEVE_PRINT
    ),
    colors: [...p.colors]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ name: c.name, hex: c.hex })),
    sizes: [...p.sizes].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.label),
    tiers: [...p.tiers].sort((a, b) => a.minQty - b.minQty).map((t) => ({
      minQty: t.minQty,
      maxQty: t.maxQty,
      unitPricePaise: t.unitPricePaise,
    })),
  };
}

const include = {
  colors: true,
  sizes: true,
  tiers: true,
} as const;

export async function getProducts(): Promise<PublicProduct[]> {
  const rows = await prisma.product.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include,
  });
  return rows.map((r) => toPublicProduct(r as ProductRow));
}

export async function getProductBySlug(
  slug: string
): Promise<PublicProduct | null> {
  const row = await prisma.product.findUnique({
    where: { slug },
    include,
  });
  return row ? toPublicProduct(row as ProductRow) : null;
}
