import { API_URL, apiFetch } from "../../lib/api";
import type { CartItem } from "./types";
import { MAX_PRODUCT_QUANTITY } from "./quantityLimits";

export const PRODUCT_QUANTITY_LIMIT_MESSAGE = `Не больше ${MAX_PRODUCT_QUANTITY} единиц одного товара`;

export class CartActionError extends Error {
  constructor(message: string, public readonly availableQuantity?: number) { super(message); }
}

export async function cartActionError(response: Response, fallback: string): Promise<CartActionError> {
  const body: unknown = await response.json().catch(() => null);
  const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : "";
  const stock = /^Requested qty \d+ exceeds available stock (\d+)$/.exec(message);
  if (stock) {
    const available = Number(stock[1]);
    return new CartActionError(available ? `Доступно только ${available} шт` : "Товар закончился", available);
  }
  if (["PRODUCT_QUANTITY_LIMIT", PRODUCT_QUANTITY_LIMIT_MESSAGE, "Не больше 5 единиц одного товара по всем размерам и цветам"].includes(message)) {
    return new CartActionError(PRODUCT_QUANTITY_LIMIT_MESSAGE);
  }
  if (response.status === 409 && message === "Variant is not available for purchase") return new CartActionError("Товар больше недоступен — удалите его из корзины");
  return new CartActionError(fallback);
}

export async function getCart(cartId: string): Promise<CartItem[]> {
  const res = await apiFetch(
    `${API_URL}/api/cart?cartId=${encodeURIComponent(cartId)}`
  );

  if (!res.ok) {
    throw await cartActionError(res, "Не удалось загрузить корзину");
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
    throw await cartActionError(res, "Не удалось изменить количество — попробуйте ещё раз");
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
    throw await cartActionError(res, "Не удалось удалить товар — попробуйте ещё раз");
  }

  return res.json();
}
