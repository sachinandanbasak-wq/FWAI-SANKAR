"use client";

import Konva from "konva";
import {
  UNITS_PER_INCH,
  type Design,
  type DesignElement,
  type PrintArea,
  type Side,
} from "./design";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("could not load " + src));
    img.src = src;
  });
}

/**
 * Render ONE side of the design to a transparent PNG at print resolution.
 * No shirt, no print-area outline — just the ink, ready for DTF/vinyl.
 * 1 inch = 100 design units, so pixelRatio = dpi / 100.
 */
export async function exportPrintPng(
  design: Design,
  side: Side,
  printArea: PrintArea,
  dpi: number
): Promise<Blob> {
  const width = Math.round(printArea.widthIn * UNITS_PER_INCH);
  const height = Math.round(printArea.heightIn * UNITS_PER_INCH);

  const container = document.createElement("div");
  const stage = new Konva.Stage({ container, width, height });
  const layer = new Konva.Layer();
  stage.add(layer);

  const elements: DesignElement[] = design[side];
  for (const el of elements) {
    if (el.type === "text") {
      layer.add(
        new Konva.Text({
          x: el.x,
          y: el.y,
          offsetX: el.width / 2,
          offsetY: el.height / 2,
          width: el.width,
          text: el.text ?? "",
          fontFamily: el.fontFamily ?? "Arial",
          fontSize: el.fontSize ?? 48,
          fill: el.fill ?? "#111111",
          align: "center",
          rotation: el.rotation,
        })
      );
    } else if (el.src) {
      const image = await loadImage(el.src);
      layer.add(
        new Konva.Image({
          image,
          x: el.x,
          y: el.y,
          offsetX: el.width / 2,
          offsetY: el.height / 2,
          width: el.width,
          height: el.height,
          rotation: el.rotation,
        })
      );
    }
  }

  layer.draw();
  const dataUrl = stage.toDataURL({
    pixelRatio: dpi / UNITS_PER_INCH,
    mimeType: "image/png",
  });
  stage.destroy();

  const res = await fetch(dataUrl);
  return res.blob();
}
