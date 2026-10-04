import { notFound } from "next/navigation";
import StudioClient from "@/components/StudioClient";
import { getProductBySlug } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function StudioPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const settings = await getSettings();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Customize: {product.name}</h1>
      <StudioClient product={product} settings={settings} />
    </div>
  );
}
