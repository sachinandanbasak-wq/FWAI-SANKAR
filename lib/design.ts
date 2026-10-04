// The design is stored as structured data so an order can be reproduced exactly.
// Geometry is in "print units" where 1 inch = 100 units. Positions are the
// CENTRE of the element and are RELATIVE to the print area's top-left corner.

export type Side = "front" | "back";

export type PrintArea = {
  xIn: number;
  yIn: number;
  widthIn: number;
  heightIn: number;
};

export type ShirtBox = { widthIn: number; heightIn: number };

export const UNITS_PER_INCH = 100;

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
};

export type Design = {
  front: DesignElement[];
  back: DesignElement[];
};

export function emptyDesign(): Design {
  return { front: [], back: [] };
}

export function designElementCount(design: Design): number {
  return design.front.length + design.back.length;
}

export function isDesignEmpty(design: Design): boolean {
  return designElementCount(design) === 0;
}

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
