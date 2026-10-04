import type { DesignElement } from "./design";

/**
 * Keep an element fully inside the print area (rule 2).
 * - If the element sticks out, it is moved back inside.
 * - If it is bigger than the print area, it is scaled down to fit.
 * - The element's id, type, text and rotation are never changed, so changing
 *   colour/size/quantity elsewhere never touches the design (rule 1).
 *
 * Positions are the element's CENTRE. Widths/heights are in print units.
 */
export function clampElementToPrintArea(
  el: DesignElement,
  printWidth: number,
  printHeight: number
): DesignElement {
  const rad = (el.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  let w = el.width;
  let h = el.height;
  let extentW = w * cos + h * sin;
  let extentH = w * sin + h * cos;

  const fit = Math.min(1, printWidth / extentW, printHeight / extentH);
  w *= fit;
  h *= fit;
  extentW = w * cos + h * sin;
  extentH = w * sin + h * cos;

  const halfW = extentW / 2;
  const halfH = extentH / 2;
  const x = Math.min(Math.max(el.x, halfW), Math.max(halfW, printWidth - halfW));
  const y = Math.min(Math.max(el.y, halfH), Math.max(halfH, printHeight - halfH));

  const out: DesignElement = { ...el, x, y, width: w, height: h };
  if (fit < 1 && el.type === "text" && el.fontSize) {
    out.fontSize = Math.max(8, el.fontSize * fit);
  }
  return out;
}
