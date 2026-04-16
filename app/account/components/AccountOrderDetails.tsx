  "use client";

  import { useState } from "react";

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

    const canPay =
      order.status === "NEW" && order.paymentStatus === "PENDING";

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
              {new Date(order.createdAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
              })}
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
                <span>{formatDeliveryStatus(order.deliveryStatus)}</span>
              </div>

              <div className={styles.orderDetailsRow}>
                <span>Товары</span>
                <span>{order.subtotalAmount.toLocaleString()} ₽</span>
              </div>

              <div className={styles.orderDetailsRow}>
                <span>Доставка</span>
                <span>
                  {order.deliveryAmount === 0
                    ? "Бесплатно"
                    : `${order.deliveryAmount.toLocaleString()} ₽`}
                </span>
              </div>

              <div className={styles.orderDetailsRow}>
                <span>Скидка</span>
                <span>
                  {order.discountAmount === 0
                    ? "0 ₽"
                    : `${order.discountAmount.toLocaleString()} ₽`}
                </span>
              </div>
            </div>

            <div className={styles.orderDetailsTotal}>
              <span>Итого</span>
              <span>{order.totalAmount.toLocaleString()} ₽</span>
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
                <div className={styles.infoValue}>{order.deliveryMethod}</div>
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

              {order.trackingNumber ? (
                <div className={styles.orderDeliveryItem}>
                  <div className={styles.infoLabel}>Трек-номер</div>
                  <div className={styles.infoValue}>{order.trackingNumber}</div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </>
    );
  }