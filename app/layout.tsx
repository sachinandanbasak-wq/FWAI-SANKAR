import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sweet Ginger Design Studio",
  description:
    "Design a T-shirt, see it on the real shirt colour, and order one piece or a bulk batch.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight">
                Sweet Ginger
              </span>
              <span className="rounded bg-ginger/10 px-2 py-0.5 text-xs font-medium text-ginger-dark">
                Design Studio
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-stone-700 hover:text-ginger-dark">
                Shop
              </Link>
              <Link
                href="/cart"
                className="text-stone-700 hover:text-ginger-dark"
              >
                Cart
              </Link>
              <Link
                href="/account"
                className="text-stone-700 hover:text-ginger-dark"
              >
                Account
              </Link>
              <Link
                href="/admin"
                className="text-stone-500 hover:text-ginger-dark"
              >
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-stone-500">
          Sweet Ginger Fashions, Jaipur · Prices in INR · Prices shown are
          placeholders until confirmed by the owner.
        </footer>
      </body>
    </html>
  );
}
