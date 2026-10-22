import { apiFetch, API_URL } from "./api";
import {
  ensureGuestCartId,
  getGuestCartId,
  rememberUserCartId,
} from "./auth";
import { getClientSession, getClientSessionRevision } from "./client-session";
import { ApiRequestError, readApiError, toApiError } from "./apiErrors";
import type { CartItem } from "../cart/lib/types";

export type ResolvedCart = {
  cartId: string;
  items: CartItem[];
  checkoutOrderId?: number | null;
};

function assertCurrentSession(revision: number) {
  if (revision !== getClientSessionRevision()) throw new DOMException("Аккаунт изменился — повторите действие", "AbortError");
}

async function resolveGuestCartId(revision: number): Promise<string> {
  try {
    const cartId = await ensureGuestCartId();
    assertCurrentSession(revision);
    return cartId;
  } catch (failure) {
    assertCurrentSession(revision);
    throw toApiError(failure, "Не удалось создать корзину — попробуйте ещё раз");
  }
}

async function readCart(url: string, revision: number): Promise<unknown> {
  try {
    const response = await apiFetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw await readApiError(response, "Не удалось загрузить корзину");
    const data: unknown = await response.json();
    assertCurrentSession(revision);
    return data;
  } catch (failure) {
    assertCurrentSession(revision);
    throw toApiError(failure, "Не удалось загрузить корзину");
  }
}

function rememberCart(cartId: string) {
  try { rememberUserCartId(cartId); } catch { /* The confirmed cart remains usable without browser storage. */ }
}

export async function resolveCartId(): Promise<string> {
  const revision = getClientSessionRevision();
  const session = await getClientSession();
  assertCurrentSession(revision);
  if (!session) return resolveGuestCartId(revision);

  const cartId = `user_${session.username}`;
  rememberCart(cartId);
  return cartId;
}

export async function loadResolvedCart(): Promise<ResolvedCart> {
  const session = await getClientSession();
  const revision = getClientSessionRevision();

  if (session) {
    const cart = await readCart(`${API_URL}/api/cart/me`, revision) as ResolvedCart;
    if (!cart || typeof cart.cartId !== "string" || !cart.cartId.trim() || !Array.isArray(cart.items)) {
      throw new ApiRequestError("Не удалось загрузить корзину", "invalid-response");
    }
    rememberCart(cart.cartId);
    return cart;
  }

  const cartId = await resolveGuestCartId(revision);
  const items = await readCart(`${API_URL}/api/cart?cartId=${encodeURIComponent(cartId)}`, revision);
  if (!Array.isArray(items)) throw new ApiRequestError("Не удалось загрузить корзину", "invalid-response");
  return { cartId, items };
}

export async function loadResolvedCartCount(): Promise<number> {
  const session = await getClientSession();
  const revision = getClientSessionRevision();
  const guestCartId = session ? "" : getGuestCartId();

  if (!session && !guestCartId) return 0;

  const url = session
    ? `${API_URL}/api/cart/me/count`
    : `${API_URL}/api/cart/count?cartId=${encodeURIComponent(guestCartId)}`;
  const data = await readCart(url, revision);
  if (!(data !== null &&
    typeof data === "object" &&
    "count" in data &&
    typeof data.count === "number" &&
    Number.isSafeInteger(data.count) && data.count >= 0)) {
    throw new ApiRequestError("Не удалось обновить количество товаров", "invalid-response");
  }
  return data.count;
}
