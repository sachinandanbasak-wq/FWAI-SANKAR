import { z } from "zod";

// Validate at the edge: nothing is saved unless it passes here.

const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const PHONE_MESSAGE =
  "Enter a valid 10-digit Indian mobile number (for example 9876543210).";

export const designElementSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["text", "image"]),
    side: z.enum(["front", "back", "left_sleeve", "right_sleeve"]),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().positive(),
    height: z.number().positive(),
    rotation: z.number().finite(),
    text: z.string().optional(),
    fontFamily: z.string().optional(),
    fontSize: z.number().positive().optional(),
    fill: z.string().optional(),
    src: z.string().optional(),
    artworkName: z.string().optional(),
    aiGenerated: z.boolean().optional(),
  })
  .superRefine((el, ctx) => {
    if (el.type === "image" && !el.src) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An uploaded image is missing its file. Please upload it again.",
      });
    }
    if (el.type === "text" && !(el.text && el.text.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A text element is empty. Add some text or remove it.",
      });
    }
  });

export const designSchema = z.object({
  front: z.array(designElementSchema),
  back: z.array(designElementSchema),
  left_sleeve: z.array(designElementSchema).optional().default([]),
  right_sleeve: z.array(designElementSchema).optional().default([]),
});

const sizeBreakdownSchema = z.record(z.string(), z.number().int().min(0));

export const orderItemSchema = z
  .object({
    productId: z.string().min(1),
    colorName: z.string().min(1, "Choose a shirt colour."),
    colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid colour."),
    sizes: sizeBreakdownSchema,
    design: designSchema,
    artworkUrls: z.array(z.string()).optional().default([]),
    printFrontUrl: z.string().min(1).nullable().optional(),
    printBackUrl: z.string().min(1).nullable().optional(),
    printLeftSleeveUrl: z.string().min(1).nullable().optional(),
    printRightSleeveUrl: z.string().min(1).nullable().optional(),
  })
  .superRefine((item, ctx) => {
    const qty = Object.values(item.sizes).reduce((a, b) => a + b, 0);
    if (qty < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one piece to the size breakdown.",
      });
    }
    const elements =
      item.design.front.length +
      item.design.back.length +
      (item.design.left_sleeve?.length ?? 0) +
      (item.design.right_sleeve?.length ?? 0);
    if (elements < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Add text or artwork before ordering. An order cannot be placed without a design.",
      });
    }
  });

export const orderSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Please enter the customer's full name."),
  phone: z.string().trim().regex(PHONE_RE, PHONE_MESSAGE),
  email: z.string().trim().email("Enter a valid email address.").transform((s) => s.toLowerCase()),
  address: z
    .string()
    .trim()
    .min(10, "Please enter the full delivery address with pincode."),
  notes: z.string().trim().max(1000).optional().default(""),
  orderType: z.enum(["single", "bulk"]),
  printMethod: z.enum(["dtf", "embroidery", "vinyl"]),
  items: z.array(orderItemSchema).min(1, "Your cart is empty."),
});

export type OrderInput = z.infer<typeof orderSchema>;

// Customer account details.

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  email: z.string().trim().email("Enter a valid email address.").transform((s) => s.toLowerCase()),
  phone: z.string().trim().regex(PHONE_RE, PHONE_MESSAGE),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const customerLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").transform((s) => s.toLowerCase()),
  password: z.string().min(1, "Enter your password."),
});

export const customerProfileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  email: z.string().trim().email("Enter a valid email address.").transform((s) => s.toLowerCase()),
  phone: z.string().trim().regex(PHONE_RE, PHONE_MESSAGE),
  address: z
    .string()
    .trim()
    .min(10, "Please enter the full delivery address with pincode."),
});

/** Turn a ZodError into one plain-English sentence for the customer. */
export function firstIssueMessage(error: z.ZodError): string {
  const issues = error.issues;
  // Prefer a custom refinement message (empty design, missing quantity).
  const custom = issues.find((i) => i.code === z.ZodIssueCode.custom);
  const chosen = custom ?? issues[0];
  return chosen?.message ?? "Please check the form and try again.";
}
