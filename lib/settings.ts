import { prisma } from "./db";

export type Settings = {
  currency: string;
  currencySymbol: string;
  acceptedUploadTypes: string[];
  maxFileSizeMB: number;
  minImageDimensionPx: number;
  recommendedImageDimensionPx: number;
  printDpi: number;
  minRecommendedDpi: number;
  statuses: string[];
  statusLabels: Record<string, string>;
  printMethods: string[];
  printMethodLabels: Record<string, string>;
  bulkTierNote: string;
};

const DEFAULTS: Settings = {
  currency: "INR",
  currencySymbol: "₹",
  acceptedUploadTypes: ["image/png", "image/jpeg"],
  maxFileSizeMB: 10,
  minImageDimensionPx: 1000,
  recommendedImageDimensionPx: 2000,
  printDpi: 300,
  minRecommendedDpi: 150,
  statuses: ["NEW", "IN_PRODUCTION", "PRINTED", "SHIPPED"],
  statusLabels: {
    NEW: "New",
    IN_PRODUCTION: "In production",
    PRINTED: "Printed",
    SHIPPED: "Shipped",
  },
  printMethods: ["dtf", "embroidery", "vinyl"],
  printMethodLabels: {
    dtf: "DTF (full colour)",
    embroidery: "Embroidery (fewer colours, no fine detail)",
    vinyl: "Vinyl (solid shapes, no gradients)",
  },
  bulkTierNote: "",
};

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const map: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      map[r.key] = JSON.parse(r.value);
    } catch {
      map[r.key] = r.value;
    }
  }
  return { ...DEFAULTS, ...map } as Settings;
}
