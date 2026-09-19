import type { SellerOrderStatus } from "../types";
import type { SellerOrderCardListItem } from "../components/SellerOrderCard";

function formatOrderStatus(status: SellerOrderStatus): string {
  switch (status) {
    case "NEW":
      return "Новый";
    case "CONFIRMED":
      return "Подтверждён";
    case "PROCESSING":
      return "В обработке";
    case "SHIPPED":
      return "Отправлен";
    case "PAID":
      return "Оплачен";
    case "COMPLETED":
      return "Завершён";
    case "CANCELED":
      return "Отменён";
    default:
      return status;
  }
}

export function buildSellerStatusLabel(order: SellerOrderCardListItem): string {
  if (order.status === "CANCELED") return "Отменён";
  if (order.paymentStatus === "PENDING") return "Ожидает оплаты";
  if (order.paymentStatus === "FAILED") return "Ошибка оплаты";
  if (order.paymentStatus === "CANCELED") return "Оплата отменена";
  if (order.paymentStatus === "REFUNDED") return "Возвращён";
  if (order.deliveryStatus === "READY_FOR_SHIPMENT") return "К отправке";
  if (order.deliveryStatus === "READY_FOR_PICKUP") return "Ожидает получения";
  if (order.deliveryStatus === "IN_TRANSIT") return "В пути";
  if (order.deliveryStatus === "DELIVERED") return "Доставлен";
  if (order.deliveryStatus === "RETURNED") return "Возвращён";
  if (order.deliveryStatus === "CANCELLED") return "Отменён";
  if (order.paymentStatus === "PAID" && order.deliveryStatus === "PENDING") {
    return "Оформление доставки";
  }

  return formatOrderStatus(order.status);
}
