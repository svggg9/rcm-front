// Compatibility hint for returning from older checkout tabs. This value is
// never permission to lock a cart or replace its next checkout with an order.
const PREFIX = "checkout_pending_payment_order_v1:";
const BANK_RETURN_PREFIX = "checkout_bank_return_v1:";
export function saveBankReturnOrder(cartId: string, orderId: number) {
  try { sessionStorage.setItem(BANK_RETURN_PREFIX + cartId, JSON.stringify({ orderId, at: Date.now() })); } catch { /* Advisory only. */ }
}
export function loadBankReturnOrder(cartId: string): number | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(BANK_RETURN_PREFIX + cartId) ?? "null");
    return value && Number.isSafeInteger(value.orderId) && value.orderId > 0 && Date.now() - value.at < 2 * 60 * 60 * 1000 ? value.orderId : null;
  } catch { return null; }
}
export function loadPendingPaymentOrderId(cartId: string): number | null {
  if (typeof window === "undefined" || !cartId) return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + cartId); const id = raw ? Number(raw) : NaN;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch { return null; }
}
export function savePendingPaymentOrderId(cartId: string, orderId: number) {
  if (typeof window !== "undefined" && cartId) {
    try { sessionStorage.setItem(PREFIX + cartId, String(orderId)); } catch { /* Advisory only; checkout continues without browser storage. */ }
  }
}
export function clearSucceededPendingPayment(cartId: string, orderId: number, status: string) {
  if (status === "SUCCEEDED" && loadBankReturnOrder(cartId) === orderId) {
    try { sessionStorage.removeItem(BANK_RETURN_PREFIX + cartId); } catch { /* Advisory only. */ }
  }
  if (status === "SUCCEEDED" && loadPendingPaymentOrderId(cartId) === orderId) {
    try { sessionStorage.removeItem(PREFIX + cartId); } catch { /* Advisory only. */ }
  }
}
