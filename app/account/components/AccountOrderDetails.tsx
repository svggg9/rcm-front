"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { API_URL, apiFetch } from "../../lib/api";

import styles from "./AccountOrderDetails.module.css";

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

  const canPay = order.status === "NEW" && order.paymentStatus === "PENDING";

  async function handlePay() {
    if (!canPay || paying) return;

    setPaying(true);
    setPayError(null);

    try {
      const response = await apiFetch(
        `${API_URL}/api/payments/group/${encodeURIComponent(order.orderGroupId)}`,
        { method: "POST" }
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
      setPayError(e instanceof Error ? e.message : "Не удалось перейти к оплате");
    } finally {
      setPaying(false);
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path
              d="M10 2.5L3 11.5L10 20.5M21 11.5H3"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </button>

        <div>
          <h1 className={styles.title}>Заказ #{order.id}</h1>

          <div className={styles.statusLine}>
            <StatusBadge>{buildOrderStatusLabel(order)}</StatusBadge>
            <span>
              {new Date(order.createdAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Товары</h2>

        <div className={styles.products}>
          {order.items.map((item, index) => (
            <article
              key={`${item.productTitle}-${index}`}
              className={styles.product}
            >
              <div className={styles.imageWrap}>
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productTitle}
                    width={88}
                    height={116}
                    className={styles.image}
                  />
                ) : (
                  <div className={styles.imagePlaceholder} />
                )}
              </div>

              <div className={styles.productInfo}>
                <div className={styles.productTitle}>{item.productTitle}</div>

                <div className={styles.productMeta}>
                  {item.size} · {item.color}
                </div>

                <div className={styles.productMeta}>
                  {item.quantity} × {item.price.toLocaleString()} ₽
                </div>

                <div className={styles.productMeta}>SKU: {item.sku}</div>

                <div className={styles.productPrice}>
                  {item.lineTotal.toLocaleString()} ₽
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.bottomGrid}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Оплата</h2>

          <div className={styles.rows}>
            <InfoRow label="Статус заказа" value={formatOrderStatus(order.status)} />
            <InfoRow label="Статус оплаты" value={formatPaymentStatus(order.paymentStatus)} />
            <InfoRow label="Статус доставки" value={formatDeliveryStatus(order.deliveryStatus)} />
          </div>

          <div className={styles.rows}>
            <InfoRow label="Товары" value={`${order.subtotalAmount.toLocaleString()} ₽`} />
            <InfoRow
              label="Доставка"
              value={
                order.deliveryAmount === 0
                  ? "Бесплатно"
                  : `${order.deliveryAmount.toLocaleString()} ₽`
              }
            />
            <InfoRow
              label="Скидка"
              value={
                order.discountAmount === 0
                  ? "0 ₽"
                  : `${order.discountAmount.toLocaleString()} ₽`
              }
            />
          </div>

          <div className={styles.total}>
            <span>Итого</span>
            <strong>{order.totalAmount.toLocaleString()} ₽</strong>
          </div>

          {canPay ? (
            <div className={styles.paymentAction}>
              <Button
                variant="primary"
                onClick={() => void handlePay()}
                disabled={paying}
              >
                {paying ? "Переходим к оплате…" : "Оплатить"}
              </Button>

              {payError ? <div className={styles.payError}>{payError}</div> : null}
            </div>
          ) : null}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Доставка</h2>

          <div className={styles.deliveryBlock}>
            <DeliveryItem label="Группа заказов" value={order.orderGroupId} />
            <DeliveryItem label="Способ доставки" value={order.deliveryMethod} />
            <DeliveryItem label="Адрес / ПВЗ" value={order.deliveryAddress} />
            <DeliveryItem label="Получатель" value={order.recipientName} />
            <DeliveryItem label="Телефон" value={order.recipientPhone} />

            {order.trackingNumber ? (
              <DeliveryItem label="Трек-номер" value={order.trackingNumber} />
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DeliveryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.deliveryItem}>
      <div className={styles.infoLabel}>{label}</div>
      <div className={styles.infoValue}>{value}</div>
    </div>
  );
}