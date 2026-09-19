"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icon, type IconName } from "../../components/ui/Icon";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatProductCreatedAt } from "../lib/sellerProductSort";
import type { SellerOrderListItem } from "../types";

import styles from "./SellerOrderCard.module.css";
import listItemStyles from "../../components/ui/CabinetListItem.module.css";
import { OrderProductsPreview } from "./OrderProductsPreview";
import { OrderDetailsPanel } from "./OrderDetailsPanel";

export type SellerOrderCardListItem = Omit<
  SellerOrderListItem,
  "deliveryStatusChangedAt" | "recipientName"
> & {
  deliveryStatusChangedAt?: string | null;
  recipientName?: string | null;
};

export type OrderCardAudience = "seller" | "buyer";

type Props = {
  order: SellerOrderCardListItem;
  statusLabel: string;
  autoExpand?: boolean;
  onOpenOrder?: (orderId: number) => void;
  onLoadDetails?: (orderId: number) => Promise<OrderCardDetails>;
  onPrefetch?: (orderId: number) => void;
  showStageElapsed?: boolean;
  audience?: OrderCardAudience;
  showDeliveryLabel?: boolean;
  openButtonLabel?: string;
  detailsIdPrefix?: string;
  tableLayout?: boolean;
  navigateOnOpen?: boolean;
  compact?: boolean;
};

export type OrderCardDetails = {
  paidAt?: string | null;
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryMethod: string;
  trackingNumber?: string | null;
  delivery?: {
    cdekNumber: string | null;
    trackingUrl: string | null;
  } | null;
  items: Array<{
    productId: number;
    variantId: number;
    sku: string;
    productTitle: string;
    brandName: string | null;
    imageUrl: string | null;
    size?: string | null;
    color?: string | null;
    quantity: number;
    price: number;
    lineTotal: number;
  }>;
};

export function SellerOrderCard({
  order,
  statusLabel,
  autoExpand = false,
  onOpenOrder,
  onLoadDetails,
  onPrefetch,
  showStageElapsed = true,
  audience = "seller",
  showDeliveryLabel = true,
  openButtonLabel = "Открыть заказ",
  detailsIdPrefix = "order",
  tableLayout = false,
  navigateOnOpen = false,
  compact = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<OrderCardDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(false);
  const autoExpandHandled = useRef(false);
  const detailsRequestRef = useRef(false);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderVisual = getOrderVisual(order, statusLabel);
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!autoExpand || !expanded || detailsLoading) return;
    articleRef.current?.scrollIntoView({ block: "start" });
    articleRef.current?.focus({ preventScroll: true });
  }, [autoExpand, expanded, detailsLoading]);

  useEffect(
    () => () => {
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    },
    []
  );

  function schedulePrefetch() {
    if (!onPrefetch || prefetchTimerRef.current) return;
    prefetchTimerRef.current = setTimeout(() => {
      prefetchTimerRef.current = null;
      onPrefetch(order.id);
    }, 180);
  }

  function cancelPrefetch() {
    if (!prefetchTimerRef.current) return;
    clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = null;
  }

  const loadDetails = useCallback(async () => {
    if (!onLoadDetails || detailsRequestRef.current) return;

    detailsRequestRef.current = true;
    setDetailsLoading(true);
    setDetailsError(false);

    try {
      setDetails(await onLoadDetails(order.id));
    } catch {
      setDetailsError(true);
    } finally {
      detailsRequestRef.current = false;
      setDetailsLoading(false);
    }
  }, [onLoadDetails, order.id]);

  useEffect(() => {
    if (!tableLayout || audience !== "seller" || !onLoadDetails || details || detailsError) return;
    const article = articleRef.current;
    if (!article) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        void loadDetails();
      }
    }, { rootMargin: "120px" });
    observer.observe(article);
    return () => observer.disconnect();
  }, [tableLayout, audience, onLoadDetails, details, detailsError, loadDetails]);

  useEffect(() => {
    if (!autoExpand) {
      autoExpandHandled.current = false;
      return;
    }
    if (autoExpandHandled.current) return;

    autoExpandHandled.current = true;
    setExpanded(true);

    if (!details && !detailsLoading) {
      void loadDetails();
    }
  }, [autoExpand, details, detailsLoading, loadDetails]);

  function toggleExpanded() {
    if (navigateOnOpen && onOpenOrder) { onOpenOrder(order.id); return; }
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);

    if (nextExpanded && !details && !detailsLoading) {
      void loadDetails();
    }
  }

  const SummaryTag = tableLayout ? "div" : "button";

  return (
    <article
      ref={articleRef}
      tabIndex={-1}
      className={`${styles.orderRow} ${expanded ? styles.orderRowExpanded : ""} ${tableLayout ? styles.tableRow : ""} ${compact ? `${styles.compact} ${listItemStyles.item}` : ""}`}
      onMouseEnter={schedulePrefetch}
      onMouseLeave={cancelPrefetch}
    >
      <SummaryTag
        className={styles.orderToggle}
        {...(!tableLayout ? {
          type: "button" as const,
          onClick: toggleExpanded,
          "aria-expanded": expanded,
          "aria-controls": `${detailsIdPrefix}-${order.id}`,
        } : {})}
      >
        <span className={styles.orderField}>
          <span className={styles.orderLabel}>Дата заказа</span>
          <strong>{tableLayout ? formatProductCreatedAt(order.createdAt) : formatOrderDate(order.createdAt)}</strong>
        </span>

        <span className={styles.orderField}>
          <span className={styles.orderLabel}>Номер заказа</span>
          <strong>{formatOrderCode(order)}</strong>
        </span>

        {tableLayout && <div className={styles.productsCell}>
          <OrderProductsPreview order={order} details={details} loading={detailsLoading}
            error={detailsError} onRetry={onLoadDetails ? () => void loadDetails() : undefined} />
        </div>}

        <span className={styles.orderField}>
          <span className={styles.orderLabel}>Статус</span>
          <span className={styles.orderStatusBlock}>
            {tableLayout ? <StatusBadge size="regular" tone={orderVisual.tone === "statusDanger" ? "danger" : orderVisual.tone === "statusWarning" ? "warning" : "success"}>{statusLabel}</StatusBadge> : <strong
              className={`${styles.orderStatus} ${styles[orderVisual.tone]}`}
            >
              {orderVisual.icon ? (
                <Icon
                  name={orderVisual.icon}
                  size={20}
                  strokeWidth={1.5}
                />
              ) : null}
              <span>{statusLabel}</span>
            </strong>}
            {showStageElapsed &&
            order.deliveryStatus === "READY_FOR_SHIPMENT" ? (
              <StageElapsedTime
                startedAt={order.deliveryStatusChangedAt ?? null}
              />
            ) : null}
          </span>
        </span>

        {tableLayout && <span className={styles.orderField}>
          <span className={styles.orderLabel}>Сумма</span>
          <strong>{new Intl.NumberFormat("ru-RU", { style: "currency", currency: order.currency || "RUB", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(order.totalAmount)}</strong>
        </span>}

        {tableLayout ? <button type="button" className={styles.expandIcon}
          aria-label={`${expanded ? "Свернуть" : "Открыть"} заказ ${formatOrderCode(order)}`}
          aria-expanded={navigateOnOpen ? undefined : expanded} aria-controls={navigateOnOpen ? undefined : `${detailsIdPrefix}-${order.id}`}
          onClick={toggleExpanded}>
          <Icon name={navigateOnOpen ? "arrow-up-right" : expanded ? "minus" : "plus"} size={20} strokeWidth={1.5} />
        </button> : <span className={styles.expandIcon} aria-hidden="true">
          <Icon name={expanded ? "minus" : "plus"} size={20} strokeWidth={1.5} />
        </span>}
      </SummaryTag>


      {expanded ? (
        <div
          className={styles.orderDetails}
          id={`${detailsIdPrefix}-${order.id}`}
        >
          <OrderDetailsPanel order={order} details={details} loading={detailsLoading} error={detailsError}
            onRetry={() => void loadDetails()} audience={audience} showDeliveryLabel={showDeliveryLabel}
            onOpenOrder={onOpenOrder} openButtonLabel={openButtonLabel} />
        </div>
      ) : null}
    </article>
  );
}

type StageSlaTone = "neutral" | "warning" | "critical";

function StageElapsedTime({
  startedAt,
  slaTone = "neutral",
}: {
  startedAt: string | null;
  slaTone?: StageSlaTone;
}) {
  const [now, setNow] = useState<number | null>(null);
  const startedAtTimestamp = parseTimestamp(startedAt);

  useEffect(() => {
    if (startedAtTimestamp === null) return;

    const updateNow = () => setNow(Date.now());
    updateNow();

    const intervalId = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(intervalId);
  }, [startedAtTimestamp]);

  if (now === null || startedAtTimestamp === null) return null;

  const elapsedMinutes = Math.max(
    0,
    Math.floor((now - startedAtTimestamp) / 60_000)
  );

  return (
    <span className={styles.stageElapsed} data-sla-tone={slaTone}>
      На этапе {formatElapsedTime(elapsedMinutes)}
    </span>
  );
}

function parseTimestamp(value: string | null) {
  if (!value?.trim()) return null;

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatElapsedTime(totalMinutes: number) {
  if (totalMinutes < 1) return "меньше минуты";

  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} д`);
  if (hours > 0) parts.push(`${hours} ч`);
  if (minutes > 0) parts.push(`${minutes} мин`);

  return parts.join(" ");
}

type OrderTone = "statusSuccess" | "statusWarning" | "statusDanger";
type OrderVisual = {
  tone: OrderTone;
  icon?: IconName;
};

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(/\./g, "-");
}

export function formatOrderCode(order: SellerOrderCardListItem) {
  const source = `${order.orderGroupId}:${order.id}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let value = hash >>> 0;
  let result = "";
  for (let index = 0; index < 6; index += 1) {
    result += alphabet[value % alphabet.length];
    value = Math.imul(value ^ (value >>> 13), 1597334677) >>> 0;
  }
  return result;
}

function getOrderVisual(
  order: SellerOrderCardListItem,
  statusLabel: string
): OrderVisual {
  const icon = getOrderStatusIcon(statusLabel);

  if (
    order.status === "CANCELED" ||
    order.paymentStatus === "FAILED" ||
    order.paymentStatus === "CANCELED" ||
    order.paymentStatus === "REFUNDED" ||
    order.deliveryStatus === "RETURNED" ||
    order.deliveryStatus === "CANCELLED"
  ) {
    return { tone: "statusDanger", icon };
  }

  if (order.status === "COMPLETED" || order.deliveryStatus === "DELIVERED") {
    return { tone: "statusSuccess", icon };
  }

  if (order.paymentStatus === "PENDING") {
    return { tone: "statusWarning", icon };
  }

  if (statusLabel === "Оплачен") {
    return { tone: "statusSuccess", icon };
  }

  if (
    order.status === "SHIPPED" ||
    order.deliveryStatus === "IN_TRANSIT"
  ) {
    return { tone: "statusSuccess", icon };
  }

  if (order.deliveryStatus === "READY_FOR_PICKUP") {
    return { tone: "statusSuccess", icon };
  }

  if (
    order.status === "PROCESSING" ||
    order.deliveryStatus === "READY_FOR_SHIPMENT"
  ) {
    return { tone: "statusWarning", icon };
  }

  if (
    order.status === "NEW" ||
    order.status === "CONFIRMED" ||
    order.status === "PAID" ||
    order.deliveryStatus === "PENDING"
  ) {
    return { tone: "statusWarning", icon };
  }

  return { tone: "statusSuccess", icon };
}

function getOrderStatusIcon(statusLabel: string): IconName | undefined {
  if (
    statusLabel === "Завершён" ||
    statusLabel === "Доставлен" ||
    statusLabel === "Оплачен"
  ) {
    return "check-circle";
  }
  if (
    statusLabel === "Ожидает оплаты" ||
    statusLabel === "Подготовка" ||
    statusLabel === "Оформление доставки" ||
    statusLabel === "Готовится к отправке"
  ) {
    return "clock";
  }
  if (statusLabel === "Ошибка оплаты") {
    return "info";
  }
  if (statusLabel === "В пути" || statusLabel === "Отправлен") {
    return "delivery-truck";
  }
  if (statusLabel === "Возвращён" || statusLabel === "Возврат оформлен") {
    return "return-circle";
  }
  if (
    statusLabel === "Передайте в СДЭК" ||
    statusLabel === "Ожидает отправки" ||
    statusLabel === "Готов к отправке"
  ) {
    return "shipment-handoff";
  }
  if (
    statusLabel === "Готов к выдаче" ||
    statusLabel === "Ожидает получения"
  ) {
    return "pickup-point";
  }
  if (
    statusLabel === "Оплата отменена" ||
    statusLabel === "Отменён" ||
    statusLabel === "Отменен"
  ) {
    return "cancel-circle";
  }
  return undefined;
}
