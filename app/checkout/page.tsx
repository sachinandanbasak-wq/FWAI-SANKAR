"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearCart, getCart, type CartItem } from "@/lib/cart";
import type { DesignElement } from "@/lib/design";
import { formatPaise } from "@/lib/pricing";

type Settings = { printDpi: number; printMethods: string[] };

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [settings, setSettings] = useState<Settings>({
    printDpi: 300,
    printMethods: ["dtf", "embroidery", "vinyl"],
  });
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    printMethod: "dtf",
  });
  const [busy, setBusy] = useState<null | "exporting" | "submitting">(null);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ orderNumber: string } | null>(null);

  const [signedInAs, setSignedInAs] = useState<string | null>(null);

  useEffect(() => {
    setItems(getCart());
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings) {
          setSettings({
            printDpi: d.settings.printDpi ?? 300,
            printMethods: d.settings.printMethods ?? ["dtf"],
          });
          setForm((f) => ({
            ...f,
            printMethod: d.settings.printMethods?.[0] ?? "dtf",
          }));
        }
      })
      .catch(() => {});

    // If the customer is signed in, prefill their saved details.
    fetch("/api/account/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.customer) {
          setSignedInAs(d.customer.email);
          setForm((f) => ({
            ...f,
            customerName: d.customer.name ?? f.customerName,
            phone: d.customer.phone ?? f.phone,
            email: d.customer.email ?? f.email,
            address: d.customer.address || f.address,
          }));
        }
      })
      .catch(() => {});
  }, []);

  if (placed) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold">Order placed</h1>
        <p className="mt-2 text-stone-600">
          Thank you. Your order number is{" "}
          <span className="font-semibold">{placed.orderNumber}</span>.
        </p>
        <p className="mt-2 text-sm text-stone-500">
          Our team will confirm the print details and payment with you on the
          number you gave.
        </p>
        <Link href="/" className="btn-primary mt-5">
          Back to shop
        </Link>
      </div>
    );
  }

  if (items === null) {
    return <p className="text-sm text-stone-500">Loading checkout…</p>;
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

  async function uploadPrint(
    blob: Blob,
    filename: string
  ): Promise<string> {
    const form = new FormData();
    form.append("file", new File([blob], filename, { type: "image/png" }));
    form.append("kind", "print");
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Print file upload failed.");
    return data.url as string;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!items) return;

    try {
      setBusy("exporting");
      const { exportPrintPng } = await import("@/lib/print-export");

      const resolvedItems = [] as Record<string, unknown>[];
      for (const item of items) {
        const front: string | null =
          item.design.front.length > 0
            ? await uploadPrint(
                await exportPrintPng(
                  item.design,
                  "front",
                  item.printFront,
                  settings.printDpi
                ),
                `${item.productSlug}-front.png`
              )
            : null;
        const back: string | null =
          item.design.back.length > 0
            ? await uploadPrint(
                await exportPrintPng(
                  item.design,
                  "back",
                  item.printBack,
                  settings.printDpi
                ),
                `${item.productSlug}-back.png`
              )
            : null;

        resolvedItems.push({
          productId: item.productId,
          colorName: item.colorName,
          colorHex: item.colorHex,
          sizes: item.sizes,
          design: item.design,
          artworkUrls: [
            ...item.design.front,
            ...item.design.back,
          ]
            .filter((el: DesignElement) => el.type === "image" && el.src)
            .map((el: DesignElement) => el.src as string),
          printFrontUrl: front,
          printBackUrl: back,
        });
      }

      setBusy("submitting");
      const totalQty = items.reduce((a, i) => a + i.quantity, 0);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          orderType: totalQty > 1 ? "bulk" : "single",
          items: resolvedItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not place the order. Please try again.");
        setBusy(null);
        return;
      }

      clearCart();
      setPlaced({ orderNumber: data.orderNumber });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while preparing your print files. Please try again."
      );
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <form onSubmit={onSubmit} className="card p-4">
        <h1 className="text-xl font-semibold">Checkout</h1>
        <p className="mt-1 text-sm text-stone-500">
          We only need these details to prepare and deliver your order.
        </p>
        {signedInAs && (
          <p className="mt-2 rounded-md bg-green-50 p-2 text-xs text-green-700">
            Signed in as {signedInAs}. Your saved details are filled in and this
            order will appear in your account.
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Full name *</label>
            <input
              className="input"
              required
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone (10-digit mobile) *</label>
            <input
              className="input"
              required
              inputMode="numeric"
              placeholder="9876543210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              className="input"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Delivery address *</label>
            <textarea
              className="input"
              rows={3}
              required
              placeholder="House / street, area, city, state, pincode"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes (optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Anything else we should know?"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary mt-4 w-full"
          disabled={busy !== null}
        >
          {busy === "exporting"
            ? "Preparing print files…"
            : busy === "submitting"
            ? "Placing order…"
            : `Place order — ${formatPaise(total)}`}
        </button>
      </form>

      <aside className="card h-fit p-4">
        <h2 className="text-sm font-semibold">Your order</h2>
        <ul className="mt-3 space-y-3">
          {items.map((item) => {
            const sizeList = Object.entries(item.sizes)
              .filter(([, q]) => q > 0)
              .map(([s, q]) => `${s}×${q}`)
              .join(", ");
            return (
              <li key={item.id} className="text-sm">
                <p className="font-medium">{item.productName}</p>
                <p className="text-stone-600">
                  {item.colorName} · {sizeList}
                </p>
                <p className="text-stone-500">{formatPaise(item.lineTotalPaise)}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex justify-between border-t border-stone-200 pt-3 text-base font-semibold">
          <span>Total</span>
          <span>{formatPaise(total)}</span>
        </div>
      </aside>
    </div>
  );
}
