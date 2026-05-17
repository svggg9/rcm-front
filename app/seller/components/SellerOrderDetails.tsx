"use client";

import styles from "../Seller.module.css";

import type { SellerOrder } from "../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import Image from "next/image";

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
  return (
    <section className={styles.orderDetailsPage}>
      <div className={styles.orderDetailsHeader}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Назад
        </button>

        <div>
          <h1 className={styles.sectionTitleNoMargin}>Заказ #{order.id}</h1>
          <div className={styles.orderDetailsMeta}>
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

      <div className={styles.orderDetailsSummary}>
        <SummaryItem label="Статус заказа" value={formatOrderStatus(order.status)} />
        <SummaryItem label="Оплата" value={formatPaymentStatus(order.paymentStatus)} />
        <SummaryItem label="Доставка" value={formatDeliveryStatus(order.deliveryStatus)} />
        <SummaryItem label="Товаров" value={`${order.items.length}`} />
      </div>

      <div className={styles.orderDetailsLayout}>
        <main className={styles.orderDetailsMain}>
          <section className={styles.orderDetailsSection}>
            <h2 className={styles.orderDetailsSectionTitle}>Товары</h2>

            <div className={styles.orderItemsList}>
              {order.items.map((item, index) => (
                <article key={`${item.sku}-${index}`} className={styles.orderItemRow}>
                  <div className={styles.orderItemImageWrap}>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productTitle}
                        className={styles.orderItemImage}
                      />
                    ) : (
                      <div className={styles.orderItemImagePlaceholder} />
                    )}
                  </div>

                  <div className={styles.orderItemMain}>
                    <div className={styles.orderItemTitle}>{item.productTitle}</div>

                    <div className={styles.orderItemMeta}>
                      <span>SKU: {item.sku}</span>
                      <span>•</span>
                      <span>{item.size}</span>
                      <span>•</span>
                      <span>{item.color}</span>
                    </div>

                    <div className={styles.orderItemMeta}>
                      {item.quantity} × {item.price.toLocaleString()} ₽
                    </div>
                  </div>

                  <div className={styles.orderItemTotal}>
                    {item.lineTotal.toLocaleString()} ₽
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.orderDetailsSection}>
            <h2 className={styles.orderDetailsSectionTitle}>Получатель</h2>

            <div className={styles.orderInfoGrid}>
              <InfoRow label="Имя" value={order.recipientName} />
              <InfoRow label="Телефон" value={order.recipientPhone} />
            </div>
          </section>

          <section className={styles.orderDetailsSection}>
            <h2 className={styles.orderDetailsSectionTitle}>Доставка</h2>

            <div className={styles.orderInfoGrid}>
              <InfoRow label="Способ доставки" value={order.deliveryMethod} />
              <InfoRow label="Адрес / ПВЗ" value={order.deliveryAddress} />

              {order.trackingNumber ? (
                <InfoRow label="Трек-номер" value={order.trackingNumber} />
              ) : null}
            </div>
          </section>
        </main>

        <aside className={styles.orderDetailsAside}>
          <div className={styles.orderStickyPanel}>
            <section className={styles.orderPanelSection}>
              <h2>Информация</h2>

              <div className={styles.orderInfoGrid}>
                <InfoRow label="Номер" value={`#${order.id}`} />
                <InfoRow label="Группа" value={String(order.orderGroupId)} />
                <InfoRow label="Создан" value={new Date(order.createdAt).toLocaleString("ru-RU")} />
              </div>
            </section>

            <section className={styles.orderPanelSection}>
              <h2>Сумма</h2>

              <div className={styles.orderTotals}>
                <InfoRow label="Товары" value={`${order.subtotalAmount.toLocaleString()} ₽`} />
                <InfoRow label="Доставка" value={`${order.deliveryAmount.toLocaleString()} ₽`} />
                <InfoRow label="Скидка" value={`${order.discountAmount.toLocaleString()} ₽`} />

                <div className={styles.orderTotalFinal}>
                  <span>Итого</span>
                  <strong>{order.totalAmount.toLocaleString()} ₽</strong>
                </div>
              </div>
            </section>

            <section className={styles.orderPanelSection}>
              <h2>Действия</h2>

              {canShip ? (
                <button
                  type="button"
                  onClick={onShip}
                  disabled={shipping}
                  className={styles.primaryBtn}
                >
                  {shipping ? "Отмечаем…" : "Отправил"}
                </button>
              ) : (
                <div className={styles.muted}>
                  Для текущего статуса отправка недоступна
                </div>
              )}
            </section>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.orderDetailsSummaryItem}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.orderInfoRow}>
      <span>{label}</span>
      <strong>{value}</strong>
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