"use client";

import { SellerOrdersTab } from "../../seller/components/SellerOrdersTab";

import type { AdminOrderListItem } from "../types";

type Props = {
  orders: AdminOrderListItem[];
  buildStatusLabel: (order: AdminOrderListItem) => string;
  onOpenOrder: (orderId: number) => void;
};

export function AdminOrdersTab({
  orders,
  buildStatusLabel,
  onOpenOrder,
}: Props) {
  return (
    <SellerOrdersTab
      orders={orders}
      buildSellerStatusLabel={buildStatusLabel}
      onOpenOrder={onOpenOrder}
    />
  );
}
