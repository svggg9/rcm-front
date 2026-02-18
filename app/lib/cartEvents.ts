export const CART_EVENT = "cart-changed";

export function emitCartChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_EVENT));
}
