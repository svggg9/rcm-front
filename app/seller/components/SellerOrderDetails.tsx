"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "../../components/ui/Button";
import { Price } from "../../components/ui/Price";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { apiFetch, API_URL } from "../../lib/api";

import styles from "./SellerOrderDetails.module.css";

import type { SellerOrder } from "../types";

type Props = {
  order: SellerOrder;
  shipping: boolean;
  canShip: boolean;
  onBack: () => void;
  onShip: () => void;
  formatOrderStatus: (status: SellerOrder["status"]) => string;
  formatPaymentStatus: (status: SellerOrder["paymentStatus"]) => string;
  formatDeliveryStatus: (status: SellerOrder["deliveryStatus"]) => string;
  buildSellerStatusLabel: (order: SellerOrder) => string;
};

export function SellerOrderDetails({
  order,
  shipping,
  canShip,
  onShip,
  formatOrderStatus,
  formatPaymentStatus,
  formatDeliveryStatus,
  buildSellerStatusLabel,
}: Props) {
  const labelHref = `${API_URL}/api/seller/orders/${order.id}/delivery-label`;

  return (
    <section className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Навигация">
        <Link href="/seller">Кабинет продавца</Link>
        <span>/</span>
        <Link href="/seller?tab=orders">Заказы</Link>
        <span>/</span>
        <span>Заказ {order.id}</span>
      </nav>

      <div className={styles.layout}>
        <main className={styles.main}>
          <section className={styles.header}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Заказ {order.id}</h1>
              <StatusBadge tone={getOrderTone(order)}>
                {buildSellerStatusLabel(order)}
              </StatusBadge>
            </div>

            <div className={styles.meta}>
              <span>{new Date(order.createdAt).toLocaleString("ru-RU")}</span>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Товары</h2>

            <div className={styles.products}>
              {order.items.map((item, index) => (
                <Link
                  key={`${item.sku}-${index}`}
                  href={`/product/${item.productId}`}
                  className={styles.product}
                >
                  <div className={styles.imageWrap}>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productTitle}
                        width={120}
                        height={150}
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
                <ReadonlyField label="Статус заказа" value={formatOrderStatus(order.status)} />
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
                <ReadonlyField label="Итого" value={<Price amount={order.totalAmount} />} strong />
              </div>
            </section>

            <section className={styles.panelSection}>
              <h2 className={styles.sectionTitle}>Действия</h2>

              <div className={styles.actions}>
                {canShip ? (
                  <Button variant="primary" onClick={onShip} disabled={shipping}>
                    {shipping ? "Отмечаем…" : "Отправил"}
                  </Button>
                ) : null}

                <a
                  href={labelHref}
                  className={styles.actionLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Скачать накладную СДЭК
                </a>

                <Button
                  variant="secondary"
                  onClick={async () => {
                    await apiFetch(
                      `${API_URL}/api/delivery/shipments/order/${order.id}/sync`,
                      {
                        method: "POST",
                      }
                    );

                    window.location.reload();
                  }}
                >
                  Синхронизировать доставку
                </Button>
              </div>
            </section>
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
  value: ReactNode | null | undefined;
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

function getOrderTone(order: SellerOrder) {
  if (
    order.status === "CANCELED" ||
    order.paymentStatus === "FAILED" ||
    order.paymentStatus === "CANCELED" ||
    order.deliveryStatus === "RETURNED" ||
    order.deliveryStatus === "CANCELLED"
  ) {
    return "danger";
  }

  if (order.paymentStatus === "PENDING") return "warning";

  if (
    order.deliveryStatus === "READY_FOR_SHIPMENT" ||
    order.deliveryStatus === "READY_FOR_PICKUP"
  ) {
    return "warning";
  }

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

