"use client";

import Image from "next/image";

import { StatusBadge } from "../../components/ui/StatusBadge";
import styles from "./AccountOrderCard.module.css";

import type { OrderListItem } from "../types";

type Props = {
  order: OrderListItem;
  statusLabel: string;
  onClick: () => void;
};

export function AccountOrderCard({
  order,
  statusLabel,
  onClick,
}: Props) {
  const extraItemsCount = Math.max(order.itemsCount - 1, 0);

  return (
    <article
      className={styles.orderRow}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className={styles.orderPreview}>
        {order.firstImageUrl ? (
          <Image
            src={order.firstImageUrl}
            alt=""
            width={48}
            height={64}
            className={styles.orderImage}
          />
        ) : (
          <div className={styles.orderImagePlaceholder} />
        )}

        {extraItemsCount > 0 ? (
          <span className={styles.extraItems}>+{extraItemsCount}</span>
        ) : null}
      </div>

      <div className={styles.orderMain}>
        <div className={styles.orderTitle}>Заказ #{order.id}</div>
        <div className={styles.orderMeta}>
          <span>{new Date(order.createdAt).toLocaleString("ru-RU")}</span>
          <span>•</span>
          <span>{order.orderGroupId}</span>
        </div>
      </div>

      <div className={styles.orderProducts}>
        {order.firstProductTitle ? (
          <div className={styles.orderProductLine}>{order.firstProductTitle}</div>
        ) : null}

        <div className={styles.orderItemsCount}>
          {order.itemsCount} шт. в заказе
        </div>
      </div>

      <div className={styles.orderAmount}>
        {order.totalAmount.toLocaleString()} ₽
      </div>

      <div className={styles.orderStatus}>
        <StatusBadge tone={getOrderTone(order)}>{statusLabel}</StatusBadge>
      </div>
    </article>
  );
}

function getOrderTone(order: OrderListItem) {
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
