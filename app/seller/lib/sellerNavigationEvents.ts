export const SELLER_NAVIGATION_EVENT = "seller:navigation-attention-changed";

export function emitSellerNavigationChanged() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(SELLER_NAVIGATION_EVENT));
}
