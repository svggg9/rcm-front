"use client";

import { SellerOrdersTab } from "../../seller/components/SellerOrdersTab";

import type { AdminOrder, AdminOrderListItem } from "../types";

type Props = {
  orders: AdminOrderListItem[];
  buildStatusLabel: (order: AdminOrderListItem) => string;
  onOpenOrder: (orderId: number) => void;
  onLoadOrder?: (orderId: number) => Promise<AdminOrder>;
  onPrefetchOrder?: (orderId: number) => void;
};

export function AdminOrdersTab({
  orders,
  buildStatusLabel,
  onOpenOrder,
  onLoadOrder,
  onPrefetchOrder,
}: Props) {
  return (
    <SellerOrdersTab
      orders={orders}
      buildSellerStatusLabel={buildStatusLabel}
      onOpenOrder={onOpenOrder}
      onLoadOrder={onLoadOrder}
      onPrefetchOrder={onPrefetchOrder}
    />
  );
}
