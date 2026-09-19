"use client";

import { useMemo, useState } from "react";

import { FormSelect } from "../../components/ui/FormSelect";
import { TextInput } from "../../components/ui/TextInput";
import productStyles from "./SellerProductsTab.module.css";
import { EmptyState } from "../../components/ui/EmptyState";
import { ListLoadMore } from "../../components/ui/ListLoadMore";

import {
  SellerOrderCard,
  formatOrderCode,
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
  const [search, setSearch] = useState("");

  const orderTabs: { value: OrderFilter; label: string; count?: number }[] = [
    { value: "ALL", label: "Все", count: totalElements },
    {
      value: "READY",
      label: audience === "seller" ? "К отправке" : "В обработке",
      count: !onLoadMore
        ? orders.filter(isReadyOrder).length || undefined
        : undefined,
    },
    {
      value: "PENDING_PAYMENT",
      label: "Не оплачены",
      count: !onLoadMore
        ? orders.filter(isPendingPaymentOrder).length || undefined
        : undefined,
    },
    {
      value: "IN_TRANSIT",
      label: "В пути",
      count: !onLoadMore
        ? orders.filter(isInTransitOrder).length || undefined
        : undefined,
    },
    {
      value: "COMPLETED",
      label: "Завершены",
      count: !onLoadMore
        ? orders.filter(isCompletedOrder).length || undefined
        : undefined,
    },
    {
      value: "CANCELED",
      label: "Отменены",
      count: !onLoadMore
        ? orders.filter(isCanceledOrder).length || undefined
        : undefined,
    },
  ];

  const filteredOrders = useMemo(
    () => audience === "buyer" ? orders : orders.filter((order) => matchesOrderFilter(order, filter)
      && [formatOrderCode(order), order.recipientName, order.firstProductTitle, ...(order.productTitles ?? [])]
        .filter(Boolean).join(" ").toLocaleLowerCase("ru").includes(search.trim().toLocaleLowerCase("ru"))),
    [audience, filter, orders, search]
  );

  return (
    <section className={styles.page}>
      {audience !== "buyer" ? <div className={productStyles.productsToolbar}>
        <div className={productStyles.productSearch}><TextInput type="search" hideLabel
          label="Номер заказа, товар или получатель" placeholder="Номер заказа, товар или получатель"
          value={search} onChange={event => setSearch(event.target.value)} /></div>
        <FormSelect ariaLabel="Статус заказа" placeholder="Статус заказа" emptyOptionLabel="Все заказы"
          options={orderTabs.filter(tab => tab.value !== "ALL").map(({ value, label }) => ({value, label}))}
          value={filter === "ALL" ? "" : filter} onChange={value => setFilter((value || "ALL") as OrderFilter)} />
      </div> : null}

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
                  ? "В загруженной части списка нет подходящих заказов"
                  : "По выбранным фильтрам ничего не найдено"
              }
            />
          ) : (
            <div className={`${styles.list} ${audience === "seller" ? styles.tableList : ""}`}>
              {audience === "seller" && <div className={styles.tableHeader} aria-hidden="true">
                <span>Дата заказа</span><span>Номер заказа</span><span>Товары</span><span>Статус</span><span>Сумма</span><span />
              </div>}
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
                  tableLayout={audience === "seller"}
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
  return !isCanceledOrder(order) && order.paymentStatus === "PENDING";
}

function isReadyOrder(order: SellerOrderCardListItem) {
  return (
    !isCanceledOrder(order) &&
    !["SHIPPED", "COMPLETED"].includes(order.status) &&
    !["IN_TRANSIT", "DELIVERED", "READY_FOR_PICKUP"].includes(order.deliveryStatus) &&
    order.paymentStatus === "PAID" &&
    (order.deliveryStatus === "READY_FOR_SHIPMENT" ||
      order.status === "PROCESSING")
  );
}

function isInTransitOrder(order: SellerOrderCardListItem) {
  return (
    !isCanceledOrder(order) &&
    (order.deliveryStatus === "IN_TRANSIT" || order.status === "SHIPPED")
  );
}

function isCompletedOrder(order: SellerOrderCardListItem) {
  return (
    !isCanceledOrder(order) &&
    (order.status === "COMPLETED" || order.deliveryStatus === "DELIVERED")
  );
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
