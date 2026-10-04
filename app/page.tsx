import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div>
      <section className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Design it. See it. Order it.
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Pick a blank, add your text or artwork, and see it on the real shirt
          colour. Order a single piece for yourself, or a full size breakdown
          for an event, a company or your shop. One studio for both.
        </p>
      </section>

      {products.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No products found. Run <code>npm run setup</code> to create the
          database and seed products.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
