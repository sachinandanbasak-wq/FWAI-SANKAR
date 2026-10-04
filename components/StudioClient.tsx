"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicProduct } from "@/lib/catalog";
import type { Settings } from "@/lib/settings";
import {
  FONTS,
  UNITS_PER_INCH,
  type Design,
  type DesignElement,
  type Side,
  emptyDesign,
  newId,
} from "@/lib/design";
import { clampElementToPrintArea } from "@/lib/geometry";
import { computeUnitPrice, formatPaise, sumSizeQuantities } from "@/lib/pricing";
import { validateArtworkFile } from "@/lib/image-utils";
import { addToCart, type CartItem } from "@/lib/cart";

const StudioCanvas = dynamic(() => import("./StudioCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-lg bg-stone-100 text-sm text-stone-500">
      Loading the design canvas…
    </div>
  ),
});

function isDark(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

export default function StudioClient({
  product,
  settings,
}: {
  product: PublicProduct;
  settings: Settings;
}) {
  const router = useRouter();
  const [colorHex, setColorHex] = useState(product.colors[0]?.hex ?? "#ffffff");
  const [side, setSide] = useState<Side>("front");
  const [design, setDesign] = useState<Design>(emptyDesign());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [singleSize, setSingleSize] = useState(
    product.sizes[Math.min(1, product.sizes.length - 1)] ?? "M"
  );
  const [singleQty, setSingleQty] = useState(1);
  const [bulkSizes, setBulkSizes] = useState<Record<string, number>>(() =>
    Object.fromEntries(product.sizes.map((s) => [s, 0]))
  );

  const [printMethod, setPrintMethod] = useState(settings.printMethods[0] ?? "dtf");
  const [message, setMessage] = useState<{ kind: "error" | "warning" | "info"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const printArea = side === "front" ? product.printFront : product.printBack;
  const pw = printArea.widthIn * UNITS_PER_INCH;
  const ph = printArea.heightIn * UNITS_PER_INCH;
  const elements = design[side];
  const selected = elements.find((e) => e.id === selectedId) ?? null;

  const effectiveSizes = useMemo(() => {
    if (mode === "single") {
      return { [singleSize]: Math.max(1, singleQty || 1) };
    }
    return bulkSizes;
  }, [mode, singleSize, singleQty, bulkSizes]);

  const totalQty = sumSizeQuantities(effectiveSizes);
  const pricedQty = totalQty > 0 ? totalQty : 1;
  const unitPricePaise = computeUnitPrice(product.tiers, pricedQty);
  const lineTotalPaise = unitPricePaise * pricedQty;
  const tier = [...product.tiers]
    .sort((a, b) => a.minQty - b.minQty)
    .find((t) => pricedQty >= t.minQty && (t.maxQty == null || pricedQty <= t.maxQty));

  function updateDesign(next: Design) {
    setDesign(next);
  }

  function setElements(next: DesignElement[]) {
    updateDesign({ ...design, [side]: next });
  }

  function addText() {
    const fontSize = 130;
    const text = "Your text";
    const width = Math.max(200, text.length * fontSize * 0.62);
    const height = fontSize * 1.25;
    const el: DesignElement = clampElementToPrintArea(
      {
        id: newId(),
        type: "text",
        side,
        x: pw / 2,
        y: ph / 2,
        width,
        height,
        rotation: 0,
        text,
        fontFamily: "Arial",
        fontSize,
        fill: isDark(colorHex) ? "#ffffff" : "#111111",
      },
      pw,
      ph
    );
    setElements([...elements, el]);
    setSelectedId(el.id);
    setMessage(null);
  }

  function updateSelected(patch: Partial<DesignElement>) {
    if (!selected) return;
    let next: DesignElement = { ...selected, ...patch };
    if (selected.type === "text") {
      const fontSize = next.fontSize ?? 48;
      const text = next.text ?? "";
      next = {
        ...next,
        width: Math.max(60, text.length * fontSize * 0.62),
        height: fontSize * 1.25,
      };
    }
    next = clampElementToPrintArea(next, pw, ph);
    setElements(elements.map((e) => (e.id === next.id ? next : e)));
  }

  function deleteSelected() {
    if (!selected) return;
    setElements(elements.filter((e) => e.id !== selected.id));
    setSelectedId(null);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);

    const check = await validateArtworkFile(file, {
      acceptedUploadTypes: settings.acceptedUploadTypes,
      maxFileSizeMB: settings.maxFileSizeMB,
      minImageDimensionPx: settings.minImageDimensionPx,
      recommendedImageDimensionPx: settings.recommendedImageDimensionPx,
    });

    if (!check.ok) {
      setMessage({ kind: "error", text: check.error });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "artwork");
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? "Upload failed." });
        return;
      }

      const ratio = check.height / check.width;
      const width = Math.min(pw * 0.7, 700);
      const height = width * ratio;
      const el: DesignElement = clampElementToPrintArea(
        {
          id: newId(),
          type: "image",
          side,
          x: pw / 2,
          y: ph / 2,
          width,
          height,
          rotation: 0,
          src: data.url,
          artworkName: file.name,
        },
        pw,
        ph
      );
      setElements([...elements, el]);
      setSelectedId(el.id);

      if (check.warning) {
        setMessage({ kind: "warning", text: check.warning });
      }
    } catch {
      setMessage({ kind: "error", text: "Upload failed. Please check your connection and try again." });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onAddToCart() {
    if (totalQty < 1) {
      setMessage({ kind: "error", text: "Add at least one piece before adding to the cart." });
      return;
    }
    if (design.front.length + design.back.length < 1) {
      setMessage({
        kind: "error",
        text: "Add text or artwork before ordering. An order cannot be placed without a design.",
      });
      return;
    }
    const color = product.colors.find((c) => c.hex === colorHex);
    const item: CartItem = {
      id: newId(),
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      colorName: color?.name ?? "Custom",
      colorHex,
      sizes: effectiveSizes,
      design,
      printMethod,
      shirtBox: product.shirtBox,
      printFront: product.printFront,
      printBack: product.printBack,
      quantity: totalQty,
      unitPricePaise,
      lineTotalPaise,
    };
    addToCart(item);
    router.push("/cart");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      {/* Canvas column */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-stone-200 p-1">
            {(["front", "back"] as Side[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSide(s);
                  setSelectedId(null);
                }}
                className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize ${
                  side === s ? "bg-white shadow-sm" : "text-stone-600"
                }`}
              >
                {s}
                {design[s].length > 0 && (
                  <span className="ml-1 rounded bg-ginger/15 px-1.5 text-xs text-ginger-dark">
                    {design[s].length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-500">
            Print area {printArea.widthIn}in × {printArea.heightIn}in
          </p>
        </div>

        <div className="card overflow-hidden p-2">
          <StudioCanvas
            product={product}
            colorHex={colorHex}
            side={side}
            design={design}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={setDesign}
            editorMode
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-outline" onClick={addText}>
            + Add text
          </button>
          <button
            className="btn-outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "+ Upload artwork (PNG/JPG)"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={onUpload}
          />
          {selected && (
            <button className="btn-ghost text-red-600" onClick={deleteSelected}>
              Delete selected
            </button>
          )}
        </div>

        {message && (
          <p
            className={`mt-3 rounded-md p-3 text-sm ${
              message.kind === "error"
                ? "bg-red-50 text-red-700"
                : message.kind === "warning"
                ? "bg-amber-50 text-amber-800"
                : "bg-stone-100 text-stone-700"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      {/* Controls column */}
      <div className="space-y-4">
        <section className="card p-4">
          <h2 className="text-sm font-semibold">{product.name}</h2>
          <p className="mt-1 text-xs text-stone-500">{product.description}</p>

          <div className="mt-3">
            <span className="label">Shirt colour</span>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <button
                  key={c.hex}
                  title={c.name}
                  aria-label={c.name}
                  onClick={() => setColorHex(c.hex)}
                  className={`h-8 w-8 rounded-full border-2 ${
                    colorHex === c.hex ? "border-ginger" : "border-stone-300"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {product.colors.find((c) => c.hex === colorHex)?.name}
            </p>
          </div>
        </section>

        {selected && (
          <section className="card p-4">
            <h2 className="text-sm font-semibold">
              {selected.type === "text" ? "Text" : "Artwork"} settings
            </h2>
            {selected.type === "text" ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="label">Text</label>
                  <input
                    className="input"
                    value={selected.text ?? ""}
                    onChange={(e) => updateSelected({ text: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Font</label>
                  <select
                    className="input"
                    value={selected.fontFamily ?? "Arial"}
                    onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="label">Colour</label>
                    <input
                      type="color"
                      className="h-9 w-full rounded border border-stone-300"
                      value={selected.fill ?? "#111111"}
                      onChange={(e) => updateSelected({ fill: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="label">Size</label>
                    <input
                      type="number"
                      className="input"
                      min={10}
                      max={400}
                      value={Math.round(selected.fontSize ?? 48)}
                      onChange={(e) =>
                        updateSelected({ fontSize: Number(e.target.value) || 48 })
                      }
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-stone-500">
                Drag the corners to resize, the handle above to rotate. Use the
                artwork file itself for the best print quality.
              </p>
            )}
          </section>
        )}

        <section className="card p-4">
          <h2 className="text-sm font-semibold">How many pieces?</h2>
          <div className="mt-2 flex gap-1 rounded-lg bg-stone-200 p-1">
            <button
              onClick={() => setMode("single")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm ${
                mode === "single" ? "bg-white shadow-sm" : "text-stone-600"
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setMode("bulk")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm ${
                mode === "bulk" ? "bg-white shadow-sm" : "text-stone-600"
              }`}
            >
              Bulk (size breakdown)
            </button>
          </div>

          {mode === "single" ? (
            <div className="mt-3 flex gap-3">
              <div className="flex-1">
                <label className="label">Size</label>
                <select
                  className="input"
                  value={singleSize}
                  onChange={(e) => setSingleSize(e.target.value)}
                >
                  {product.sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="label">Qty</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={singleQty}
                  onChange={(e) => setSingleQty(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.sizes.map((s) => (
                <div key={s}>
                  <label className="label text-center">{s}</label>
                  <input
                    type="number"
                    min={0}
                    className="input px-1 text-center"
                    value={bulkSizes[s] ?? 0}
                    onChange={(e) =>
                      setBulkSizes({
                        ...bulkSizes,
                        [s]: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 rounded-md bg-stone-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-600">Total pieces</span>
              <span className="font-medium">{totalQty || 0}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-stone-600">
                Price per piece
                {tier && (
                  <span className="ml-1 text-xs text-stone-400">
                    ({tier.minQty}
                    {tier.maxQty ? `–${tier.maxQty}` : "+"} tier)
                  </span>
                )}
              </span>
              <span className="font-medium">{formatPaise(unitPricePaise)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-base">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">{formatPaise(lineTotalPaise)}</span>
            </div>
          </div>

          <div className="mt-3">
            <label className="label">Print method</label>
            <select
              className="input"
              value={printMethod}
              onChange={(e) => setPrintMethod(e.target.value)}
            >
              {settings.printMethods.map((m) => (
                <option key={m} value={m}>
                  {settings.printMethodLabels[m] ?? m}
                </option>
              ))}
            </select>
            {printMethod !== "dtf" && (
              <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
                {printMethod === "embroidery"
                  ? "Embroidery needs fewer colours and no fine detail. Our team will confirm your file before production."
                  : "Vinyl works best with solid shapes and no gradients. Our team will confirm your file before production."}
              </p>
            )}
          </div>

          <button className="btn-primary mt-4 w-full" onClick={onAddToCart}>
            Add to cart — {formatPaise(lineTotalPaise)}
          </button>
        </section>
      </div>
    </div>
  );
}
