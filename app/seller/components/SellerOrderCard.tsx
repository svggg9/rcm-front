"use client";

import styles from "../Seller.module.css";

import type { SellerOrderListItem } from "../types";
import { StatusBadge } from "../../components/ui/StatusBadge";

type Props = {
  order: SellerOrderListItem;
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

          <StatusBadge tone={getOrderTone(order)}>{statusLabel}</StatusBadge>
        </div>

        <div className={styles.orderMeta}>
          <span>{new Date(order.createdAt).toLocaleString("ru-RU")}</span>
          <span>•</span>
          <span>{order.recipientName}</span>
          <span>•</span>
          <span>{order.itemsCount} шт.</span>
        </div>

        {order.firstProductTitle ? (
          <div className={styles.orderProductLine}>
            {order.firstProductTitle}
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

function getOrderTone(order: SellerOrderListItem) {
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