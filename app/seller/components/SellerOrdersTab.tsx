"use client";

import { useId, useMemo, useRef, useState } from "react";

import { CabinetTabs } from "../../components/ui/CabinetTabs";
import { TextInput } from "../../components/ui/TextInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import { Button } from "../../components/ui/Button";
import { DesignSystemIcon } from "../../components/ui/DesignSystemIcon";
import { PopoverPanel } from "../../components/ui/PopoverPanel";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { SegmentedControl } from "../../components/ui/SegmentedControl";

import {
  SellerOrderCard,
  formatOrderCode,
  type OrderCardDetails,
  type OrderCardAudience,
  type SellerOrderCardListItem,
} from "./SellerOrderCard";
import styles from "./SellerOrdersTab.module.css";
import listStyles from "../../components/ui/CabinetListLayout.module.css";

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
  presentation?: "default" | "cabinet";
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
  presentation = "default",
}: Props<TOrder>) {
  const cabinet = audience === "seller" && presentation === "cabinet";
  const [filter, setFilter] = useState<OrderFilter>(cabinet ? "READY" : "ALL");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchId = useId();
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const orderTabs: { value: OrderFilter; label: string; count?: number }[] = [
    { value: "ALL", label: "Все", count: totalElements },
    {
      value: "READY",
      label: audience === "seller" ? "Нужно отправить" : "В обработке",
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
      label: "В доставке",
      count: !onLoadMore
        ? orders.filter(isInTransitOrder).length || undefined
        : undefined,
    },
    {
      value: "COMPLETED",
      label: "Завершённые",
      count: !onLoadMore
        ? orders.filter(isCompletedOrder).length || undefined
        : undefined,
    },
    {
      value: "CANCELED",
      label: "Отменённые",
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
    <section className={cabinet ? listStyles.page : styles.page}>
      {cabinet ? <>
        <SectionHeader title="Заказы" large className={listStyles.heading} />
        <div className={listStyles.toolbar}>
          <div className={listStyles.segments}>
            <SegmentedControl items={orderTabs} value={filter} onChange={setFilter} ariaLabel="Фильтр заказов" />
          </div>
          <div className={listStyles.tools}>
            <Button ref={searchTrigger} variant="secondary" className={`${listStyles.iconButton} ${searchOpen || search ? listStyles.iconButtonActive : ""}`}
              aria-label="Поиск заказов" title="Поиск заказов" aria-haspopup="dialog" aria-expanded={searchOpen} aria-controls={searchId}
              onClick={() => setSearchOpen(value => !value)}>
              <DesignSystemIcon name="search" role="utility" />
            </Button>
          </div>
        </div>
        <PopoverPanel id={searchId} title="Поиск заказов" open={searchOpen} onClose={() => setSearchOpen(false)}
          anchorRef={searchTrigger} initialFocusRef={searchInput}>
          <div className={listStyles.search}>
            <TextInput ref={searchInput} type="search" label="Номер заказа, товар или получатель" hideLabel
              placeholder="Номер заказа, товар или получатель" maxLength={200} value={search}
              onChange={event => setSearch(event.target.value)} />
            {onLoadMore ? <p className={listStyles.caption}>Поиск по загруженным заказам</p> : null}
          </div>
        </PopoverPanel>
      </> : audience !== "buyer" ? <div className={styles.ordersToolbar}>
        <CabinetTabs items={orderTabs} value={filter} onChange={setFilter}
          appearance="panel" ariaLabel="Фильтр заказов" idPrefix="seller-order-filter" panelId="seller-order-results" />
        <div className={styles.search}><TextInput type="search" hideLabel
          label="Номер заказа, товар или получатель" placeholder="Номер заказа, товар или получатель"
          value={search} onChange={event => setSearch(event.target.value)} /></div>
      </div> : null}

      {audience === "seller" && onLoadMore ? <p className={cabinet ? listStyles.caption : styles.searchHint}>Поиск и фильтры — по загруженным заказам</p> : null}
      <div id="seller-order-results" className={cabinet ? listStyles.results : undefined}
        role={cabinet ? "region" : audience === "seller" ? "tabpanel" : undefined}
        aria-label={cabinet ? "Список заказов" : undefined}
        aria-labelledby={!cabinet && audience === "seller" ? `seller-order-filter-${filter}` : undefined} tabIndex={audience === "seller" ? 0 : undefined}>

      {orders.length === 0 ? (
        <EmptyState
          icon="shopping-bag"
          tone="gold"
          title="Пока нет заказов"
          text={
            audience === "seller"
              ? "Когда покупатели оформят заказы, они появятся здесь"
              : "Когда вы оформите заказ, он появится здесь"
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
                <span>Заказ</span><span>Товары</span><span>Статус</span><span>Сумма</span><span />
              </div>}
              {filteredOrders.map((order) => (
                <SellerOrderCard
                  key={order.id}
                  order={order}
                  statusLabel={buildSellerStatusLabel(order)}
                  autoExpand={order.id === expandedOrderId}
                  onOpenOrder={onOpenOrder}
                  navigateOnOpen={audience === "seller" && !!onOpenOrder}
                  onLoadDetails={onLoadOrder}
                  onPrefetch={onPrefetchOrder}
                  showStageElapsed={showStageElapsed}
                  audience={audience}
                  showDeliveryLabel={showDeliveryLabel}
                  openButtonLabel={openButtonLabel}
                  tableLayout={audience === "seller"}
                  worklist={audience === "seller"}
                  needsShipment={isReadyOrder(order)}
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
      </div>
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
