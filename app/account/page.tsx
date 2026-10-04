"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPaise } from "@/lib/pricing";

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

type OrderItem = {
  id: string;
  productName: string;
  colorName: string;
  colorHex: string;
  sizes: Record<string, number>;
  quantity: number;
  lineTotalPaise: number;
  designCount: number;
  printFrontUrl: string | null;
  printBackUrl: string | null;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  printMethod: string;
  totalPaise: number;
  createdAt: string;
  items: OrderItem[];
};

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-amber-100 text-amber-800",
  IN_PRODUCTION: "bg-blue-100 text-blue-800",
  PRINTED: "bg-violet-100 text-violet-800",
  SHIPPED: "bg-green-100 text-green-800",
};

export default function AccountPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [printLabels, setPrintLabels] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/account/me");
      if (me.status === 401) {
        router.replace("/account/login");
        return;
      }
      const meJson = await me.json();
      const c: Profile = meJson.customer;
      setProfile(c);
      setForm({ name: c.name, email: c.email, phone: c.phone, address: c.address });

      const ord = await fetch("/api/account/orders");
      const oj = await ord.json();
      setOrders(oj.orders ?? []);
      setStatusLabels(oj.statusLabels ?? {});
      setPrintLabels(oj.printMethodLabels ?? {});
      setState("ready");
    })();
  }, [router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/account/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage({ kind: "error", text: data.error ?? "Could not save your details." });
      setBusy(false);
      return;
    }
    setProfile(data.customer);
    setMessage({ kind: "ok", text: "Your details are saved." });
    setBusy(false);
  }

  async function signOut() {
    await fetch("/api/account/logout", { method: "POST" });
    router.replace("/account/login");
  }

  if (state === "loading") {
    return <p className="text-sm text-stone-500">Loading your account…</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      {/* Profile */}
      <section className="card h-fit p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Your profile</h1>
          <button className="btn-ghost text-sm" onClick={signOut}>
            Sign out
          </button>
        </div>
        <p className="mt-1 text-xs text-stone-500">Signed in as {profile?.email}</p>

        <form onSubmit={save} className="mt-4 space-y-3">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone (10-digit mobile)</label>
            <input
              className="input"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Delivery address</label>
            <textarea
              className="input"
              rows={3}
              placeholder="House / street, area, city, state, pincode"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          {message && (
            <p
              className={`rounded-md p-2 text-sm ${
                message.kind === "ok"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Saving…" : "Save details"}
          </button>
        </form>

        <p className="mt-4 text-xs text-stone-500">
          Your saved address is used to fill checkout next time.
        </p>
      </section>

      {/* Orders */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your orders</h2>
          <Link href="/" className="btn-outline text-sm">
            Order again
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="card p-8 text-center text-stone-600">
            <p>You have no orders yet.</p>
            <Link href="/" className="btn-primary mt-4">
              Start designing
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{o.orderNumber}</p>
                    <p className="text-xs text-stone-500">
                      {new Date(o.createdAt).toLocaleString("en-IN")} ·{" "}
                      {o.orderType === "bulk" ? "Bulk" : "Single"} ·{" "}
                      {printLabels[o.printMethod] ?? o.printMethod}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      STATUS_STYLES[o.status] ?? "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {statusLabels[o.status] ?? o.status}
                  </span>
                </div>

                <ul className="mt-3 space-y-3">
                  {o.items.map((item) => {
                    const sizeList = Object.entries(item.sizes)
                      .filter(([, q]) => q > 0)
                      .map(([s, q]) => `${s}×${q}`)
                      .join(", ");
                    return (
                      <li key={item.id} className="flex items-start gap-3 text-sm">
                        <span
                          className="mt-0.5 inline-block h-5 w-5 shrink-0 rounded-full border border-stone-300"
                          style={{ backgroundColor: item.colorHex }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-stone-600">
                            {item.colorName} · {sizeList} · {item.quantity} pcs
                          </p>
                          <p className="text-xs text-stone-500">
                            {item.designCount} design element
                            {item.designCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span className="font-medium">
                          {formatPaise(item.lineTotalPaise)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-3 border-t border-stone-200 pt-2 text-right text-base font-semibold">
                  Total {formatPaise(o.totalPaise)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
