import { buildOrderStatusLabel } from "../../lib/order-presentation";
import type { SellerOrderCardListItem } from "../components/SellerOrderCard";

export function buildSellerStatusLabel(order: SellerOrderCardListItem): string {
  return buildOrderStatusLabel(order, "К отправке");
}
