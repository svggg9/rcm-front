import { apiFetch, API_URL } from "../../lib/api";
import type { SellerReturnListItem } from "../../lib/returns";
import type { IconName } from "../../components/ui/Icon";
import type { PageResponse, SellerOrder, SellerProductListItem } from "../types";

export const SHIPPING_WINDOW_MS = 72 * 60 * 60 * 1000;
export type SellerTask = {
  id: string;
  title: string;
  object: string;
  description: string;
  action: string;
  href: string;
  icon: IconName;
  dueAt?: string;
  tone: "neutral" | "danger";
};

export function shippingDeadline(paidAt?: string | null) {
  if (!paidAt) return undefined;
  const timestamp = Date.parse(paidAt);
  return Number.isFinite(timestamp) ? new Date(timestamp + SHIPPING_WINDOW_MS).toISOString() : undefined;
}

export function orderTask(order: SellerOrder): SellerTask | null {
  if (order.paymentStatus !== "PAID" || ["CANCELED", "COMPLETED", "SHIPPED"].includes(order.status)
    || ["CANCELLED", "RETURNED", "IN_TRANSIT", "DELIVERED", "READY_FOR_PICKUP"].includes(order.deliveryStatus)
    || (order.deliveryStatus !== "READY_FOR_SHIPMENT" && order.status !== "PROCESSING")) return null;
  const dueAt = shippingDeadline(order.paidAt);
  return {
    id: `order-${order.id}`, title: "Новый заказ", object: `Заказ №${order.id}`,
    description: order.items.map(item => item.productTitle).join(", "),
    action: "Передать в доставку", href: `/seller?tab=orders&orderId=${order.id}`,
    icon: "shopping-bag", dueAt, tone: "neutral",
  };
}

export function returnTask(request: SellerReturnListItem): SellerTask | null {
  if (!["REQUESTED", "SUBMITTED", "APPROVED", "AWAITING_SHIPMENT", "WAITING_FOR_ITEM", "IN_TRANSIT", "RECEIVED"].includes(request.status)) return null;
  const received = request.status === "RECEIVED";
  return {
    id: `return-${request.id}`, title: received ? "Возврат получен" : "Новый возврат",
    object: `Возврат №${request.id}`, description: request.productTitle,
    action: received ? "Проверить товар" : "Открыть возврат",
    href: `/seller?tab=returns&returnId=${request.id}#return-${request.id}`, icon: "return-circle", tone: "neutral",
  };
}

export function productTask(product: SellerProductListItem): SellerTask | null {
  if (product.status !== "NEEDS_REVISION" && product.status !== "BLOCKED") return null;
  return {
    id: `product-${product.id}`, title: product.status === "BLOCKED" ? "Товар заблокирован" : "Товар на доработке",
    object: product.title, description: "Посмотрите замечания к карточке",
    action: "Открыть товар", href: `/seller/products/${product.id}/edit`, icon: "package", tone: "danger",
  };
}

async function allPages<T>(path: string, signal: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; ; page++) {
    const response = await apiFetch(`${API_URL}${path}${path.includes("?") ? "&" : "?"}page=${page}&size=100`, { signal });
    if (!response.ok) throw new Error("Не удалось загрузить задачи");
    const result = await response.json() as PageResponse<T>;
    if (!Array.isArray(result.content) || !Number.isInteger(result.totalPages)) throw new Error("Не удалось загрузить задачи");
    items.push(...result.content);
    if (page + 1 >= result.totalPages || result.content.length === 0) return items;
    // Do not silently report an empty/complete queue after an incomplete scan.
    if (page >= 49) throw new Error("Слишком много данных для списка задач — откройте нужный раздел");
  }
}

export async function getSellerTasks(signal: AbortSignal): Promise<SellerTask[]> {
  // Existing ownership-scoped APIs expose paidAt on full orders, not on /list.
  // Filter orders on the server; a completed order history is not needed here.
  const [ready, processing, returns, products] = await Promise.all([
    allPages<SellerOrder>("/api/seller/orders?paymentStatus=PAID&deliveryStatus=READY_FOR_SHIPMENT", signal),
    allPages<SellerOrder>("/api/seller/orders?paymentStatus=PAID&status=PROCESSING", signal),
    allPages<SellerReturnListItem>("/api/seller/returns/list", signal),
    allPages<SellerProductListItem>("/api/seller/products/list", signal),
  ]);
  const tasks = new Map<string, SellerTask>();
  for (const task of [...ready.map(orderTask), ...processing.map(orderTask), ...returns.map(returnTask), ...products.map(productTask)]) {
    if (task) tasks.set(task.id, task);
  }
  return [...tasks.values()].sort((a, b) => (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity));
}
