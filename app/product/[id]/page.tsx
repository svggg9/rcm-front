import ProductPageClient from "./ProductPageClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { productPath } from "../../lib/productUrls";
import { getProductPage } from "./lib/getProductPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getProductPage(id);
  const product = data?.product ?? null;

  if (!product) {
    return {
      title: "Товар не найден | рцмаркет",
      description: "Товар не найден.",
    };
  }

  const title = product.brand
    ? `${product.brand} ${product.title} | рцмаркет`
    : `${product.title} | рцмаркет`;
  const canonicalPath = productPath(product);

  return {
    title,
    description:
      product.description ||
      `Купить ${product.title} на рцмаркет.`,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description:
        product.description ||
        `Купить ${product.title} на рцмаркет.`,
      type: "website",
      url: canonicalPath,
      images: product.images?.[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await getProductPage(id);

  if (!data) {
    notFound();
  }

  return <ProductPageClient product={data.product} related={data.related} />;
}
