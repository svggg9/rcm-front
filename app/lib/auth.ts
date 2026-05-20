import { emitAuthChanged } from "./authEvents";
import { emitCartChanged } from "./cartEvents";
import { API_URL } from "./config";

const GUEST_CART_KEY = "guest_cart_id";
const USER_CART_KEY = "user_cart_id";
const GUEST_FAVORITES_KEY = "guest_favorite_ids";

// ---------------- AUTH ----------------

export function setAuth(userCartId: string) {
  if (typeof window === "undefined") return;

  localStorage.setItem(USER_CART_KEY, userCartId);
  localStorage.removeItem(GUEST_CART_KEY);

  emitAuthChanged();
  emitCartChanged();
}

export function clearAuth() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(USER_CART_KEY);
  localStorage.removeItem(GUEST_CART_KEY);
  localStorage.removeItem(GUEST_FAVORITES_KEY);

  emitAuthChanged();
  emitCartChanged();
}

export async function logout() {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore
  }

  clearAuth();
}

// ---------------- CART ----------------

export function getCartId(): string {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem(USER_CART_KEY) ??
    localStorage.getItem(GUEST_CART_KEY) ??
    ""
  );
}

export async function ensureCartId(): Promise<string> {
  if (typeof window === "undefined") return "";

  const existingUserCartId = localStorage.getItem(USER_CART_KEY);

  if (existingUserCartId) {
    return existingUserCartId;
  }

  const existingGuestCartId = localStorage.getItem(GUEST_CART_KEY);

  if (existingGuestCartId) {
    return existingGuestCartId;
  }

  const response = await fetch(`${API_URL}/api/cart/new-id`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Не удалось получить guest cart id");
  }

  const data = await response.json();

  const newCartId =
    typeof data?.cartId === "string" ? data.cartId.trim() : "";

  if (!newCartId) {
    throw new Error("Backend вернул пустой cart id");
  }

  localStorage.setItem(GUEST_CART_KEY, newCartId);
  emitCartChanged();

  return newCartId;
}