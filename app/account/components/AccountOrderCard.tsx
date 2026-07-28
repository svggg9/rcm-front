"use client";

import { StatusBadge } from "../../components/ui/StatusBadge";
import styles from "./AccountOrderCard.module.css";

import type { OrderListItem } from "../types";

type Props = {
  order: OrderListItem;
  statusLabel: string;
  onClick: () => void;
  onPrefetch?: () => void;
};

export function AccountOrderCard({
  order,
  statusLabel,
  onClick,
  onPrefetch,
}: Props) {
  const productTitles =
    order.productTitles && order.productTitles.length > 0
      ? order.productTitles.slice(0, 4)
      : order.firstProductTitle
        ? [order.firstProductTitle]
        : [];

  return (
    <article
      className={styles.orderRow}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className={styles.orderMain}>
        <div className={styles.orderContent}>
          <div className={styles.orderDetails}>
            <div className={styles.orderInfo}>
              <div className={styles.orderNumber}>Заказ {order.id}</div>
              <div className={styles.orderDate}>
                {new Date(order.createdAt).toLocaleString("ru-RU")}
              </div>
            </div>

            <div className={styles.orderStatus}>
              <StatusBadge tone={getOrderTone(order)}>{statusLabel}</StatusBadge>
            </div>
          </div>

          <div className={styles.orderMeta}>
            <div>{formatItemsCount(order.itemsCount)}</div>
            {productTitles.length > 0 ? (
              <div className={styles.orderProducts}>
                {productTitles.map((title, index) => (
                  <div className={styles.orderProduct} key={`${title}-${index}`}>
                    {title}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function formatItemsCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return `${count} товар`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} товара`;
  }

  return `${count} товаров`;
}

function getOrderTone(order: OrderListItem) {
  if (
    order.status === "CANCELED" ||
    order.paymentStatus === "FAILED" ||
    order.paymentStatus === "CANCELED" ||
    order.paymentStatus === "REFUNDED" ||
    order.deliveryStatus === "RETURNED" ||
    order.deliveryStatus === "CANCELLED"
  ) {
    return "danger";
  }

  if (order.paymentStatus === "PENDING") return "warning";
  return "success";
}
