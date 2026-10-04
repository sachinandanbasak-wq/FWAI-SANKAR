"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not sign in.");
      setBusy(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm">
      <form onSubmit={onSubmit} className="card p-6">
        <h1 className="text-lg font-semibold">Admin sign in</h1>
        <p className="mt-1 text-sm text-stone-500">
          Sweet Ginger Fashions team only.
        </p>
        <div className="mt-4">
          <label className="label">Password</label>
          <input
            type="password"
            className="input"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary mt-4 w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
