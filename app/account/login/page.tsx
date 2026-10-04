"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not sign in.");
      setBusy(false);
      return;
    }
    router.replace("/account");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm">
      <form onSubmit={onSubmit} className="card p-6">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-stone-500">
          See your orders and track their status.
        </p>
        <div className="mt-4 space-y-3">
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
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              required
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
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-center text-sm text-stone-600">
          New here?{" "}
          <Link href="/account/register" className="text-ginger-dark underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
