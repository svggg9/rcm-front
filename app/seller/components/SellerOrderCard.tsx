"use client";

import styles from "./SellerOrderCard.module.css";

import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";

import type { SellerOrderListItem } from "../types";

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
        <Button
          variant="secondary"
          onClick={() => onShip(order.id)}
          disabled={shipping || !canShip}
        >
          {shipping ? "Отмечаем…" : "Отправил"}
        </Button>

        <Button variant="primary" onClick={() => onOpen(order.id)}>
          Открыть
        </Button>
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