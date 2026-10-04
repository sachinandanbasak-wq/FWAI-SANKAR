// Pure pricing logic. No React, no database, no side effects — so it is easy to
// prove with tests. Money is integer paise throughout.

export type Tier = {
  minQty: number;
  maxQty: number | null; // null = no upper bound
  unitPricePaise: number;
};

/**
 * Pick the unit price for a given total quantity.
 * Tiers are sorted by minQty; the matching tier is the one whose range contains
 * the quantity. If no range contains it, the lowest tier is used as the base.
 */
export function computeUnitPrice(tiers: Tier[], qty: number): number {
  if (!tiers.length) throw new Error("No price tiers configured for this product.");
  if (!Number.isFinite(qty) || qty < 1) {
    throw new Error("Quantity must be at least 1.");
  }
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let chosen = sorted[0];
  for (const t of sorted) {
    const upper = t.maxQty == null ? Infinity : t.maxQty;
    if (qty >= t.minQty && qty <= upper) {
      chosen = t;
      break;
    }
  }
  return chosen.unitPricePaise;
}

export function computeLineTotal(unitPricePaise: number, qty: number): number {
  return unitPricePaise * qty;
}

export function computeOrderTotal(lineTotals: number[]): number {
  return lineTotals.reduce((a, b) => a + b, 0);
}

/** Total pieces in a size breakdown like { S: 10, M: 25 }. */
export function sumSizeQuantities(sizes: Record<string, number>): number {
  return Object.values(sizes).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

export function formatPaise(paise: number, symbol = "₹"): string {
  const rupees = paise / 100;
  const hasPaise = paise % 100 !== 0;
  return (
    symbol +
    rupees.toLocaleString("en-IN", {
      minimumFractionDigits: hasPaise ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}
