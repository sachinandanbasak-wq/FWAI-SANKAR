import Link from "next/link";
import type { PublicProduct } from "@/lib/catalog";
import { SHIRT_PATH, SHIRT_VIEWBOX } from "@/lib/design";
import { formatPaise } from "@/lib/pricing";

const SHIRT_COLORS: Record<string, string> = {
  tshirt: "#1f2a44",
  polo: "#14532d",
  hoodie: "#6b1f2a",
  cap: "#141414",
};

export default function ProductCard({ product }: { product: PublicProduct }) {
  const tiers = [...product.tiers].sort((a, b) => a.minQty - b.minQty);
  const bulk = tiers[tiers.length - 1];
  const base = tiers[0];
  const shirtColor = SHIRT_COLORS[product.category] ?? "#1f2a44";

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex h-44 items-center justify-center bg-stone-100">
        <svg
          viewBox={`0 0 ${SHIRT_VIEWBOX.width} ${SHIRT_VIEWBOX.height}`}
          className="h-40 w-auto"
          aria-hidden
        >
          <ShirtPath fill={shirtColor} />
        </svg>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="text-base font-semibold">{product.name}</h2>
        <p className="mt-1 text-sm text-stone-600">{product.description}</p>

        <div className="mt-3 space-y-0.5 text-sm">
          <p>
            <span className="font-semibold">
              {formatPaise(base.unitPricePaise)}
            </span>{" "}
            each
          </p>
          {bulk && bulk.minQty > 1 && (
            <p className="text-stone-600">
              <span className="font-medium text-ginger-dark">
                {formatPaise(bulk.unitPricePaise)}
              </span>{" "}
              each for {bulk.minQty}+ pieces
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex -space-x-1">
            {product.colors.slice(0, 6).map((c) => (
              <span
                key={c.hex}
                title={c.name}
                className="inline-block h-4 w-4 rounded-full border border-stone-300"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <span className="text-xs text-stone-500">
            {product.colors.length} colours · {product.sizes.join(" / ")}
          </span>
        </div>

        <div className="mt-4 flex-1" />
        <Link
          href={`/studio/${product.slug}`}
          className="btn-primary w-full"
        >
          Customize
        </Link>
        <p className="mt-2 text-center text-[11px] text-stone-400">
          Placeholder pricing — to be confirmed
        </p>
      </div>
    </div>
  );
}

export function ShirtPath({ fill }: { fill: string }) {
  return (
    <>
      <path d={SHIRT_PATH} fill={fill} />
      <path d={SHIRT_PATH} fill="url(#shade)" />
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000000" stopOpacity="0.22" />
          <stop offset="0.28" stopColor="#000000" stopOpacity="0.02" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="0.72" stopColor="#000000" stopOpacity="0.02" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
        </linearGradient>
      </defs>
    </>
  );
}
