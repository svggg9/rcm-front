import { API_URL, apiFetch } from "../../../lib/api";
import type { Product } from "./types";
import { getRelatedProducts } from "./productPageUtils";

export async function fetchProduct(productId: string): Promise<Product> {
  const response = await apiFetch(`${API_URL}/api/products/${productId}`);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось загрузить товар");
  }

  return response.json();
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await apiFetch(`${API_URL}/api/products`);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Не удалось загрузить товары");
  }

  const data: Product[] = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchProductPageData(productId: string): Promise<{
  product: Product;
  related: Product[];
}> {
  const product = await fetchProduct(productId);
  const products = await fetchProducts();

  return {
    product,
    related: getRelatedProducts(products, product),
  };
}

export async function addVariantToCart(params: {
  cartId: string;
  variantId: number;
  qty?: number;
}): Promise<void> {
  const qty = params.qty ?? 1;

  const response = await apiFetch(
    `${API_URL}/api/cart/add?cartId=${encodeURIComponent(
      params.cartId
    )}&variantId=${params.variantId}&qty=${qty}`,
    { method: "POST" }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Ошибка добавления в корзину");
  }
}