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
  buildOrderStatusLabel: (order: OrderListItem) => string;
  onOpenOrder: (orderId: number) => void;
  onLoadOrder: (orderId: number) => Promise<OrderCardDetails>;
  onPrefetchOrder?: (orderId: number) => void;
};

export function AccountOrdersTab({
  orders,
  buildOrderStatusLabel,
  onOpenOrder,
  onLoadOrder,
  onPrefetchOrder,
}: Props) {
  return (
    <SellerOrdersTab<OrderListItem>
      orders={orders}
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
