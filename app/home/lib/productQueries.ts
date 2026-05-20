import { API_URL } from "../../lib/api";

export type StorefrontProduct = {
  id: number;
  title: string;
  brand: string | null;
  category: string | null;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  images: string[];
  minPrice: number;
};

type RawProduct = {
  id?: unknown;
  title?: unknown;
  brand?: unknown;
  category?: unknown;
  audience?: unknown;
  coverImage?: unknown;
  hoverImage?: unknown;
  minPrice?: unknown;
};

function normalizeProducts(data: unknown): StorefrontProduct[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((item): StorefrontProduct | null => {
      const product = item as RawProduct;

      if (typeof product.id !== "number" || typeof product.title !== "string") {
        return null;
      }

      const coverImage =
        typeof product.coverImage === "string" && product.coverImage.length > 0
          ? product.coverImage
          : null;

      const hoverImage =
        typeof product.hoverImage === "string" &&
        product.hoverImage.length > 0 &&
        product.hoverImage !== coverImage
          ? product.hoverImage
          : null;

      return {
        id: product.id,
        title: product.title,
        brand: typeof product.brand === "string" ? product.brand : null,
        category: typeof product.category === "string" ? product.category : null,
        audience:
          product.audience === "MEN" ||
          product.audience === "WOMEN" ||
          product.audience === "UNISEX"
            ? product.audience
            : "UNISEX",
        images: [coverImage, hoverImage].filter(
          (image): image is string => typeof image === "string"
        ),
        minPrice: typeof product.minPrice === "number" ? product.minPrice : 0,
      };
    })
    .filter((product): product is StorefrontProduct => product !== null);
}

async function fetchProducts(): Promise<StorefrontProduct[]> {
  const res = await fetch(`${API_URL}/api/products/list`, {
    next: { revalidate: 120 },
  });

  if (!res.ok) {
    throw new Error("Failed to load products");
  }

  return normalizeProducts(await res.json());
}

export async function getLatestProducts(limit = 12): Promise<StorefrontProduct[]> {
  const products = await fetchProducts();
  return products.slice(0, limit);
}

export async function getProductsByBrand(
  brand: string,
  limit = 12
): Promise<StorefrontProduct[]> {
  const products = await fetchProducts();

  return products.filter((product) => product.brand === brand).slice(0, limit);
}

export async function getProductsByCategory(
  category: string,
  limit = 12
): Promise<StorefrontProduct[]> {
  const products = await fetchProducts();

  return products.filter((product) => product.category === category).slice(0, limit);
}

export async function getRelatedProducts(
  baseProduct: StorefrontProduct,
  limit = 12
): Promise<StorefrontProduct[]> {
  const products = await fetchProducts();

  return products
    .filter((product) => product.id !== baseProduct.id)
    .sort((a, b) => {
      const scoreA =
        (a.category === baseProduct.category ? 2 : 0) +
        (a.brand === baseProduct.brand ? 1 : 0);

      const scoreB =
        (b.category === baseProduct.category ? 2 : 0) +
        (b.brand === baseProduct.brand ? 1 : 0);

      return scoreB - scoreA;
    })
    .slice(0, limit);
}