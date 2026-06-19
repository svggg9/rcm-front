"use client";

import Image from "next/image";

import styles from "./SellerOrderCard.module.css";

import { StatusBadge } from "../../components/ui/StatusBadge";

import type { SellerOrderListItem } from "../types";

type Props = {
  order: SellerOrderListItem;
  statusLabel: string;
  onOpen: (orderId: number) => void;
};

export function SellerOrderCard({
  order,
  statusLabel,
  onOpen,
}: Props) {
  const extraItemsCount = Math.max(order.itemsCount - 1, 0);

  return (
    <article
      className={styles.orderRow}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(order.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(order.id);
        }
      }}
    >
      <div className={styles.orderPreview}>
        {order.firstImageUrl ? (
          <Image
            src={order.firstImageUrl}
            alt=""
            width={90}
            height={112}
            className={styles.orderImage}
          />
        ) : (
          <div className={styles.orderImagePlaceholder} />
        )}

        {extraItemsCount > 0 ? (
          <span className={`${styles.extraItems} textMicro`}>+{extraItemsCount}</span>
        ) : null}
      </div>

      <div className={styles.orderMain}>
        <div className={styles.orderStatus}>
          <StatusBadge tone={getOrderTone(order)}>{statusLabel}</StatusBadge>
        </div>

        <div className={styles.orderInfo}>
          <div className={`${styles.orderNumber} textBody`}>Заказ {order.id}</div>
          <div className={`${styles.orderDate} textCaption`}>
            {new Date(order.createdAt).toLocaleString("ru-RU")}
          </div>
        </div>
      </div>

      <span className={styles.orderArrow} aria-hidden="true">
        &gt;
      </span>
    </article>
  );
}

function getOrderTone(order: SellerOrderListItem) {
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

  if (order.status === "COMPLETED" || order.deliveryStatus === "DELIVERED") {
    return "success";
  }

  return "default";
}
