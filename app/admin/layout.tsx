import type { Metadata } from "next";

// Keep the admin area out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Admin — Sweet Ginger Design Studio",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
