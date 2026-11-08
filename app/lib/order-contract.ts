import type { components } from "./generated/order-api";

export type Order = components["schemas"]["OrderResponse"];
export type OrderItem = components["schemas"]["OrderItemResponse"];
export type OrderDeliveryInfo = components["schemas"]["OrderDeliveryInfoResponse"];
export type OrderStatus = components["schemas"]["OrderStatus"];
export type PaymentStatus = components["schemas"]["PaymentStatus"];
export type DeliveryStatus = components["schemas"]["DeliveryStatus"];
export type OrderListItem = components["schemas"]["OrderListItemResponse"];
export type SellerOrderListItem = components["schemas"]["SellerOrderListItemResponse"];
export type OrderWorkflow = components["schemas"]["OrderWorkflowResponse"];
export type OrderAction = components["schemas"]["OrderAction"];

// Absent/unknown contracts fail closed during a rolling deployment. Never infer permissions from status.
export function orderAction(order: { workflow?: OrderWorkflow | null }, code: OrderAction, now = Date.now()) {
  const workflow = order.workflow;
  if (!workflow || workflow.version !== 1) return {
    allowed: false, reason: "Обновите заказ — информация о доступных действиях пока недоступна", scope: undefined,
  };
  const action = workflow.actions.find(item => item.code === code);
  if (!action) return { allowed: false, reason: "Действие недоступно в этом кабинете", scope: undefined };
  if (action.allowed && action.availableUntil && (!Number.isFinite(Date.parse(action.availableUntil)) || Date.parse(action.availableUntil) <= now))
    return { ...action, allowed: false, reason: "Срок действия истёк — обновите заказ" };
  return action;
}
