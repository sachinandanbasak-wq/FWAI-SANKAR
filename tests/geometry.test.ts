import { describe, expect, it } from "vitest";
import { clampElementToPrintArea } from "../lib/geometry";
import type { DesignElement } from "../lib/design";

const PW = 1100; // 11in print area
const PH = 1400; // 14in print area

function textEl(over: Partial<DesignElement> = {}): DesignElement {
  return {
    id: "e1",
    type: "text",
    side: "front",
    x: PW / 2,
    y: PH / 2,
    width: 400,
    height: 160,
    rotation: 0,
    text: "Hello",
    fontFamily: "Arial",
    fontSize: 130,
    fill: "#111111",
    ...over,
  };
}

describe("clampElementToPrintArea — rule 2 (design stays in the print area)", () => {
  it("leaves an already-inside element exactly where it was (rule 1: not lost)", () => {
    const el = textEl({ x: 500, y: 600 });
    const out = clampElementToPrintArea(el, PW, PH);
    expect(out.x).toBe(500);
    expect(out.y).toBe(600);
    expect(out.width).toBe(400);
    expect(out.height).toBe(160);
    expect(out.id).toBe("e1");
    expect(out.text).toBe("Hello");
    expect(out.fontSize).toBe(130);
  });

  it("pulls an element back when it is dragged off the right edge", () => {
    const out = clampElementToPrintArea(textEl({ x: 2000, y: 600 }), PW, PH);
    expect(out.x).toBe(PW - out.width / 2);
  });

  it("pulls an element back when it is dragged off the top edge", () => {
    const out = clampElementToPrintArea(textEl({ x: 500, y: -50 }), PW, PH);
    expect(out.y).toBe(out.height / 2);
  });

  it("scales an element down when it is bigger than the print area", () => {
    const out = clampElementToPrintArea(
      textEl({ x: 500, y: 600, width: 4000, height: 2000, fontSize: 300 }),
      PW,
      PH
    );
    expect(out.width).toBeLessThanOrEqual(PW);
    expect(out.height).toBeLessThanOrEqual(PH);
    expect(out.fontSize! < 300).toBe(true);
  });

  it("accounts for rotation when clamping", () => {
    // A wide, thin element rotated 90° becomes tall; near the top it must move down.
    const out = clampElementToPrintArea(
      textEl({ x: 550, y: 5, width: 1000, height: 100, rotation: 90 }),
      PW,
      PH
    );
    expect(out.y).toBeGreaterThanOrEqual(0);
    expect(out.rotation).toBe(90);
    expect(out.text).toBe("Hello");
  });

  it("never changes the element id, type or side", () => {
    const el = textEl({ type: "text", side: "back", x: 99999, y: 99999 });
    const out = clampElementToPrintArea(el, PW, PH);
    expect(out.id).toBe(el.id);
    expect(out.type).toBe("text");
    expect(out.side).toBe("back");
  });
});
