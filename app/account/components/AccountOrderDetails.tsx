"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "../Account.module.css";

import { API_URL, apiFetch } from "../../lib/api";
import type { Order } from "../types";

type Props = {
  order: Order;
  onBack: () => void;
  formatOrderStatus: (status: Order["status"]) => string;
  formatPaymentStatus: (status: Order["paymentStatus"]) => string;
  formatDeliveryStatus: (status: Order["deliveryStatus"]) => string;
  buildOrderStatusLabel: (order: Order) => string;
};

type DeliveryRequestInfo = {
  shipmentId: number;
  requestId: string;
  status: string;
  trackingUrl: string | null;
  pickupCode: string | null;
  deliveryFrom: string | null;
  deliveryTo: string | null;
  updatedAt: string | null;
};

type DevDeliveryStatus =
  | "CREATED"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED";

const DEV_STATUS_OPTIONS: DevDeliveryStatus[] = [
  "CREATED",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
];

function formatMoney(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "—";
  }

  return `${value.toLocaleString("ru-RU")} ₽`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDeliveryMethod(value: string | null | undefined): string {
  if (!value) return "—";

  switch (value) {
    case "PICKUP_POINT":
      return "Пункт выдачи";
    case "COURIER":
      return "Курьер";
    default:
      return value;
  }
}

function formatShipmentStatus(value: string | null | undefined): string {
  if (!value) return "—";

  switch (value) {
    case "NEW":
      return "Новая";
    case "CREATED":
      return "Создана";
    case "PROCESSING":
      return "Обрабатывается";
    case "READY_FOR_PICKUP":
      return "Готова к выдаче";
    case "IN_TRANSIT":
      return "В пути";
    case "DELIVERED":
      return "Доставлена";
    case "CANCELLED":
      return "Отменена";
    case "FAILED":
      return "Ошибка доставки";
    default:
      return value;
  }
}

export function AccountOrderDetails({
  order,
  onBack,
  formatOrderStatus,
  formatPaymentStatus,
  formatDeliveryStatus,
  buildOrderStatusLabel,
}: Props) {
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryRequestInfo | null>(null);
  const [deliveryInfoLoading, setDeliveryInfoLoading] = useState(false);
  const [deliveryInfoError, setDeliveryInfoError] = useState<string | null>(null);

  const [devUpdatingStatus, setDevUpdatingStatus] = useState<DevDeliveryStatus | null>(null);
  const [devStatusError, setDevStatusError] = useState<string | null>(null);

  const canPay = order.status === "NEW" && order.paymentStatus === "PENDING";

  const deliveryRequestId = order.delivery?.requestId ?? null;
  const trackingUrl = deliveryInfo?.trackingUrl ?? order.delivery?.trackingUrl ?? null;
  const shipmentStatus = deliveryInfo?.status ?? order.delivery?.shipmentStatus ?? null;

  useEffect(() => {
    let active = true;

    async function loadDeliveryInfo() {
      if (!deliveryRequestId) {
        setDeliveryInfo(null);
        setDeliveryInfoError(null);
        return;
      }

      try {
        setDeliveryInfoLoading(true);
        setDeliveryInfoError(null);

        const response = await apiFetch(
          `${API_URL}/api/delivery/requests/${encodeURIComponent(deliveryRequestId)}`
        );

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || `Ошибка загрузки доставки (${response.status})`);
        }

        const data = (await response.json()) as DeliveryRequestInfo;

        if (active) {
          setDeliveryInfo(data);
        }
      } catch (e) {
        if (active) {
          setDeliveryInfoError(
            e instanceof Error ? e.message : "Не удалось загрузить информацию о доставке"
          );
        }
      } finally {
        if (active) {
          setDeliveryInfoLoading(false);
        }
      }
    }

    void loadDeliveryInfo();

    return () => {
      active = false;
    };
  }, [deliveryRequestId]);

  const deliveryWindowLabel = useMemo(() => {
    if (!deliveryInfo?.deliveryFrom && !deliveryInfo?.deliveryTo) {
      return null;
    }

    return `${formatDateTime(deliveryInfo.deliveryFrom)} — ${formatDateTime(
      deliveryInfo.deliveryTo
    )}`;
  }, [deliveryInfo]);

  async function handlePay() {
    if (!canPay || paying) return;

    setPaying(true);
    setPayError(null);

    try {
      const response = await apiFetch(
        `${API_URL}/api/payments/group/${encodeURIComponent(order.orderGroupId)}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка создания оплаты (${response.status})`);
      }

      const data: { confirmationUrl?: string } = await response.json();

      if (!data.confirmationUrl) {
        throw new Error("Не пришла ссылка на оплату");
      }

      window.location.href = data.confirmationUrl;
    } catch (e) {
      setPayError(
        e instanceof Error ? e.message : "Не удалось перейти к оплате"
      );
    } finally {
      setPaying(false);
    }
  }

  async function handleDevStatusUpdate(status: DevDeliveryStatus) {
    if (!deliveryRequestId || devUpdatingStatus) return;

    setDevUpdatingStatus(status);
    setDevStatusError(null);

    try {
      const response = await apiFetch(
        `${API_URL}/api/dev/delivery/requests/${encodeURIComponent(deliveryRequestId)}/status`,
        {
          method: "POST",
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка обновления статуса (${response.status})`);
      }

      const updated = (await response.json()) as DeliveryRequestInfo;
      setDeliveryInfo(updated);
    } catch (e) {
      setDevStatusError(
        e instanceof Error ? e.message : "Не удалось обновить статус доставки"
      );
    } finally {
      setDevUpdatingStatus(null);
    }
  }

  return (
    <>
      <div className={styles.orderDetailsHeader}>
        <button
          type="button"
          className={styles.orderBackButton}
          onClick={onBack}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path
              d="M10 2.5L3 11.5L10 20.5M21 11.5H3"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </button>

        <div className={styles.sectionTitleNoMargin}>Заказ #{order.id}</div>
      </div>

      <section className={styles.orderDetailsStatusCard}>
        <div className={styles.orderDetailsStatusLine}>
          <span className={styles.orderStatusLarge}>
            {buildOrderStatusLabel(order)}
          </span>
          <span className={styles.orderDate}>
            {formatDate(order.createdAt)}
          </span>
        </div>
      </section>

      <section className={styles.orderDetailsSection}>
        <h2 className={styles.orderDetailsTitle}>Товары</h2>

        <div className={styles.orderDetailsProducts}>
          {order.items.map((item, index) => (
            <div
              key={`${item.productTitle}-${index}`}
              className={styles.orderDetailsProduct}
            >
              <div className={styles.orderDetailsImageWrap}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.productTitle}
                    className={styles.orderDetailsImage}
                  />
                ) : (
                  <div className={styles.orderDetailsImagePlaceholder} />
                )}
              </div>

              <div className={styles.orderDetailsProductInfo}>
                <div className={styles.orderDetailsProductTitle}>
                  {item.productTitle}
                </div>

                <div className={styles.orderDetailsMeta}>
                  {item.size} · {item.color}
                </div>

                <div className={styles.orderDetailsMeta}>
                  {item.quantity} × {item.price.toLocaleString()} ₽
                </div>

                <div className={styles.orderDetailsMeta}>SKU: {item.sku}</div>

                <div className={styles.orderDetailsPrice}>
                  {item.lineTotal.toLocaleString()} ₽
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.orderDetailsBottomGrid}>
        <section className={styles.orderDetailsSection}>
          <h2 className={styles.orderDetailsTitle}>Детали оплаты</h2>

          <div className={styles.orderDetailsRows}>
            <div className={styles.orderDetailsRow}>
              <span>Статус заказа</span>
              <span>{formatOrderStatus(order.status)}</span>
            </div>

            <div className={styles.orderDetailsRow}>
              <span>Статус оплаты</span>
              <span>{formatPaymentStatus(order.paymentStatus)}</span>
            </div>

            <div className={styles.orderDetailsRow}>
              <span>Статус доставки</span>
              <span>
                {order.delivery?.shipmentStatus
                  ? formatShipmentStatus(order.delivery.shipmentStatus)
                  : formatDeliveryStatus(order.deliveryStatus)}
              </span>
            </div>

            <div className={styles.orderDetailsRow}>
              <span>Товары</span>
              <span>{formatMoney(order.subtotalAmount)}</span>
            </div>

            <div className={styles.orderDetailsRow}>
              <span>Доставка</span>
              <span>
                {order.deliveryAmount === 0
                  ? "Бесплатно"
                  : formatMoney(order.deliveryAmount)}
              </span>
            </div>

            <div className={styles.orderDetailsRow}>
              <span>Скидка</span>
              <span>
                {order.discountAmount === 0
                  ? "0 ₽"
                  : formatMoney(order.discountAmount)}
              </span>
            </div>
          </div>

          <div className={styles.orderDetailsTotal}>
            <span>Итого</span>
            <span>{formatMoney(order.totalAmount)}</span>
          </div>

          {canPay ? (
            <div style={{ marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => void handlePay()}
                disabled={paying}
                className={styles.orderPayButton ?? ""}
                style={{
                  border: "none",
                  background: "#111",
                  color: "#fff",
                  padding: "12px 16px",
                  cursor: paying ? "default" : "pointer",
                  opacity: paying ? 0.65 : 1,
                }}
              >
                {paying ? "Переходим к оплате…" : "Оплатить"}
              </button>

              {payError ? (
                <div
                  style={{
                    marginTop: "12px",
                    color: "#b00020",
                    fontSize: "14px",
                  }}
                >
                  {payError}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className={styles.orderDetailsSection}>
          <h2 className={styles.orderDetailsTitle}>Детали доставки</h2>

          <div className={styles.orderDeliveryBlock}>
            <div className={styles.orderDeliveryItem}>
              <div className={styles.infoLabel}>Группа заказов</div>
              <div className={styles.infoValue}>{order.orderGroupId}</div>
            </div>

            <div className={styles.orderDeliveryItem}>
              <div className={styles.infoLabel}>Способ доставки</div>
              <div className={styles.infoValue}>
                {formatDeliveryMethod(order.delivery?.method ?? order.deliveryMethod)}
              </div>
            </div>

            <div className={styles.orderDeliveryItem}>
              <div className={styles.infoLabel}>Адрес / ПВЗ</div>
              <div className={styles.infoValue}>{order.deliveryAddress}</div>
            </div>

            <div className={styles.orderDeliveryItem}>
              <div className={styles.infoLabel}>Получатель</div>
              <div className={styles.infoValue}>{order.recipientName}</div>
            </div>

            <div className={styles.orderDeliveryItem}>
              <div className={styles.infoLabel}>Телефон</div>
              <div className={styles.infoValue}>{order.recipientPhone}</div>
            </div>

            {typeof order.delivery?.priceAmount === "number" ? (
              <div className={styles.orderDeliveryItem}>
                <div className={styles.infoLabel}>Стоимость доставки</div>
                <div className={styles.infoValue}>
                  {formatMoney(order.delivery.priceAmount)}
                </div>
              </div>
            ) : null}

            {order.delivery?.provider ? (
              <div className={styles.orderDeliveryItem}>
                <div className={styles.infoLabel}>Провайдер</div>
                <div className={styles.infoValue}>{order.delivery.provider}</div>
              </div>
            ) : null}

            {shipmentStatus ? (
              <div className={styles.orderDeliveryItem}>
                <div className={styles.infoLabel}>Shipment status</div>
                <div className={styles.infoValue}>
                  {formatShipmentStatus(shipmentStatus)}
                </div>
              </div>
            ) : null}

            {deliveryRequestId ? (
              <div className={styles.orderDeliveryItem}>
                <div className={styles.infoLabel}>Request ID</div>
                <div className={styles.infoValue}>{deliveryRequestId}</div>
              </div>
            ) : null}

            {trackingUrl ? (
              <div className={styles.orderDeliveryItem}>
                <div className={styles.infoLabel}>Tracking</div>
                <div className={styles.infoValue}>
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "inherit", textDecoration: "underline" }}
                  >
                    Открыть tracking
                  </a>
                </div>
              </div>
            ) : null}

            {deliveryInfo?.pickupCode ? (
              <div className={styles.orderDeliveryItem}>
                <div className={styles.infoLabel}>Код получения</div>
                <div className={styles.infoValue}>{deliveryInfo.pickupCode}</div>
              </div>
            ) : null}

            {deliveryWindowLabel ? (
              <div className={styles.orderDeliveryItem}>
                <div className={styles.infoLabel}>Окно доставки</div>
                <div className={styles.infoValue}>{deliveryWindowLabel}</div>
              </div>
            ) : null}

            {order.trackingNumber ? (
              <div className={styles.orderDeliveryItem}>
                <div className={styles.infoLabel}>Трек-номер</div>
                <div className={styles.infoValue}>{order.trackingNumber}</div>
              </div>
            ) : null}

            {deliveryInfoLoading ? (
              <div className={styles.orderDeliveryItem}>
                <div className={styles.infoLabel}>Информация о доставке</div>
                <div className={styles.infoValue}>Загрузка…</div>
              </div>
            ) : null}

            {deliveryInfoError ? (
              <div className={styles.orderDeliveryItem}>
                <div className={styles.infoLabel}>Ошибка доставки</div>
                <div className={styles.infoValue}>{deliveryInfoError}</div>
              </div>
            ) : null}
          </div>

          {deliveryRequestId ? (
            <div style={{ marginTop: "20px" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "10px",
                }}
              >
                Dev: смена статуса доставки
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {DEV_STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void handleDevStatusUpdate(status)}
                    disabled={devUpdatingStatus !== null}
                    style={{
                      border: "1px solid #ddd",
                      background: "#fff",
                      padding: "8px 10px",
                      cursor: devUpdatingStatus ? "default" : "pointer",
                      opacity: devUpdatingStatus ? 0.7 : 1,
                    }}
                  >
                    {devUpdatingStatus === status ? "Обновляем…" : status}
                  </button>
                ))}
              </div>

              {devStatusError ? (
                <div
                  style={{
                    marginTop: "10px",
                    color: "#b00020",
                    fontSize: "14px",
                  }}
                >
                  {devStatusError}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}