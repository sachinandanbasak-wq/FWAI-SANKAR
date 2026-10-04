import { describe, expect, it } from "vitest";
import {
  computeLineTotal,
  computeOrderTotal,
  computeUnitPrice,
  formatPaise,
  sumSizeQuantities,
  type Tier,
} from "../lib/pricing";

const tiers: Tier[] = [
  { minQty: 1, maxQty: 9, unitPricePaise: 39900 },
  { minQty: 10, maxQty: 49, unitPricePaise: 32900 },
  { minQty: 50, maxQty: null, unitPricePaise: 28900 },
];

describe("computeUnitPrice — bulk tiers (rule 3)", () => {
  it("uses the retail tier for 1 piece", () => {
    expect(computeUnitPrice(tiers, 1)).toBe(39900);
  });

  it("keeps the tier at the upper edge of a range", () => {
    expect(computeUnitPrice(tiers, 9)).toBe(39900);
  });

  it("steps down at the break point", () => {
    expect(computeUnitPrice(tiers, 10)).toBe(32900);
    expect(computeUnitPrice(tiers, 49)).toBe(32900);
    expect(computeUnitPrice(tiers, 50)).toBe(28900);
  });

  it("uses the open-ended top tier for a 70-piece bulk order", () => {
    expect(computeUnitPrice(tiers, 70)).toBe(28900);
  });

  it("falls back to the lowest tier for a quantity below the first range", () => {
    expect(computeUnitPrice([{ minQty: 5, maxQty: null, unitPricePaise: 100 }], 1)).toBe(100);
  });

  it("rejects a zero or negative quantity", () => {
    expect(() => computeUnitPrice(tiers, 0)).toThrow();
    expect(() => computeUnitPrice(tiers, -3)).toThrow();
  });

  it("rejects an empty tier list", () => {
    expect(() => computeUnitPrice([], 1)).toThrow();
  });
});

describe("line and order totals", () => {
  it("multiplies unit price by quantity", () => {
    expect(computeLineTotal(28900, 70)).toBe(2023000);
  });

  it("sums line totals exactly", () => {
    expect(computeOrderTotal([2023000, 39900])).toBe(2062900);
  });
});

describe("size breakdown", () => {
  it("adds S 10, M 25, L 25, XL 10 to 70", () => {
    expect(sumSizeQuantities({ S: 10, M: 25, L: 25, XL: 10 })).toBe(70);
  });

  it("ignores missing sizes", () => {
    expect(sumSizeQuantities({ M: 2 })).toBe(2);
  });
});

describe("formatPaise (INR)", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatPaise(39900)).toBe("₹399");
  });

  it("formats paise when present", () => {
    expect(formatPaise(39950)).toBe("₹399.50");
  });
});
