import { API_URL, apiFetch } from "../../lib/api";
import type { CartItem } from "./types";

export async function getCart(cartId: string): Promise<CartItem[]> {
  const res = await apiFetch(
    `${API_URL}/api/cart?cartId=${encodeURIComponent(cartId)}`
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Не удалось загрузить корзину");
  }

  return res.json();
}

export async function updateQuantity(
  cartId: string,
  variantId: number,
  qty: number
): Promise<CartItem[]> {
  const res = await apiFetch(
    `${API_URL}/api/cart/quantity?cartId=${encodeURIComponent(
      cartId
    )}&variantId=${variantId}&qty=${qty}`,
    { method: "PUT" }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Не удалось изменить количество");
  }

  return res.json();
}

export async function removeItem(
  cartId: string,
  variantId: number
): Promise<CartItem[]> {
  const res = await apiFetch(
    `${API_URL}/api/cart/remove?cartId=${encodeURIComponent(
      cartId
    )}&variantId=${variantId}`,
    { method: "DELETE" }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Не удалось удалить товар");
  }

  return res.json();
}