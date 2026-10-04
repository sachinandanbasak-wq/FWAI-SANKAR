// The design is stored as structured data so an order can be reproduced exactly.
// Geometry is in "print units" where 1 inch = 100 units. Positions are the
// CENTRE of the element and are RELATIVE to the print area's top-left corner.

export type Side = "front" | "back" | "left_sleeve" | "right_sleeve";

export const SIDES: Side[] = ["front", "back", "left_sleeve", "right_sleeve"];

export const SIDE_LABELS: Record<Side, string> = {
  front: "Front",
  back: "Back",
  left_sleeve: "Left sleeve",
  right_sleeve: "Right sleeve",
};

export type PrintArea = {
  xIn: number;
  yIn: number;
  widthIn: number;
  heightIn: number;
};

export type ShirtBox = { widthIn: number; heightIn: number };

export const UNITS_PER_INCH = 100;

// Placeholder sleeve/shoulder print areas (in inches, on the shirt from the
// front). Settings-driven: change the product rows to adjust.
export const DEFAULT_LEFT_SLEEVE_PRINT: PrintArea = {
  xIn: 0.9,
  yIn: 4.6,
  widthIn: 2.4,
  heightIn: 2.4,
};
export const DEFAULT_RIGHT_SLEEVE_PRINT: PrintArea = {
  xIn: 16.7,
  yIn: 4.6,
  widthIn: 2.4,
  heightIn: 2.4,
};

export type DesignElement = {
  id: string;
  type: "text" | "image";
  side: Side;
  x: number; // centre, print units
  y: number; // centre, print units
  width: number;
  height: number;
  rotation: number; // degrees
  // text only
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fill?: string;
  // image only
  src?: string;
  artworkName?: string;
  // true when the image came from AI generation
  aiGenerated?: boolean;
};

export type Design = {
  front: DesignElement[];
  back: DesignElement[];
  left_sleeve: DesignElement[];
  right_sleeve: DesignElement[];
};

export function emptyDesign(): Design {
  return { front: [], back: [], left_sleeve: [], right_sleeve: [] };
}

/** Fill in any missing side arrays (older saved designs only had front/back). */
export function normalizeDesign(input: Partial<Design> | null | undefined): Design {
  const base = emptyDesign();
  if (!input) return base;
  for (const s of SIDES) {
    const arr = (input as Record<string, unknown>)[s];
    if (Array.isArray(arr)) base[s] = arr as DesignElement[];
  }
  return base;
}

export function designElementCount(design: Design): number {
  return SIDES.reduce((sum, s) => sum + (design[s]?.length ?? 0), 0);
}

export function isDesignEmpty(design: Design): boolean {
  return designElementCount(design) === 0;
}

export function printAreaFor(product: ProductGeometry, side: Side): PrintArea {
  switch (side) {
    case "front":
      return product.printFront;
    case "back":
      return product.printBack;
    case "left_sleeve":
      return product.printLeftSleeve;
    case "right_sleeve":
      return product.printRightSleeve;
  }
}

/** The geometry fields the canvas needs, without importing the DB layer. */
export type ProductGeometry = {
  shirtBox: ShirtBox;
  printFront: PrintArea;
  printBack: PrintArea;
  printLeftSleeve: PrintArea;
  printRightSleeve: PrintArea;
};

// T-shirt silhouette used by both the product cards and the studio canvas.
// Viewbox is 1000 x 1200 and maps onto the product's shirtBox.
export const SHIRT_VIEWBOX = { width: 1000, height: 1200 };
export const SHIRT_PATH =
  "M 380 60 C 405 135 595 135 620 60 L 770 115 L 960 260 L 855 445 L 830 425 L 830 1150 L 170 1150 L 170 425 L 145 445 L 40 260 L 230 115 Z";

export const FONTS = [
  "Arial",
  "Georgia",
  "Courier New",
  "Impact",
  "Trebuchet MS",
  "Times New Roman",
] as const;

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
