import { emitAuthChanged } from "./authEvents";
import { emitCartChanged } from "./cartEvents";


const TOKEN_KEY = "auth_token";
const GUEST_CART_KEY = "guest_cart_id";
const USER_CART_KEY = "user_cart_id";

// ---------------- AUTH ----------------

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function setAuth(token: string, userCartId: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_CART_KEY, userCartId);
  emitAuthChanged();
  emitCartChanged();
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_CART_KEY);
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

    // base64url -> base64
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

  // 1️⃣ если пользователь залогинен → используем user cart
  if (isAuthenticated()) {
    const userCartId = localStorage.getItem(USER_CART_KEY);
    if (userCartId) return userCartId;
  }

  // 2️⃣ иначе → guest cart
  let guestCartId = localStorage.getItem(GUEST_CART_KEY);

  if (!guestCartId) {
    guestCartId = "guest_" + crypto.randomUUID();
    localStorage.setItem(GUEST_CART_KEY, guestCartId);
  }

  return guestCartId;
}
