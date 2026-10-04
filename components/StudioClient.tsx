"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
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

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---- small inline icons (no emoji) ---- */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconText() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
      <path d="M5 6h14M12 6v13M9 19h6" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
      <path d="M12 16V5m0 0L8 9m4-4 4 4M5 19h14" />
    </svg>
  );
}
function IconPalette() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.6-.3-1-.6-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5c0-3.6-4-6.5-9-6.5Z" />
      <circle cx="7.5" cy="12" r="1" /><circle cx="10" cy="8" r="1" /><circle cx="15" cy="9" r="1" />
    </svg>
  );
}
function IconTag() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
      <path d="M4 4h8l8 8-8 8-8-8V4Z" /><circle cx="8.5" cy="8.5" r="1.2" />
    </svg>
  );
}
function RailButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex w-full flex-col items-center gap-1 rounded-lg px-1 py-3 text-[10px] font-medium text-stone-600 hover:bg-stone-100 hover:text-ginger-dark"
    >
      {children}
      <span>{label}</span>
    </button>
  );
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
  const [zoom, setZoom] = useState(1);

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
  const isEmpty = design.front.length + design.back.length === 0;
  const colorName = product.colors.find((c) => c.hex === colorHex)?.name ?? "Custom";

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

  function setElements(next: DesignElement[]) {
    setDesign({ ...design, [side]: next });
  }

  function addText() {
    const fontSize = 130;
    const text = "Your text";
    const width = Math.max(200, text.length * fontSize * 0.62);
    const height = fontSize * 1.25;
    const el = clampElementToPrintArea(
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

  function openUpload() {
    fileInputRef.current?.click();
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
      const el = clampElementToPrintArea(
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

      if (check.warning) setMessage({ kind: "warning", text: check.warning });
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
    const item: CartItem = {
      id: newId(),
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      colorName,
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
    <div className="pb-28 lg:pb-24">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[76px_minmax(0,1fr)_320px]">
        {/* Left tool rail */}
        <aside className="sticky top-4 hidden h-fit flex-col gap-1 rounded-xl border border-stone-200 bg-white p-2 shadow-sm lg:flex">
          <RailButton label="Add Text" onClick={addText}>
            <IconText />
          </RailButton>
          <RailButton label="Upload" onClick={openUpload}>
            <IconUpload />
          </RailButton>
          <RailButton label="Colour" onClick={() => scrollToId("colour")}>
            <IconPalette />
          </RailButton>
          <RailButton label="Price" onClick={() => scrollToId("price")}>
            <IconTag />
          </RailButton>
        </aside>

        {/* Canvas */}
        <div>
          <div className="card relative overflow-auto p-2">
            <StudioCanvas
              product={product}
              colorHex={colorHex}
              side={side}
              design={design}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={setDesign}
              editorMode
              zoom={zoom}
            />

            {isEmpty && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-50/90 p-4">
                <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-lg">
                  <h2 className="text-lg font-semibold">How do you want to start?</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <StarterTile label="Upload artwork" onClick={openUpload} disabled={uploading}>
                      <IconUpload />
                    </StarterTile>
                    <StarterTile label="Add text" onClick={addText}>
                      <IconText />
                    </StarterTile>
                    <StarterTile label="Change product" href="/">
                      <IconTag />
                    </StarterTile>
                    <StarterTile label="Shirt colour" onClick={() => scrollToId("colour")}>
                      <IconPalette />
                    </StarterTile>
                  </div>
                  <ul className="mt-5 space-y-1 text-xs text-stone-500">
                    <li>PNG or JPG, at least {settings.minImageDimensionPx} px on the shortest side</li>
                    <li>Drag to move; drag the corners to resize; the top handle rotates</li>
                    <li>Front and back each have their own design</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className="btn-outline" onClick={addText}>
              + Add text
            </button>
            <button className="btn-outline" onClick={openUpload} disabled={uploading}>
              {uploading ? "Uploading…" : "+ Upload artwork"}
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
            <span className="ml-auto text-xs text-stone-500">
              Print area {printArea.widthIn}in × {printArea.heightIn}in
            </span>
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

        {/* Right column */}
        <div className="space-y-4">
          {/* Side thumbnails + zoom */}
          <section className="card p-3">
            <div className="grid grid-cols-2 gap-2">
              {(["front", "back"] as Side[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSide(s);
                    setSelectedId(null);
                  }}
                  className={`rounded-xl border p-1 transition ${
                    side === s
                      ? "border-ginger ring-1 ring-ginger"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="pointer-events-none overflow-hidden rounded-lg bg-stone-100">
                    <StudioCanvas
                      product={product}
                      colorHex={colorHex}
                      side={s}
                      design={design}
                      selectedId={null}
                      onSelect={() => {}}
                      onChange={() => {}}
                      editorMode={false}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-medium capitalize text-stone-600">
                    {s}
                    {design[s].length > 0 && (
                      <span className="rounded bg-ginger/15 px-1 text-[10px] text-ginger-dark">
                        {design[s].length}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg bg-stone-100 px-2 py-1">
              <button
                className="rounded px-2 py-1 text-sm hover:bg-white"
                onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="text-xs text-stone-600">{Math.round(zoom * 100)}%</span>
              <button
                className="rounded px-2 py-1 text-sm hover:bg-white"
                onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(2)))}
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                className="rounded px-2 py-1 text-xs text-stone-600 hover:bg-white"
                onClick={() => setZoom(1)}
              >
                Fit
              </button>
            </div>
          </section>

          {/* Colour */}
          <section className="card p-4" id="colour">
            <h2 className="text-sm font-semibold">Shirt colour</h2>
            <div className="mt-3 flex flex-wrap gap-2">
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
            <p className="mt-1 text-xs text-stone-500">{colorName}</p>
          </section>

          {/* Selected element settings */}
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
                        onChange={(e) => updateSelected({ fontSize: Number(e.target.value) || 48 })}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-stone-500">
                  Drag the corners to resize, the handle above to rotate. Use the artwork file itself
                  for the best print quality.
                </p>
              )}
            </section>
          )}

          {/* Price and quantity */}
          <section className="card p-4" id="price">
            <h2 className="text-sm font-semibold">Price and quantity</h2>
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
                Bulk
              </button>
            </div>

            {mode === "single" ? (
              <div className="mt-3 flex gap-3">
                <div className="flex-1">
                  <label className="label">Size</label>
                  <select className="input" value={singleSize} onChange={(e) => setSingleSize(e.target.value)}>
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
                        setBulkSizes({ ...bulkSizes, [s]: Math.max(0, Number(e.target.value) || 0) })
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
                      {tier.maxQty ? `–${tier.maxQty}` : "+"})
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
              <select className="input" value={printMethod} onChange={(e) => setPrintMethod(e.target.value)}>
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

      {/* Bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <div className="hidden items-center gap-3 sm:flex">
            <span
              className="inline-block h-8 w-8 rounded-full border border-stone-300"
              style={{ backgroundColor: colorHex }}
            />
            <div className="leading-tight">
              <p className="text-sm font-medium">{product.name}</p>
              <button
                className="text-xs text-ginger-dark underline"
                onClick={() => scrollToId("colour")}
              >
                {colorName} · change colour
              </button>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-stone-500">
                {totalQty || 0} pcs · {formatPaise(unitPricePaise)} each
              </p>
              <p className="text-base font-semibold">{formatPaise(lineTotalPaise)}</p>
            </div>
            <button className="btn-outline hidden sm:inline-flex" onClick={() => scrollToId("price")}>
              Price
            </button>
            <button className="btn-primary" onClick={onAddToCart}>
              Get price / Add to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StarterTile({
  label,
  onClick,
  href,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      <span className="text-stone-700">{children}</span>
      <span className="text-sm font-medium">{label}</span>
    </>
  );
  const cls =
    "flex flex-col items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white p-4 text-center hover:border-ginger hover:text-ginger-dark disabled:opacity-50";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button className={cls} onClick={onClick} disabled={disabled}>
      {inner}
    </button>
  );
}
