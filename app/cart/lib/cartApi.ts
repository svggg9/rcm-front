import { API_URL, apiFetch } from "../../lib/api";
import { CartItem } from "./types";

export async function getCart(cartId: string): Promise<CartItem[]> {
  const res = await apiFetch(`${API_URL}/api/cart?cartId=${cartId}`);
  if (!res.ok) throw new Error("Failed to load cart");
  return res.json();
}

export async function updateQuantity(
  cartId: string,
  variantId: number,
  qty: number
): Promise<CartItem[]> {
  const res = await apiFetch(
    `${API_URL}/api/cart/quantity?cartId=${cartId}&variantId=${variantId}&qty=${qty}`,
    { method: "PUT" }
  );

  if (!res.ok) throw new Error("Failed to update quantity");
  return res.json();
}

export async function removeItem(
  cartId: string,
  variantId: number
): Promise<CartItem[]> {
  const res = await apiFetch(
    `${API_URL}/api/cart/remove?cartId=${cartId}&variantId=${variantId}`,
    { method: "DELETE" }
  );

  if (!res.ok) throw new Error("Failed to remove item");
  return res.json();
}