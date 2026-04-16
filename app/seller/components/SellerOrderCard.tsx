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
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div>
          <div className={styles.cardTitle}>Заказ #{order.id}</div>
          <div className={styles.muted}>
            {new Date(order.createdAt).toLocaleString("ru-RU")} · {statusLabel}
          </div>
        </div>

        <div className={styles.total}>{order.totalAmount.toLocaleString()} ₽</div>
      </div>

      <div className={styles.items}>
        {order.items.map((item, index) => (
          <div key={`${item.sku}-${index}`} className={styles.itemRow}>
            <div className={styles.itemMeta}>
              <div>{item.productTitle}</div>
              <div className={styles.muted}>
                {item.size} / {item.color} — {item.quantity} ×{" "}
                {item.price.toLocaleString()} ₽
              </div>
            </div>

            <div className={styles.lineTotal}>
              {item.lineTotal.toLocaleString()} ₽
            </div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => onShip(order.id)}
          disabled={shipping || !canShip}
          className={styles.primaryBtn}
        >
          {shipping ? "Отмечаем…" : "Отправил"}
        </button>

        <button
          type="button"
          onClick={() => onOpen(order.id)}
          className={styles.secondaryBtn}
        >
          Открыть
        </button>
      </div>
    </div>
  );
}