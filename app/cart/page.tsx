"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCart, removeFromCart, type CartItem } from "@/lib/cart";
import type { PublicProduct } from "@/lib/catalog";
import { designElementCount } from "@/lib/design";
import { formatPaise } from "@/lib/pricing";

const StudioCanvas = dynamic(() => import("@/components/StudioCanvas"), {
  ssr: false,
  loading: () => <div className="h-48 rounded bg-stone-100" />,
});

function CartItemPreview({ item }: { item: CartItem }) {
  const product = {
    id: item.productId,
    slug: item.productSlug,
    name: item.productName,
    category: "tshirt",
    description: "",
    retailPricePaise: 0,
    shirtBox: item.shirtBox,
    printFront: item.printFront,
    printBack: item.printBack,
    colors: [],
    sizes: [],
    tiers: [],
  } as unknown as PublicProduct;

  return (
    <StudioCanvas
      product={product}
      colorHex={item.colorHex}
      side="front"
      design={item.design}
      selectedId={null}
      onSelect={() => {}}
      onChange={() => {}}
      editorMode={false}
    />
  );
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[] | null>(null);

  useEffect(() => {
    setItems(getCart());
    const refresh = () => setItems(getCart());
    window.addEventListener("sg-cart", refresh);
    return () => window.removeEventListener("sg-cart", refresh);
  }, []);

  if (items === null) {
    return <p className="text-sm text-stone-500">Loading your cart…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-stone-600">Your cart is empty.</p>
        <Link href="/" className="btn-primary mt-4">
          Browse T-shirts
        </Link>
      </div>
    );
  }

  const total = items.reduce((a, i) => a + i.lineTotalPaise, 0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Your cart</h1>
        {items.map((item) => {
          const sizeList = Object.entries(item.sizes)
            .filter(([, q]) => q > 0)
            .map(([s, q]) => `${s}×${q}`)
            .join(", ");
          const elementCount = designElementCount(item.design);
          return (
            <div key={item.id} className="card p-4">
              <div className="flex gap-4">
                <div className="w-32 shrink-0">
                  <CartItemPreview item={item} />
                </div>
                <div className="flex-1">
                  <h2 className="font-medium">{item.productName}</h2>
                  <p className="text-sm text-stone-600">
                    {item.colorName} · {sizeList || "no sizes"}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {elementCount} design element{elementCount === 1 ? "" : "s"} ·
                    print: {item.printMethod.toUpperCase()}
                  </p>
                  <p className="mt-2 text-sm">
                    {formatPaise(item.unitPricePaise)} × {item.quantity} ={" "}
                    <span className="font-semibold">
                      {formatPaise(item.lineTotalPaise)}
                    </span>
                  </p>
                  <button
                    className="btn-ghost mt-2 px-0 text-red-600"
                    onClick={() => removeFromCart(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <aside className="card h-fit p-4">
        <h2 className="text-sm font-semibold">Order summary</h2>
        <div className="mt-3 flex justify-between text-sm">
          <span className="text-stone-600">Subtotal</span>
          <span className="font-semibold">{formatPaise(total)}</span>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Final price is confirmed by our team. Payment is arranged after we
          confirm your order.
        </p>
        <Link href="/checkout" className="btn-primary mt-4 w-full">
          Proceed to checkout
        </Link>
      </aside>
    </div>
  );
}
