import { API_URL } from "../../lib/api";
import ProductPageClient from "./ProductPageClient";
import type { Product } from "./lib/types";
import { mapProductToCarouselProduct } from "../../lib/productMappers";
import type { CarouselProduct } from "../../components/ProductCarousel/types";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { productPath } from "../../lib/productUrls";

export const dynamic = "force-dynamic";

async function getProduct(id: string): Promise<Product | null> {
  const response = await fetch(`${API_URL}/api/products/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function getRelatedProductItems(id: string): Promise<CarouselProduct[]> {
  const response = await fetch(`${API_URL}/api/products/${id}/related?limit=12`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return [];
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((product) => mapProductToCarouselProduct(product))
    .filter((product): product is CarouselProduct => product !== null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

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

  const [product, related] = await Promise.all([
    getProduct(id),
    getRelatedProductItems(id),
  ]);

  if (!product) {
    notFound();
  }

  return <ProductPageClient product={product} related={related} />;
}
