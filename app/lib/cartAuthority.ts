import { apiFetch, API_URL } from "./api";
import {
  ensureGuestCartId,
  getGuestCartId,
  rememberUserCartId,
} from "./auth";
import { getClientSession } from "./client-session";
import type { CartItem } from "../cart/lib/types";

export type ResolvedCart = {
  cartId: string;
  items: CartItem[];
};

export async function resolveCartId(): Promise<string> {
  const session = await getClientSession();
  if (!session) return ensureGuestCartId();

  const cartId = `user_${session.username}`;
  rememberUserCartId(cartId);
  return cartId;
}

export async function loadResolvedCart(): Promise<ResolvedCart> {
  const session = await getClientSession();

  if (session) {
    const response = await apiFetch(`${API_URL}/api/cart/me`);
    if (!response.ok) throw new Error("Не удалось загрузить корзину");

    const cart = (await response.json()) as ResolvedCart;
    if (!cart || typeof cart.cartId !== "string" || !Array.isArray(cart.items)) {
      throw new Error("Backend вернул некорректную корзину");
    }
    rememberUserCartId(cart.cartId);
    return cart;
  }

  const cartId = await ensureGuestCartId();
  const response = await apiFetch(
    `${API_URL}/api/cart?cartId=${encodeURIComponent(cartId)}`
  );
  if (!response.ok) throw new Error("Не удалось загрузить корзину");

  const items = (await response.json()) as CartItem[];
  return { cartId, items: Array.isArray(items) ? items : [] };
}

export async function loadResolvedCartCount(): Promise<number> {
  const session = await getClientSession();
  const guestCartId = session ? "" : getGuestCartId();

  if (!session && !guestCartId) return 0;

  const url = session
    ? `${API_URL}/api/cart/me/count`
    : `${API_URL}/api/cart/count?cartId=${encodeURIComponent(guestCartId)}`;
  const response = await apiFetch(url);
  if (!response.ok) return 0;

  const data: unknown = await response.json();
  return data !== null &&
    typeof data === "object" &&
    "count" in data &&
    typeof data.count === "number" &&
    Number.isFinite(data.count)
    ? data.count
    : 0;
}
