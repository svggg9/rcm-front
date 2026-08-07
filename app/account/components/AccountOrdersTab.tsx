"use client";

import {
  SellerOrdersTab,
} from "../../seller/components/SellerOrdersTab";
import type {
  OrderCardDetails,
} from "../../seller/components/SellerOrderCard";

import type { OrderListItem } from "../types";

type Props = {
  orders: OrderListItem[];
  totalElements?: number;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  buildOrderStatusLabel: (order: OrderListItem) => string;
  onOpenOrder: (orderId: number) => void;
  onLoadOrder: (orderId: number) => Promise<OrderCardDetails>;
  onPrefetchOrder?: (orderId: number) => void;
};

export function AccountOrdersTab({
  orders,
  totalElements,
  loadingMore,
  onLoadMore,
  buildOrderStatusLabel,
  onOpenOrder,
  onLoadOrder,
  onPrefetchOrder,
}: Props) {
  return (
    <SellerOrdersTab<OrderListItem>
      orders={orders}
      totalElements={totalElements}
      loadingMore={loadingMore}
      onLoadMore={onLoadMore}
      buildSellerStatusLabel={buildOrderStatusLabel}
      onOpenOrder={onOpenOrder}
      onLoadOrder={onLoadOrder}
      onPrefetchOrder={onPrefetchOrder}
      audience="buyer"
      showDeliveryLabel={false}
      showStageElapsed={false}
      openButtonLabel="Управление заказом"
    />
  );
}
