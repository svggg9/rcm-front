import { API_URL, apiFetch } from "../../lib/api";

export type OperationPage<T> = { content: T[]; number: number; totalPages: number; totalElements: number };
export type RefundOperation = {
  id: number; externalId: string | null; paymentId: number; status: string;
  amount: number; currency: string; description: string | null; failureReason: string | null;
  dispatchState: string; requestReference: string | null; orderId: number | null;
  orderGroupId: string; dispatchAttempts: number; dispatchedAt: string | null; nextDispatchAt: string | null;
};
export type LatePayment = {
  paymentId: number; externalPaymentId: string; orderGroupId: string; amount: number;
  currency: string; paidAt: string | null; refundedAmount: number; pendingRefundAmount: number;
};
export async function paymentRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(response.status === 403 ? "Нет доступа к операции" : response.status === 409
      ? "Состояние операции изменилось. Обновите данные перед повтором"
      : typeof detail?.message === "string" ? detail.message : "Не удалось выполнить операцию. Обновите данные и проверьте её состояние");
  }
  return response.json();
}
export function refundLabel(row: RefundOperation): string {
  if (row.status === "SUCCEEDED") return "Возврат подтверждён";
  if (row.status === "FAILED" || row.status === "CANCELED") return "Возврат не выполнен";
  return ({ READY: "Ожидает отправки", SENDING: "Отправляется — результат ещё неизвестен",
    RETRY: "Ожидает повторной проверки", REVIEW: "Требует сверки с банком",
    ACKNOWLEDGED: "Ожидает подтверждения банка" } as Record<string, string>)[row.dispatchState] || "Ожидает подтверждения";
}
export const operationMoney = (amount: number, currency: string) => new Intl.NumberFormat("ru-RU", {
  style: "currency", currency,
}).format(amount);

// The late-payment API identifies the group; the refund route requires an order belonging to it.
export async function findReviewOrders(groupId: string): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 0; ; page++) {
    const result = await paymentRequest<OperationPage<{ orderId: number; orderGroupId: string; latePaymentId: number | null }>>(
      `/api/admin/payment-review?page=${page}&size=100`);
    ids.push(...result.content.filter(row => row.orderGroupId === groupId && row.latePaymentId != null).map(row => row.orderId));
    if (page + 1 >= result.totalPages) break;
  }
  if (!ids.length) throw new Error("Заказ больше не находится в очереди сверки. Обновите данные");
  return [...new Set(ids)];
}
