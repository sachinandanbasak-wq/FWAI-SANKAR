// Seed the Sweet Ginger Design Studio database.
//
// ALL PRICES AND QUANTITY BREAK POINTS BELOW ARE DUMMY PLACEHOLDERS.
// They are labelled [DUMMY] in the admin UI. Replace them with Shankar's real
// numbers in the settings / price-tier tables — no code change needed.
//
// Run:  npm run db:seed

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Geometry is in inches, relative to the shirt's bounding box.
const SHIRT_BOX = { widthIn: 20, heightIn: 24 };
const PRINT_FRONT = { xIn: 4.5, yIn: 5.5, widthIn: 11, heightIn: 14 };
const PRINT_BACK = { xIn: 4.5, yIn: 4.5, widthIn: 11, heightIn: 15 };
// Sleeve / shoulder print areas (DUMMY placeholders).
const PRINT_LEFT_SLEEVE = { xIn: 0.9, yIn: 4.6, widthIn: 2.4, heightIn: 2.4 };
const PRINT_RIGHT_SLEEVE = { xIn: 16.7, yIn: 4.6, widthIn: 2.4, heightIn: 2.4 };

const SETTINGS = {
  currency: "INR",
  currencySymbol: "₹",
  acceptedUploadTypes: ["image/png", "image/jpeg"],
  maxFileSizeMB: 10,
  // Below this the file is REJECTED (too small to print).
  minImageDimensionPx: 1000,
  // Between min and this, the design still works but warns "low quality".
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
  // Bulk tier example structure. Values are DUMMY.
  bulkTierNote: "DUMMY: 1-9, 10-49, 50+ — replace with real break points.",
};

// prices in paise (₹ × 100). ALL DUMMY.
const PRODUCTS = [
  {
    slug: "crew-neck-tshirt",
    name: "Crew Neck T-shirt",
    category: "tshirt",
    description: "Classic round-neck cotton tee. The workhorse blank.",
    retailPricePaise: 39900,
    sortOrder: 1,
    tiers: [
      { minQty: 1, maxQty: 9, unitPricePaise: 39900 },
      { minQty: 10, maxQty: 49, unitPricePaise: 32900 },
      { minQty: 50, maxQty: null, unitPricePaise: 28900 },
    ],
  },
  {
    slug: "oversized-tshirt",
    name: "Oversized T-shirt",
    category: "tshirt",
    description: "Drop-shoulder relaxed fit. Popular for streetwear prints.",
    retailPricePaise: 49900,
    sortOrder: 2,
    tiers: [
      { minQty: 1, maxQty: 9, unitPricePaise: 49900 },
      { minQty: 10, maxQty: 49, unitPricePaise: 42900 },
      { minQty: 50, maxQty: null, unitPricePaise: 37900 },
    ],
  },
  {
    slug: "polo-tshirt",
    name: "Polo T-shirt",
    category: "polo",
    description: "Collared polo. Common for corporate and event wear.",
    retailPricePaise: 59900,
    sortOrder: 3,
    tiers: [
      { minQty: 1, maxQty: 9, unitPricePaise: 59900 },
      { minQty: 10, maxQty: 49, unitPricePaise: 51900 },
      { minQty: 50, maxQty: null, unitPricePaise: 45900 },
    ],
  },
];

const COLORS = [
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#141414" },
  { name: "Navy", hex: "#1f2a44" },
  { name: "Royal Blue", hex: "#1e3a8a" },
  { name: "Maroon", hex: "#6b1f2a" },
  { name: "Bottle Green", hex: "#14532d" },
  { name: "Red", hex: "#b91c1c" },
  { name: "Grey Melange", hex: "#9ca3af" },
];

const SIZES = ["S", "M", "L", "XL", "XXL"];

async function main() {
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    });
  }

  // Clear products so re-seeding is idempotent (cascade removes colors/sizes/tiers).
  await prisma.product.deleteMany();

  for (const p of PRODUCTS) {
    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        category: p.category,
        description: p.description,
        retailPricePaise: p.retailPricePaise,
        sortOrder: p.sortOrder,
        shirtBoxJson: JSON.stringify(SHIRT_BOX),
        printFrontJson: JSON.stringify(PRINT_FRONT),
        printBackJson: JSON.stringify(PRINT_BACK),
        printLeftSleeveJson: JSON.stringify(PRINT_LEFT_SLEEVE),
        printRightSleeveJson: JSON.stringify(PRINT_RIGHT_SLEEVE),
        colors: {
          create: COLORS.map((c, i) => ({ ...c, sortOrder: i })),
        },
        sizes: {
          create: SIZES.map((s, i) => ({ label: s, sortOrder: i })),
        },
        tiers: { create: p.tiers },
      },
    });
  }

  const count = await prisma.product.count();
  console.log(`Seeded ${count} products, ${Object.keys(SETTINGS).length} settings.`);
  console.log("ALL PRICES ARE DUMMY PLACEHOLDERS — replace before launch.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
