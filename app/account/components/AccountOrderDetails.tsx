"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "../../components/ui/Button";
import { Price } from "../../components/ui/Price";
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
      <nav className={styles.breadcrumbs} aria-label="Навигация">
        <Link href="/account?tab=profile">Профиль</Link>
        <span>/</span>
        <Link href="/account?tab=orders">Заказы</Link>
        <span>/</span>
        <span>Заказ {order.id}</span>
      </nav>

      <div className={styles.layout}>
        <main className={styles.main}>
          <section className={styles.header}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Заказ {order.id}</h1>
              <StatusBadge tone={getOrderTone(order)}>
                {buildOrderStatusLabel(order)}
              </StatusBadge>
            </div>

            <div className={styles.statusLine}>
              <span>{new Date(order.createdAt).toLocaleString("ru-RU")}</span>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Товары</h2>

            <div className={styles.products}>
              {order.items.map((item, index) => (
                <Link
                  key={`${item.productTitle}-${index}`}
                  href={`/product/${item.productId}`}
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
                      {item.quantity} × <Price amount={item.price} />
                    </div>

                  </div>

                  <div className={styles.productPrice}>
                    <Price amount={item.lineTotal} />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Получатель</h2>

            <div className={styles.formGrid}>
              <ReadonlyField label="ФИО" value={order.recipientName?.trim() || null} />
              <ReadonlyField label="Телефон" value={order.recipientPhone} />
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Доставка</h2>

            <div className={styles.formGrid}>
              <ReadonlyField label="Способ доставки" value={formatDeliveryMethod(order.deliveryMethod)} />
              <ReadonlyField label="Адрес / ПВЗ" value={order.deliveryAddress} wide />

              {order.delivery?.cdekNumber ? (
                <ReadonlyField label="Номер СДЭК" value={order.delivery.cdekNumber} />
              ) : null}

              {order.delivery?.shipmentStatus ? (
                <ReadonlyField label="Статус СДЭК" value={order.delivery.shipmentStatus} />
              ) : null}

              {order.delivery?.trackingUrl ? (
                <ReadonlyField
                  label="Отследить"
                  value={
                    <a href={order.delivery.trackingUrl} target="_blank" rel="noreferrer">
                      Открыть трекинг
                    </a>
                  }
                />
              ) : null}

              {order.trackingNumber ? (
                <ReadonlyField label="Трек-номер" value={order.trackingNumber} />
              ) : null}
            </div>
          </section>
        </main>

        <aside className={styles.aside}>
          <div className={styles.stickyPanel}>
            <section className={styles.panelSection}>
              <h2 className={styles.sectionTitle}>Информация</h2>

              <div className={styles.formGridSingle}>
                <ReadonlyField label="Номер заказа" value={order.id} />
                <ReadonlyField label="Статус оплаты" value={formatPaymentStatus(order.paymentStatus)} />
                <ReadonlyField label="Статус доставки" value={formatDeliveryStatus(order.deliveryStatus)} />
              </div>
            </section>

            <section className={styles.panelSection}>
              <h2 className={styles.sectionTitle}>Сумма</h2>

              <div className={styles.formGridSingle}>
                <ReadonlyField label="Товары" value={<Price amount={order.subtotalAmount} />} />
                <ReadonlyField
                  label="Доставка"
                  value={
                    order.deliveryAmount === 0
                      ? "Бесплатно"
                      : <Price amount={order.deliveryAmount} />
                  }
                />
                {order.discountAmount > 0 ? (
                  <ReadonlyField label="Скидка" value={<Price amount={order.discountAmount} />} />
                ) : null}
                <ReadonlyField
                  label="Итого"
                  value={<Price amount={order.totalAmount} />}
                  strong
                />
              </div>
            </section>

            {canPay ? (
              <section className={styles.panelSection}>
                <h2 className={styles.sectionTitle}>Действия</h2>

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
              </section>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}

function ReadonlyField({
  label,
  value,
  strong = false,
  wide = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`${styles.readonlyField} ${wide ? styles.readonlyFieldWide : ""}`.trim()}>
      <span className={styles.readonlyLabel}>{label}</span>
      <div className={`${styles.readonlyValue} ${strong ? styles.readonlyValueStrong : ""}`.trim()}>
        {value || "—"}
      </div>
    </div>
  );
}

function formatDeliveryMethod(value: string) {
  if (value === "COURIER") return "Курьер";
  if (value === "PICKUP_POINT" || value === "PICKUP") return "ПВЗ СДЭК";
  return value;
}

function getOrderTone(order: Order) {
  if (
    order.status === "CANCELED" ||
    order.paymentStatus === "FAILED" ||
    order.paymentStatus === "CANCELED"
  ) {
    return "danger";
  }

  if (order.paymentStatus === "PENDING") return "warning";
  if (order.deliveryStatus === "DELIVERED") return "success";
  if (
    order.status === "CONFIRMED" ||
    order.status === "COMPLETED" ||
    order.paymentStatus === "PAID"
  ) {
    return "success";
  }

  return "default";
}
