import type { Order, OrderListItem } from "../types";
export function orderNumber(order: { id: number }) { return String(order.id); }
export function shortDeliveryAddress(value: string) {
  const parts = value.split(",").map(part => part.trim()).filter(part => part && part !== "Россия" && !/^\d{6}$/.test(part));
  return parts.filter((part,index) => index === 0 || part !== parts[index-1]).join(", ");
}
export function orderDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "long", ...(new Date(value).getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });
}
export function itemCount(value: number) {
  const n = value % 100, last = n % 10;
  return `${value} ${last === 1 && n !== 11 ? "товар" : last >= 2 && last <= 4 && (n < 12 || n > 14) ? "товара" : "товаров"}`;
}
export function orderTone(order: Pick<Order | OrderListItem, "status" | "paymentStatus" | "deliveryStatus">) {
  if (order.status === "CANCELED" || ["FAILED", "CANCELED"].includes(order.paymentStatus)) return "closed";
  if (order.paymentStatus === "PENDING") return "pending";
  if (order.deliveryStatus === "DELIVERED") return "complete";
  return "normal";
}
const errors: Record<string, string> = {
  "The 14-day return period has expired": "Срок подачи заявки на возврат истёк",
  "No quantity remains available for return": "Все доступные единицы уже включены в возврат",
  "Return quantity exceeds remaining quantity": "Количество для возврата изменилось — обновите заказ",
  "Between 1 and 5 photos are required": "Добавьте от 1 до 5 фотографий",
  "Invalid return photo": "Используйте JPG, PNG или WebP до 10 МБ",
  "Return is allowed only after delivery": "Возврат будет доступен после получения заказа",
  "self-service cancellation period has expired": "Время самостоятельной отмены истекло",
};
export async function accountApiError(response: Response, fallback: string) {
  try { const data = await response.json(); return errors[data?.message] ?? (response.status === 401 ? "Войдите в аккаунт ещё раз" : fallback); } catch { return fallback; }
}
