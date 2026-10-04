// Small dev helper: print orders and their designs.
// Run: node scripts/db-report.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const orders = await prisma.order.findMany({
  include: { items: true },
  orderBy: { createdAt: "asc" },
});

console.log("order count:", orders.length);
for (const o of orders) {
  console.log(
    `${o.orderNumber} | ${o.orderType} | ${o.status} | total(paise)=${o.totalPaise} | items=${o.items.length} | phone=${o.phone}`
  );
  for (const i of o.items) {
    const design = JSON.parse(i.designJson);
    const sizes = JSON.parse(i.sizesJson);
    console.log(
      `   - ${i.productName} / ${i.colorName} / ${JSON.stringify(sizes)} / qty=${i.quantity} / unit=${i.unitPricePaise} / design front=${design.front.length} back=${design.back.length}`
    );
  }
}

await prisma.$disconnect();
