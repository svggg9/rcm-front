"use client";

import { SellerOrdersTab } from "../../seller/components/SellerOrdersTab";

import type { AdminOrder, AdminOrderListItem } from "../types";

type Props = {
  orders: AdminOrderListItem[];
  totalElements: number;
  loadingMore: boolean;
  onLoadMore?: () => void;
  buildStatusLabel: (order: AdminOrderListItem) => string;
  onOpenOrder: (orderId: number) => void;
  onLoadOrder?: (orderId: number) => Promise<AdminOrder>;
  onPrefetchOrder?: (orderId: number) => void;
};

export function AdminOrdersTab({
  orders,
  totalElements,
  loadingMore,
  onLoadMore,
  buildStatusLabel,
  onOpenOrder,
  onLoadOrder,
  onPrefetchOrder,
}: Props) {
  return (
    <SellerOrdersTab
      orders={orders}
      totalElements={totalElements}
      loadingMore={loadingMore}
      onLoadMore={onLoadMore}
      buildSellerStatusLabel={buildStatusLabel}
      onOpenOrder={onOpenOrder}
      onLoadOrder={onLoadOrder}
      onPrefetchOrder={onPrefetchOrder}
    />
  );
}
