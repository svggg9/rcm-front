const TOKEN_KEY = "auth_token";
const CART_KEY = "cart_id";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token: string, cartId: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CART_KEY, cartId);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CART_KEY);
}

export function getCartId(): string | null {
  return localStorage.getItem(CART_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
