
import type { MetadataRoute } from "next";

import { API_URL, SITE_URL } from "./lib/config";

type BrandResponse = {
  id: number;
  name: string;
  slug: string | null;
};

type ProductListItemResponse = {
  id: number;
};

type ProductsPageResponse = {
  content?: ProductListItemResponse[];
};

function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

async function getBrands(): Promise<BrandResponse[]> {
  try {
    const response = await fetch(`${API_URL}/api/brands`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    const data: unknown = await response.json();

    if (!Array.isArray(data)) return [];

    return data.filter(
      (brand): brand is BrandResponse =>
        typeof brand === "object" &&
        brand !== null &&
        "id" in brand &&
        "name" in brand &&
        "slug" in brand &&
        typeof (brand as BrandResponse).id === "number" &&
        typeof (brand as BrandResponse).name === "string" &&
        typeof (brand as BrandResponse).slug === "string"
    );
  } catch {
    return [];
  }
}

async function getProducts(): Promise<ProductListItemResponse[]> {
  try {
    const response = await fetch(`${API_URL}/api/products/page?page=0&size=1000`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    const data: unknown = await response.json();

    if (typeof data !== "object" || data === null || !("content" in data)) {
      return [];
    }

    const page = data as ProductsPageResponse;

    return Array.isArray(page.content)
      ? page.content.filter(
          (product): product is ProductListItemResponse =>
            typeof product === "object" &&
            product !== null &&
            typeof (product as ProductListItemResponse).id === "number"
        )
      : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [brands, products] = await Promise.all([getBrands(), getProducts()]);

  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/catalog"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...brands.map((brand) => ({
      url: absoluteUrl(`/brand/${encodeURIComponent(brand.slug ?? "")}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`/product/${product.id}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}