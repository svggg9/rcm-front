import { emitAuthChanged } from "./authEvents";
import { emitCartChanged } from "./cartEvents";
import { API_URL } from "./api";

const TOKEN_KEY = "auth_token";
const GUEST_CART_KEY = "guest_cart_id";
const USER_CART_KEY = "user_cart_id";
const GUEST_FAVORITES_KEY = "guest_favorite_ids";

// ---------------- AUTH ----------------

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function setAuth(token: string, userCartId: string) {
  if (typeof window === "undefined") return;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_CART_KEY, userCartId);

  // после логина guest cart больше не нужен
  localStorage.removeItem(GUEST_CART_KEY);

  emitAuthChanged();
  emitCartChanged();
}

export function clearAuth() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_CART_KEY);

  // по твоему требованию при logout чистим и гостевое состояние
  localStorage.removeItem(GUEST_CART_KEY);
  localStorage.removeItem(GUEST_FAVORITES_KEY);

  emitAuthChanged();
  emitCartChanged();
}

export function getUserRole(): string | null {
  if (typeof window === "undefined") return null;

  const token = getToken();
  if (!token) return null;

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");

    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    const payload = JSON.parse(json);
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

// ---------------- CART ----------------

export function getCartId(): string {
  if (typeof window === "undefined") return "";

  if (isAuthenticated()) {
    return localStorage.getItem(USER_CART_KEY) ?? "";
  }

  return localStorage.getItem(GUEST_CART_KEY) ?? "";
}

export async function ensureCartId(): Promise<string> {
  if (typeof window === "undefined") return "";

  if (isAuthenticated()) {
    return localStorage.getItem(USER_CART_KEY) ?? "";
  }

  const existingGuestCartId = localStorage.getItem(GUEST_CART_KEY);
  if (existingGuestCartId) return existingGuestCartId;

  const response = await fetch(`${API_URL}/api/cart/new-id`);

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