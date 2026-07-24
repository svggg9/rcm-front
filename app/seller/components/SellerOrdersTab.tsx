"use client";

import { useMemo, useState } from "react";

import { CabinetTabs, type CabinetTabItem } from "../../components/ui/CabinetTabs";
import { EmptyState } from "../../components/ui/EmptyState";

import { SellerOrderCard } from "./SellerOrderCard";
import styles from "./SellerOrdersTab.module.css";

import type { SellerOrderListItem } from "../types";

type Props = {
  orders: SellerOrderListItem[];
  buildSellerStatusLabel: (order: SellerOrderListItem) => string;
  onOpenOrder: (orderId: number) => void;
  onPrefetchOrder?: (orderId: number) => void;
};

type OrderFilter =
  | "ALL"
  | "PENDING_PAYMENT"
  | "READY"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELED";

export function SellerOrdersTab({
  orders,
  buildSellerStatusLabel,
  onOpenOrder,
  onPrefetchOrder,
}: Props) {
  const [filter, setFilter] = useState<OrderFilter>("ALL");

  const orderTabs: CabinetTabItem<OrderFilter>[] = [
    { value: "ALL", label: "Все", count: orders.length },
    {
      value: "READY",
      label: "К отправке",
      count: orders.filter(isReadyOrder).length || undefined,
    },
    {
      value: "PENDING_PAYMENT",
      label: "Не оплачены",
      count: orders.filter(isPendingPaymentOrder).length || undefined,
    },
    {
      value: "IN_TRANSIT",
      label: "В пути",
      count: orders.filter(isInTransitOrder).length || undefined,
    },
    {
      value: "COMPLETED",
      label: "Завершены",
      count: orders.filter(isCompletedOrder).length || undefined,
    },
    {
      value: "CANCELED",
      label: "Отменены",
      count: orders.filter(isCanceledOrder).length || undefined,
    },
  ];

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderFilter(order, filter)),
    [filter, orders]
  );

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Заказы</h1>
      </header>

      <div className={styles.ordersToolbar}>
        <CabinetTabs
          items={orderTabs}
          value={filter}
          onChange={setFilter}
          ariaLabel="Фильтр заказов"
          countTone="gold"
          appearance="line"
        />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon="shopping-bag"
          tone="gold"
          title="Пока нет заказов"
          text="Когда покупатели оформят заказы, они появятся здесь."
        />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon="search"
          title="Заказов нет"
          text="По выбранному статусу ничего не найдено."
        />
      ) : (
        <div className={styles.list}>
          {filteredOrders.map((order) => (
            <SellerOrderCard
              key={order.id}
              order={order}
              statusLabel={buildSellerStatusLabel(order)}
              onOpen={onOpenOrder}
              onPrefetch={onPrefetchOrder}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function matchesOrderFilter(order: SellerOrderListItem, filter: OrderFilter) {
  switch (filter) {
    case "PENDING_PAYMENT":
      return isPendingPaymentOrder(order);
    case "READY":
      return isReadyOrder(order);
    case "IN_TRANSIT":
      return isInTransitOrder(order);
    case "COMPLETED":
      return isCompletedOrder(order);
    case "CANCELED":
      return isCanceledOrder(order);
    default:
      return true;
  }
}

function isPendingPaymentOrder(order: SellerOrderListItem) {
  return order.paymentStatus === "PENDING";
}

function isReadyOrder(order: SellerOrderListItem) {
  return (
    order.paymentStatus === "PAID" &&
    (order.deliveryStatus === "PENDING" ||
      order.deliveryStatus === "READY_FOR_SHIPMENT" ||
      order.deliveryStatus === "READY_FOR_PICKUP")
  );
}

function isInTransitOrder(order: SellerOrderListItem) {
  return order.deliveryStatus === "IN_TRANSIT";
}

function isCompletedOrder(order: SellerOrderListItem) {
  return order.status === "COMPLETED" || order.deliveryStatus === "DELIVERED";
}

function isCanceledOrder(order: SellerOrderListItem) {
  return (
    order.status === "CANCELED" ||
    order.paymentStatus === "FAILED" ||
    order.paymentStatus === "CANCELED" ||
    order.deliveryStatus === "RETURNED" ||
    order.deliveryStatus === "CANCELLED"
  );
}
