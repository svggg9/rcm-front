"use client";

import { useMemo, useState } from "react";

import { CabinetTabs, type CabinetTabItem } from "../../components/ui/CabinetTabs";
import { EmptyState } from "../../components/ui/EmptyState";
import { ListLoadMore } from "../../components/ui/ListLoadMore";

import {
  SellerOrderCard,
  type OrderCardDetails,
  type OrderCardAudience,
  type SellerOrderCardListItem,
} from "./SellerOrderCard";
import styles from "./SellerOrdersTab.module.css";

import type { SellerOrderListItem } from "../types";

type Props<TOrder extends SellerOrderCardListItem = SellerOrderListItem> = {
  orders: TOrder[];
  totalElements?: number;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  buildSellerStatusLabel: (order: TOrder) => string;
  expandedOrderId?: number | null;
  onOpenOrder?: (orderId: number) => void;
  onLoadOrder?: (orderId: number) => Promise<OrderCardDetails>;
  onPrefetchOrder?: (orderId: number) => void;
  showStageElapsed?: boolean;
  audience?: OrderCardAudience;
  showDeliveryLabel?: boolean;
  openButtonLabel?: string;
};

type OrderFilter =
  | "ALL"
  | "PENDING_PAYMENT"
  | "READY"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELED";

export function SellerOrdersTab<
  TOrder extends SellerOrderCardListItem = SellerOrderListItem,
>({
  orders,
  totalElements = orders.length,
  loadingMore = false,
  onLoadMore,
  buildSellerStatusLabel,
  expandedOrderId,
  onOpenOrder,
  onLoadOrder,
  onPrefetchOrder,
  showStageElapsed = false,
  audience = "seller",
  showDeliveryLabel = true,
  openButtonLabel,
}: Props<TOrder>) {
  const [filter, setFilter] = useState<OrderFilter>("ALL");
  const allOrdersLoaded = !onLoadMore;

  const orderTabs: CabinetTabItem<OrderFilter>[] = [
    { value: "ALL", label: "Все", count: totalElements },
    {
      value: "READY",
      label: audience === "seller" ? "К отправке" : "В обработке",
      count: allOrdersLoaded
        ? orders.filter(isReadyOrder).length || undefined
        : undefined,
    },
    {
      value: "PENDING_PAYMENT",
      label: "Не оплачены",
      count: allOrdersLoaded
        ? orders.filter(isPendingPaymentOrder).length || undefined
        : undefined,
    },
    {
      value: "IN_TRANSIT",
      label: "В пути",
      count: allOrdersLoaded
        ? orders.filter(isInTransitOrder).length || undefined
        : undefined,
    },
    {
      value: "COMPLETED",
      label: "Завершены",
      count: allOrdersLoaded
        ? orders.filter(isCompletedOrder).length || undefined
        : undefined,
    },
    {
      value: "CANCELED",
      label: "Отменены",
      count: allOrdersLoaded
        ? orders.filter(isCanceledOrder).length || undefined
        : undefined,
    },
  ];

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderFilter(order, filter)),
    [filter, orders]
  );

  return (
    <section className={styles.page}>
      <div className={styles.ordersToolbar}>
        <CabinetTabs
          items={orderTabs}
          value={filter}
          onChange={setFilter}
          ariaLabel="Фильтр заказов"
          countTone="gold"
          appearance="segmented"
        />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon="shopping-bag"
          tone="gold"
          title="Пока нет заказов"
          text={
            audience === "seller"
              ? "Когда покупатели оформят заказы, они появятся здесь."
              : "Когда вы оформите заказ, он появится здесь."
          }
        />
      ) : (
        <>
          {filteredOrders.length === 0 ? (
            <EmptyState
              icon="search"
              title="Заказов нет"
              text={
                onLoadMore
                  ? "В загруженной части списка заказов с таким статусом нет."
                  : "По выбранному статусу ничего не найдено."
              }
            />
          ) : (
            <div className={styles.list}>
              {filteredOrders.map((order) => (
                <SellerOrderCard
                  key={order.id}
                  order={order}
                  statusLabel={buildSellerStatusLabel(order)}
                  autoExpand={order.id === expandedOrderId}
                  onOpenOrder={onOpenOrder}
                  onLoadDetails={onLoadOrder}
                  onPrefetch={onPrefetchOrder}
                  showStageElapsed={showStageElapsed}
                  audience={audience}
                  showDeliveryLabel={showDeliveryLabel}
                  openButtonLabel={openButtonLabel}
                />
              ))}
            </div>
          )}
          <ListLoadMore
            loaded={orders.length}
            total={totalElements}
            loading={loadingMore}
            onLoadMore={onLoadMore}
          />
        </>
      )}
    </section>
  );
}

function matchesOrderFilter(
  order: SellerOrderCardListItem,
  filter: OrderFilter
) {
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

function isPendingPaymentOrder(order: SellerOrderCardListItem) {
  return order.paymentStatus === "PENDING";
}

function isReadyOrder(order: SellerOrderCardListItem) {
  return (
    order.paymentStatus === "PAID" &&
    (order.deliveryStatus === "READY_FOR_SHIPMENT" ||
      order.status === "PROCESSING")
  );
}

function isInTransitOrder(order: SellerOrderCardListItem) {
  return order.deliveryStatus === "IN_TRANSIT" || order.status === "SHIPPED";
}

function isCompletedOrder(order: SellerOrderCardListItem) {
  return order.status === "COMPLETED" || order.deliveryStatus === "DELIVERED";
}

function isCanceledOrder(order: SellerOrderCardListItem) {
  return (
    order.status === "CANCELED" ||
    order.paymentStatus === "FAILED" ||
    order.paymentStatus === "CANCELED" ||
    order.deliveryStatus === "RETURNED" ||
    order.deliveryStatus === "CANCELLED"
  );
}
