import { describe, expect, it } from "vitest";
import { orderSchema } from "../lib/validation";

function baseOrder() {
  return {
    customerName: "Asha Verma",
    phone: "9876543210",
    email: "asha@example.com",
    address: "12 MI Road, Jaipur, Rajasthan 302001",
    notes: "",
    orderType: "single",
    printMethod: "dtf",
    items: [
      {
        productId: "prod_1",
        colorName: "White",
        colorHex: "#ffffff",
        sizes: { M: 1 },
        design: {
          front: [
            {
              id: "e1",
              type: "text",
              side: "front",
              x: 550,
              y: 700,
              width: 400,
              height: 160,
              rotation: 0,
              text: "Hello",
              fontFamily: "Arial",
              fontSize: 130,
              fill: "#111111",
            },
          ],
          back: [],
        },
        artworkUrls: [],
        printFrontUrl: "/api/files/front.png",
        printBackUrl: null,
      },
    ],
  };
}

describe("order validation — rule 4 (no design, no order)", () => {
  it("accepts a well-formed order", () => {
    const result = orderSchema.safeParse(baseOrder());
    expect(result.success).toBe(true);
  });

  it("rejects an order whose design is empty on both sides", () => {
    const order = baseOrder();
    order.items[0].design = { front: [], back: [] };
    const result = orderSchema.safeParse(order);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(" ");
      expect(messages).toMatch(/without a design/i);
    }
  });

  it("rejects an order with a zero size breakdown", () => {
    const order = baseOrder();
    order.items[0].sizes = { M: 0 };
    const result = orderSchema.safeParse(order);
    expect(result.success).toBe(false);
  });

  it("accepts a design whose only element is on the left sleeve", () => {
    const order = baseOrder();
    order.items[0].design = {
      front: [],
      back: [],
      left_sleeve: [
        {
          id: "s1",
          type: "image",
          side: "left_sleeve",
          x: 120,
          y: 120,
          width: 200,
          height: 200,
          rotation: 0,
          src: "/api/files/ai.png",
          aiGenerated: true,
        },
      ],
      right_sleeve: [],
    };
    expect(orderSchema.safeParse(order).success).toBe(true);
  });

  it("accepts a design with no sleeve keys (older clients) and defaults them to empty", () => {
    const order = baseOrder();
    const parsed = orderSchema.safeParse(order);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items[0].design.left_sleeve).toEqual([]);
      expect(parsed.data.items[0].design.right_sleeve).toEqual([]);
    }
  });

  it("rejects an image element with no file", () => {
    const order = baseOrder();
    order.items[0].design = {
      front: [
        {
          id: "img1",
          type: "image",
          side: "front",
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          rotation: 0,
        },
      ],
      back: [],
    };
    const result = orderSchema.safeParse(order);
    expect(result.success).toBe(false);
  });
});

describe("order validation — required customer fields", () => {
  it("rejects a missing name", () => {
    const order = baseOrder();
    order.customerName = "";
    expect(orderSchema.safeParse(order).success).toBe(false);
  });

  it("rejects a non-Indian phone number", () => {
    const order = baseOrder();
    order.phone = "12345";
    const result = orderSchema.safeParse(order);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message).join(" ")).toMatch(
        /Indian mobile/i
      );
    }
  });

  it("accepts a +91 prefixed phone", () => {
    const order = baseOrder();
    order.phone = "+91 9876543210";
    expect(orderSchema.safeParse(order).success).toBe(true);
  });

  it("rejects a bad email", () => {
    const order = baseOrder();
    order.email = "not-an-email";
    expect(orderSchema.safeParse(order).success).toBe(false);
  });

  it("rejects a too-short address", () => {
    const order = baseOrder();
    order.address = "Jaipur";
    expect(orderSchema.safeParse(order).success).toBe(false);
  });

  it("rejects an empty cart", () => {
    const order = baseOrder();
    order.items = [];
    expect(orderSchema.safeParse(order).success).toBe(false);
  });
});
