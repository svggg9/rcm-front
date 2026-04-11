import { API_URL } from "../../lib/api";

type ProductVariant = {
  id: number;
  size: string;
  color: string;
  price: number;
  quantity: number;
  sku: string;
};

export type StorefrontProduct = {
  id: number;
  title: string;
  description: string;
  brand: string | null;
  category: string;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  images: string[];
  variants: ProductVariant[];
};

async function fetchProducts(): Promise<StorefrontProduct[]> {
  const res = await fetch(`${API_URL}/api/products`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load products");
  }

  const data: StorefrontProduct[] = await res.json();
  return Array.isArray(data) ? data : [];
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

  return products
    .filter((product) => product.brand === brand)
    .slice(0, limit);
}

export async function getProductsByCategory(
  category: string,
  limit = 12
): Promise<StorefrontProduct[]> {
  const products = await fetchProducts();

  return products
    .filter((product) => product.category === category)
    .slice(0, limit);
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