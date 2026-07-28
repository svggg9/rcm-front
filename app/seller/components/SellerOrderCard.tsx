"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { Icon, type IconName } from "../../components/ui/Icon";
import { API_URL } from "../../lib/api";
import { formatRussianPhone } from "../../lib/phone";
import type { SellerOrderListItem } from "../types";

import styles from "./SellerOrderCard.module.css";

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
};

export type OrderCardDetails = {
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
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<OrderCardDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(false);
  const autoExpandHandled = useRef(false);
  const orderVisual = getOrderVisual(order, statusLabel);

  const loadDetails = useCallback(async () => {
    if (!onLoadDetails || detailsLoading) return;

    setDetailsLoading(true);
    setDetailsError(false);

    try {
      setDetails(await onLoadDetails(order.id));
    } catch {
      setDetailsError(true);
    } finally {
      setDetailsLoading(false);
    }
  }, [detailsLoading, onLoadDetails, order.id]);

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
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);

    if (nextExpanded && !details && !detailsLoading) {
      void loadDetails();
    }
  }

  return (
    <article
      className={`${styles.orderRow} ${expanded ? styles.orderRowExpanded : ""}`}
      onMouseEnter={() => onPrefetch?.(order.id)}
    >
      <button
        type="button"
        className={styles.orderToggle}
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-controls={`${detailsIdPrefix}-${order.id}`}
      >
        <span className={styles.orderField}>
          <span className={styles.orderLabel}>Дата заказа</span>
          <strong>{formatOrderDate(order.createdAt)}</strong>
        </span>

        <span className={styles.orderField}>
          <span className={styles.orderLabel}>Номер заказа</span>
          <strong>{formatOrderCode(order)}</strong>
        </span>

        <span className={styles.orderField}>
          <span className={styles.orderLabel}>Статус</span>
          <span className={styles.orderStatusBlock}>
            <strong
              className={`${styles.orderStatus} ${styles[orderVisual.tone]}`}
            >
              {orderVisual.icon ? (
                <Icon
                  name={orderVisual.icon}
                  size={16}
                  strokeWidth={1.7}
                />
              ) : null}
              <span>{statusLabel}</span>
            </strong>
            {showStageElapsed &&
            order.deliveryStatus === "READY_FOR_SHIPMENT" ? (
              <StageElapsedTime
                startedAt={order.deliveryStatusChangedAt ?? null}
              />
            ) : null}
          </span>
        </span>

        <span className={styles.expandIcon} aria-hidden="true">
          <Icon name={expanded ? "minus" : "plus"} size={18} strokeWidth={1.8} />
        </span>
      </button>

      {expanded ? (
        <div
          className={styles.orderDetails}
          id={`${detailsIdPrefix}-${order.id}`}
        >
          <div className={styles.detailsBody}>
            <section className={styles.positions}>
              {detailsLoading ? (
                <div className={styles.positionsSkeleton}>
                  <CabinetSkeleton variant="list" rows={1} compact />
                </div>
              ) : detailsError ? (
                <div className={styles.positionsError}>
                  <span>Не удалось загрузить позиции заказа</span>
                  <button type="button" onClick={() => void loadDetails()}>
                    Повторить
                  </button>
                </div>
              ) : details?.items.length ? (
                <div className={styles.positionsList}>
                  {details.items.map((item) => (
                    <article
                      className={styles.position}
                      key={`${item.productId}-${item.variantId}`}
                    >
                      <div className={styles.positionProduct}>
                        <div className={styles.positionImageWrap}>
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.productTitle}
                              width={60}
                              height={76}
                              className={styles.positionImage}
                            />
                          ) : (
                            <div
                              className={styles.positionImagePlaceholder}
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className={styles.positionCopy}>
                          <strong>{item.productTitle}</strong>
                          {isDistinctBrand(item.brandName, item.productTitle) ? (
                            <span>{item.brandName}</span>
                          ) : null}
                          {item.size || item.color ? (
                            <span>
                              {[
                                item.size ? `Размер ${item.size}` : null,
                                item.color ? `Цвет ${item.color}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className={styles.positionMeta}>
                        <div className={styles.positionValue}>
                          <span className={styles.positionLabel}>Количество</span>
                          <span>{item.quantity}</span>
                        </div>
                        <div className={styles.positionValue}>
                          <span className={styles.positionLabel}>Цена</span>
                          <OrderMoney
                            value={item.price}
                            currency={details.currency}
                          />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.positionsFallback}>
                  {(order.productTitles?.length
                    ? order.productTitles
                    : [order.firstProductTitle]
                  )
                    .filter(Boolean)
                    .map((title, index) => (
                      <div key={`${title}-${index}`}>{title}</div>
                    ))}
                </div>
              )}
            </section>

            <div className={styles.detailsPanels}>
              <section className={styles.deliveryPanel}>
                <h3>Доставка</h3>

                <address className={styles.deliveryAddress}>
                  <strong>{details?.recipientName || order.recipientName || "—"}</strong>
                  {details?.deliveryAddress ? (
                    <span>
                      {isPickupDelivery(details.deliveryMethod)
                        ? `Адрес СДЭК: ${details.deliveryAddress}`
                        : details.deliveryAddress}
                    </span>
                  ) : null}
                  {details?.recipientPhone ? (
                    <span>{formatRussianPhone(details.recipientPhone)}</span>
                  ) : null}
                </address>

                <dl className={styles.statusList}>
                  <div>
                    <dt>Статус доставки</dt>
                    <dd>
                      <OrderStatusText visual={getDeliveryVisual(order.deliveryStatus)}>
                        {formatDeliveryStatus(order.deliveryStatus, audience)}
                      </OrderStatusText>
                    </dd>
                  </div>
                  {details?.delivery?.cdekNumber || details?.trackingNumber ? (
                    <div>
                      <dt>Номер СДЭК</dt>
                      <dd>
                        {details.delivery?.cdekNumber || details.trackingNumber}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {details?.delivery &&
                (details.delivery.trackingUrl || showDeliveryLabel) ? (
                  <div className={styles.deliveryActions}>
                    {details.delivery.trackingUrl ? (
                      <a
                        href={details.delivery.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Отследить отправление
                      </a>
                    ) : null}
                    {showDeliveryLabel ? (
                      <a
                        href={`${API_URL}/api/seller/orders/${order.id}/delivery-label`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Скачать накладную СДЭК
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className={styles.totalsPanel}>
                <h3>Сумма</h3>
                <dl className={styles.totalsList}>
                  <div>
                    <dt>Статус оплаты</dt>
                    <dd>
                      <OrderStatusText
                        visual={getPaymentVisual(order.paymentStatus)}
                        showIcon={false}
                      >
                        {formatPaymentStatus(order.paymentStatus)}
                      </OrderStatusText>
                    </dd>
                  </div>
                  <div>
                    <dt>Товары</dt>
                    <dd>
                      <OrderMoney
                        value={details?.subtotalAmount ?? order.totalAmount}
                        currency={details?.currency || order.currency}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Доставка</dt>
                    <dd>
                      {details
                        ? details.deliveryAmount === 0
                          ? "Бесплатно"
                          : (
                              <OrderMoney
                                value={details.deliveryAmount}
                                currency={details.currency}
                              />
                            )
                        : "—"}
                    </dd>
                  </div>
                  {details && details.discountAmount > 0 ? (
                    <div>
                      <dt>Скидка</dt>
                      <dd>
                        −
                        <OrderMoney
                          value={details.discountAmount}
                          currency={details.currency}
                        />
                      </dd>
                    </div>
                  ) : null}
                  <div className={styles.totalRow}>
                    <dt>Итого</dt>
                    <dd>
                      <OrderMoney
                        value={details?.totalAmount ?? order.totalAmount}
                        currency={details?.currency || order.currency}
                      />
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>

          {onOpenOrder ? (
            <div className={styles.detailsFooter}>
              <button
                type="button"
                className={styles.openButton}
                onClick={() => onOpenOrder(order.id)}
              >
                {openButtonLabel}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function isDistinctBrand(
  brandName: string | null | undefined,
  productTitle: string
) {
  const normalizedBrand = brandName?.trim().toLocaleLowerCase("ru-RU");
  const normalizedTitle = productTitle.trim().toLocaleLowerCase("ru-RU");

  return Boolean(normalizedBrand && normalizedBrand !== normalizedTitle);
}

function isPickupDelivery(method: string | null | undefined) {
  return method === "PICKUP_POINT" || method === "PICKUP";
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

function OrderStatusText({
  visual,
  children,
  showIcon = true,
}: {
  visual: OrderVisual;
  children: string;
  showIcon?: boolean;
}) {
  return (
    <span className={`${styles.inlineStatus} ${styles[visual.tone]}`}>
      {showIcon && visual.icon ? (
        <Icon name={visual.icon} size={15} strokeWidth={1.7} />
      ) : null}
      <span>{children}</span>
    </span>
  );
}

function getPaymentVisual(
  status: SellerOrderListItem["paymentStatus"]
): OrderVisual {
  if (status === "PENDING") {
    return { tone: "statusWarning", icon: "clock" };
  }
  if (status === "PAID") {
    return { tone: "statusSuccess" };
  }
  if (status === "FAILED") {
    return { tone: "statusDanger", icon: "info" };
  }
  if (status === "CANCELED") {
    return { tone: "statusDanger", icon: "cancel-circle" };
  }
  return { tone: "statusDanger", icon: "return-circle" };
}

function getDeliveryVisual(
  status: SellerOrderListItem["deliveryStatus"]
): OrderVisual {
  if (status === "CANCELLED") {
    return { tone: "statusDanger", icon: "cancel-circle" };
  }
  if (status === "RETURNED") {
    return { tone: "statusDanger", icon: "return-circle" };
  }
  if (status === "DELIVERED") {
    return { tone: "statusSuccess", icon: "check-circle" };
  }
  if (status === "IN_TRANSIT") {
    return { tone: "statusSuccess", icon: "delivery-truck" };
  }
  if (status === "READY_FOR_PICKUP") {
    return { tone: "statusSuccess", icon: "pickup-point" };
  }
  if (status === "READY_FOR_SHIPMENT") {
    return { tone: "statusWarning", icon: "shipment-handoff" };
  }
  return { tone: "statusWarning", icon: "clock" };
}

function formatPaymentStatus(status: SellerOrderListItem["paymentStatus"]) {
  switch (status) {
    case "PENDING":
      return "Ожидает оплаты";
    case "PAID":
      return "Оплачен";
    case "FAILED":
      return "Ошибка оплаты";
    case "CANCELED":
      return "Оплата отменена";
    case "REFUNDED":
      return "Возвращён";
    default:
      return status;
  }
}

function formatDeliveryStatus(
  status: SellerOrderListItem["deliveryStatus"],
  audience: OrderCardAudience
) {
  switch (status) {
    case "PENDING":
      return "Оформление доставки";
    case "READY_FOR_SHIPMENT":
      return audience === "seller" ? "Передайте в СДЭК" : "Готовится к отправке";
    case "READY_FOR_PICKUP":
      return "Ожидает получения";
    case "IN_TRANSIT":
      return "В пути";
    case "DELIVERED":
      return "Доставлен";
    case "RETURNED":
      return "Возвращён";
    case "CANCELLED":
      return "Отменён";
    default:
      return status;
  }
}

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

function formatOrderCode(order: SellerOrderCardListItem) {
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

function OrderMoney({
  value,
  currency,
}: {
  value: number;
  currency: string;
}) {
  const parts = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "RUB",
    maximumFractionDigits: 0,
  }).formatToParts(value);

  return (
    <span className={styles.money}>
      {parts.map((part, index) => (
        <span
          className={part.type === "currency" ? styles.currencySymbol : undefined}
          key={`${part.type}-${index}`}
        >
          {part.value}
        </span>
      ))}
    </span>
  );
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
