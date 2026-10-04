"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPaise } from "@/lib/pricing";

type AdminItem = {
  id: string;
  productName: string;
  productSlug: string;
  colorName: string;
  colorHex: string;
  sizes: Record<string, number>;
  design: { front: unknown[]; back: unknown[] };
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  artworkUrls: string[];
  printFrontUrl: string | null;
  printBackUrl: string | null;
};

type AdminOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  notes: string | null;
  orderType: string;
  printMethod: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  items: AdminItem[];
};

type Data = {
  orders: AdminOrder[];
  statuses: string[];
  statusLabels: Record<string, string>;
  printMethodLabels: Record<string, string>;
};

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status: string) => {
    const res = await fetch(`/api/admin/orders?status=${status}`);
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const json = await res.json();
    setData(json);
  }, [router]);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not update the status.");
      return;
    }
    setData((d) =>
      d
        ? {
            ...d,
            orders: d.orders.map((o) => (o.id === id ? { ...o, status } : o)),
          }
        : d
    );
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  function downloadDesignJson(order: AdminOrder, item: AdminItem) {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            orderNumber: order.orderNumber,
            product: item.productName,
            colour: item.colorName,
            sizes: item.sizes,
            printMethod: order.printMethod,
            design: item.design,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${order.orderNumber}-${item.productSlug}-design.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!data) {
    return <p className="text-sm text-stone-500">Loading orders…</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Orders</h1>
        <button className="btn-ghost" onClick={logout}>
          Sign out
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {["ALL", ...data.statuses].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === s
                ? "bg-ginger text-white"
                : "bg-stone-200 text-stone-700"
            }`}
          >
            {s === "ALL" ? "All" : data.statusLabels[s] ?? s}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {data.orders.length === 0 ? (
        <p className="card p-8 text-center text-stone-600">
          No orders with this status yet.
        </p>
      ) : (
        <div className="space-y-4">
          {data.orders.map((o) => (
            <div key={o.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{o.orderNumber}</p>
                  <p className="text-xs text-stone-500">
                    {new Date(o.createdAt).toLocaleString("en-IN")} ·{" "}
                    {o.orderType === "bulk" ? "Bulk" : "Single"} ·{" "}
                    {data.printMethodLabels[o.printMethod] ?? o.printMethod}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.statuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(o.id, s)}
                      className={`rounded px-2 py-1 text-xs ${
                        o.status === s
                          ? "bg-ginger text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {data.statusLabels[s] ?? s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-stone-50 p-3 text-sm">
                  <p className="font-medium">{o.customerName}</p>
                  <p className="text-stone-600">{o.phone}</p>
                  <p className="text-stone-600">{o.email}</p>
                  <p className="mt-1 whitespace-pre-wrap text-stone-600">
                    {o.address}
                  </p>
                  {o.notes && (
                    <p className="mt-1 text-stone-500">Notes: {o.notes}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {o.items.map((item) => {
                    const sizeList = Object.entries(item.sizes)
                      .filter(([, q]) => q > 0)
                      .map(([s, q]) => `${s}×${q}`)
                      .join(", ");
                    const count =
                      item.design.front.length + item.design.back.length;
                    return (
                      <div key={item.id} className="rounded-md border border-stone-200 p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-4 w-4 rounded-full border border-stone-300"
                            style={{ backgroundColor: item.colorHex }}
                          />
                          <span className="font-medium">{item.productName}</span>
                          <span className="text-stone-500">{item.colorName}</span>
                        </div>
                        <p className="mt-1 text-stone-600">
                          {sizeList} · {item.quantity} pcs ·{" "}
                          {formatPaise(item.unitPricePaise)}/pc ={" "}
                          <span className="font-medium">
                            {formatPaise(item.lineTotalPaise)}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {count} design element{count === 1 ? "" : "s"} (
                          {item.design.front.length} front / {item.design.back.length} back)
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {item.printFrontUrl && (
                            <a
                              className="btn-outline px-2 py-1"
                              href={item.printFrontUrl}
                              download
                            >
                              Print-ready front (PNG)
                            </a>
                          )}
                          {item.printBackUrl && (
                            <a
                              className="btn-outline px-2 py-1"
                              href={item.printBackUrl}
                              download
                            >
                              Print-ready back (PNG)
                            </a>
                          )}
                          {item.artworkUrls.map((u) => (
                            <a
                              key={u}
                              className="btn-outline px-2 py-1"
                              href={u}
                              download
                            >
                              Artwork
                            </a>
                          ))}
                          <button
                            className="btn-ghost px-2 py-1"
                            onClick={() => downloadDesignJson(o, item)}
                          >
                            Design JSON
                          </button>
                        </div>
                        {(o.printMethod === "embroidery" ||
                          o.printMethod === "vinyl") && (
                          <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
                            {o.printMethod === "embroidery"
                              ? "Embroidery: reduce to fewer colours, remove fine detail. Confirm the artwork with the customer before production."
                              : "Vinyl: use solid shapes only, no gradients. Confirm the artwork before production."}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 border-t border-stone-200 pt-2 text-right text-base font-semibold">
                Total {formatPaise(o.totalPaise)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
