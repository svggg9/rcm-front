import type { OrderListItem, OrderStatus, PaymentStatus } from "./order-contract";

export const orderPaymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Ожидает оплаты",
  PAID: "Оплачен",
  FAILED: "Ошибка оплаты",
  REFUNDED: "Деньги возвращены",
};

const orderStatusLabels: Record<OrderStatus, string> = {
  NEW: "Новый", CONFIRMED: "Подтверждён", PROCESSING: "В обработке",
  SHIPPED: "Отправлен", COMPLETED: "Завершён", PAID: "Оплачен", CANCELED: "Отменён",
};

// List projections describe facts. Action permissions always come from workflow.
export function buildOrderStatusLabel(
  order: Pick<OrderListItem, "status" | "paymentStatus" | "deliveryStatus">,
  readyLabel = "Готов к отправке",
): string {
  if (order.status === "CANCELED") return "Отменён";
  if (order.paymentStatus === "REFUNDED") return orderPaymentStatusLabels.REFUNDED;
  if (order.deliveryStatus === "CANCELLED") return "Доставка отменена";
  if (order.deliveryStatus === "RETURNED") return "Возвращён";
  if (order.paymentStatus === "FAILED" || order.paymentStatus === "PENDING") {
    return orderPaymentStatusLabels[order.paymentStatus];
  }
  if (order.deliveryStatus === "DELIVERED") return "Доставлен";
  if (order.deliveryStatus === "READY_FOR_PICKUP") return "Ожидает получения";
  if (order.deliveryStatus === "IN_TRANSIT") return "В пути";
  if (order.deliveryStatus === "READY_FOR_SHIPMENT") return readyLabel;
  if (order.paymentStatus === "PAID" && order.deliveryStatus === "PENDING") return "Оформление доставки";
  return orderStatusLabels[order.status] ?? order.status;
}
