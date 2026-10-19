import type { CartItem } from "./types";

export const MAX_PRODUCT_QUANTITY = 5;

export function productQuantities(items: CartItem[]) {
  const totals = new Map<number, number>();
  for (const item of items) totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  return totals;
}

export function maxLineQuantity(item: CartItem, productTotal: number, knownStock?: number) {
  return Math.max(0, Math.min(
    MAX_PRODUCT_QUANTITY - productTotal + item.quantity,
    knownStock ?? item.availableQuantity ?? MAX_PRODUCT_QUANTITY,
  ));
}
