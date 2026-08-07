import { API_URL } from "../../lib/api";
import ProductPageClient from "./ProductPageClient";
import type { Product } from "./lib/types";
import { mapProductToCarouselProduct } from "../../lib/productMappers";
import type { CarouselProduct } from "../../components/ProductCarousel/types";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { productPath } from "../../lib/productUrls";
import { cache } from "react";

export const dynamic = "force-dynamic";

type ProductPageData = {
  product: Product;
  related: CarouselProduct[];
};

const getProductPage = cache(async (id: string): Promise<ProductPageData | null> => {
  const response = await fetch(
    `${API_URL}/api/products/${encodeURIComponent(id)}/page?relatedLimit=12`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("product" in data)) {
    return null;
  }

  const payload = data as { product?: unknown; related?: unknown };
  if (!payload.product || typeof payload.product !== "object") {
    return null;
  }

  const related = Array.isArray(payload.related)
    ? payload.related
        .map((product) => mapProductToCarouselProduct(product))
        .filter((product): product is CarouselProduct => product !== null)
    : [];

  return {
    product: payload.product as Product,
    related,
  };
});

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
      title: "Товар не найден | RCM",
      description: "Товар не найден.",
    };
  }

  const title = product.brand
    ? `${product.brand} ${product.title} | RCM`
    : `${product.title} | RCM`;
  const canonicalPath = productPath(product);

  return {
    title,
    description:
      product.description ||
      `Купить ${product.title} на RCM Marketplace.`,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description:
        product.description ||
        `Купить ${product.title} на RCM Marketplace.`,
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
