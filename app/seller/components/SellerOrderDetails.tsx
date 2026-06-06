"use client";

import Image from "next/image";

import { Button } from "../../components/ui/Button";
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
  onBack,
  onShip,
  formatOrderStatus,
  formatPaymentStatus,
  formatDeliveryStatus,
  buildSellerStatusLabel,
}: Props) {
  const labelHref = `/api/seller/orders/${order.id}/delivery-label`;

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <Button variant="secondary" onClick={onBack}>
          ← Назад
        </Button>

        <div>
          <h1 className={styles.title}>Заказ #{order.id}</h1>

          <div className={styles.meta}>
            <StatusBadge tone={getOrderTone(order)}>
              {buildSellerStatusLabel(order)}
            </StatusBadge>
            <span>•</span>
            <span>{new Date(order.createdAt).toLocaleString("ru-RU")}</span>
            <span>•</span>
            <span>{order.totalAmount.toLocaleString()} ₽</span>
          </div>
        </div>
      </div>

      <div className={styles.summary}>
        <SummaryItem label="Статус заказа" value={formatOrderStatus(order.status)} />
        <SummaryItem label="Оплата" value={formatPaymentStatus(order.paymentStatus)} />
        <SummaryItem label="Доставка" value={formatDeliveryStatus(order.deliveryStatus)} />
        <SummaryItem label="Товаров" value={`${order.items.length}`} />
      </div>

      <div className={styles.layout}>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Товары</h2>

            <div className={styles.itemsList}>
              {order.items.map((item, index) => (
                <article key={`${item.sku}-${index}`} className={styles.itemRow}>
                  <div className={styles.itemImageWrap}>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productTitle}
                        fill
                        className={styles.itemImage}
                      />
                    ) : (
                      <div className={styles.itemImagePlaceholder} />
                    )}
                  </div>

                  <div className={styles.itemMain}>
                    <div className={styles.itemTitle}>{item.productTitle}</div>

                    <div className={styles.itemMeta}>
                      <span>SKU: {item.sku}</span>
                      <span>•</span>
                      <span>{item.size}</span>
                      <span>•</span>
                      <span>{item.color}</span>
                    </div>

                    <div className={styles.itemMeta}>
                      {item.quantity} × {item.price.toLocaleString()} ₽
                    </div>
                  </div>

                  <div className={styles.itemTotal}>
                    {item.lineTotal.toLocaleString()} ₽
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Получатель</h2>

            <div className={styles.infoGrid}>
              <InfoRow label="Имя" value={order.recipientName} />
              <InfoRow label="Телефон" value={order.recipientPhone} />
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Доставка</h2>

            <div className={styles.infoGrid}>
              <InfoRow label="Способ доставки" value={order.deliveryMethod} />
              <InfoRow label="Адрес / ПВЗ" value={order.deliveryAddress} />

              {order.trackingNumber ? (
                <InfoRow label="Трек-номер" value={order.trackingNumber} />
              ) : null}
            </div>
          </section>
        </main>

        <aside className={styles.aside}>
          <div className={styles.stickyPanel}>
            <section className={styles.panelSection}>
              <h2>Информация</h2>

              <div className={styles.infoGrid}>
                <InfoRow label="Номер" value={`#${order.id}`} />
                <InfoRow label="Группа" value={String(order.orderGroupId)} />
                <InfoRow
                  label="Создан"
                  value={new Date(order.createdAt).toLocaleString("ru-RU")}
                />
              </div>
            </section>

            <section className={styles.panelSection}>
              <h2>Сумма</h2>

              <div className={styles.totals}>
                <InfoRow label="Товары" value={`${order.subtotalAmount.toLocaleString()} ₽`} />
                <InfoRow label="Доставка" value={`${order.deliveryAmount.toLocaleString()} ₽`} />
                <InfoRow label="Скидка" value={`${order.discountAmount.toLocaleString()} ₽`} />

                <div className={styles.totalFinal}>
                  <span>Итого</span>
                  <strong>{order.totalAmount.toLocaleString()} ₽</strong>
                </div>
              </div>
            </section>

            <section className={styles.panelSection}>
              <h2>Действия</h2>

              <div className={styles.actions}>
                {canShip ? (
                  <Button variant="primary" onClick={onShip} disabled={shipping}>
                    {shipping ? "Отмечаем…" : "Отправил"}
                  </Button>
                ) : (
                  <div className={styles.muted}>
                    Для текущего статуса отправка недоступна
                  </div>
                )}

                <a
                  href={labelHref}
                  className="buttonSecondary"
                  target="_blank"
                  rel="noreferrer"
                >
                  Скачать ярлык
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryItem}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className={styles.infoRow}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function getOrderTone(order: SellerOrder) {
  if (order.paymentStatus === "FAILED") return "danger";
  if (order.deliveryStatus === "DELIVERED") return "success";

  if (
    order.paymentStatus === "PAID" ||
    order.deliveryStatus === "READY_FOR_SHIPMENT" ||
    order.deliveryStatus === "IN_TRANSIT"
  ) {
    return "warning";
  }

  return "default";
}