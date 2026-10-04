"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not create the account.");
      setBusy(false);
      return;
    }
    router.replace("/account");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm">
      <form onSubmit={onSubmit} className="card p-6">
        <h1 className="text-lg font-semibold">Create an account</h1>
        <p className="mt-1 text-sm text-stone-500">
          To see your orders and track their status.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone (10-digit mobile)</label>
            <input
              className="input"
              inputMode="numeric"
              required
              placeholder="9876543210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Password (at least 6 characters)</label>
            <input
              type="password"
              className="input"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary mt-4 w-full" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
        <p className="mt-4 text-center text-sm text-stone-600">
          Already have an account?{" "}
          <Link href="/account/login" className="text-ginger-dark underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
