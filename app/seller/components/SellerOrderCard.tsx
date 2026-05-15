"use client";

import styles from "../Seller.module.css";

import type { SellerOrder } from "../types";

type Props = {
  order: SellerOrder;
  shipping: boolean;
  canShip: boolean;
  statusLabel: string;
  onShip: (orderId: number) => void;
  onOpen: (orderId: number) => void;
};

export function SellerOrderCard({
  order,
  shipping,
  canShip,
  statusLabel,
  onShip,
  onOpen,
}: Props) {
  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const firstItem = order.items[0];

  return (
    <article className={styles.orderRow}>
      <div className={styles.orderMain}>
        <div className={styles.orderTitleRow}>
          <button
            type="button"
            onClick={() => onOpen(order.id)}
            className={styles.orderTitleBtn}
          >
            Заказ #{order.id}
          </button>

          <span className={styles.orderStatus}>{statusLabel}</span>
        </div>

        <div className={styles.orderMeta}>
          <span>{new Date(order.createdAt).toLocaleString("ru-RU")}</span>
          <span>•</span>
          <span>{order.recipientName}</span>
          <span>•</span>
          <span>{itemsCount} шт.</span>
        </div>

        {firstItem ? (
          <div className={styles.orderProductLine}>
            {firstItem.productTitle}
            {order.items.length > 1 ? ` + ещё ${order.items.length - 1}` : ""}
          </div>
        ) : null}
      </div>

      <div className={styles.orderAmount}>
        {order.totalAmount.toLocaleString()} ₽
      </div>

      <div className={styles.orderActions}>
        <button
          type="button"
          onClick={() => onShip(order.id)}
          disabled={shipping || !canShip}
          className={styles.secondaryBtn}
        >
          {shipping ? "Отмечаем…" : "Отправил"}
        </button>

        <button
          type="button"
          onClick={() => onOpen(order.id)}
          className={styles.primaryBtn}
        >
          Открыть
        </button>
      </div>
    </article>
  );
}