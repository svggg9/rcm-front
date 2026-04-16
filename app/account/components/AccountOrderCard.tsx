"use client";

import styles from "../Account.module.css";

import type { OrderItemPreview } from "../types";

type Props = {
  id: number;
  statusLabel: string;
  dateLabel: string;
  amountLabel: string;
  items: OrderItemPreview[];
  deliveryMethod?: string | null;
  deliveryShipmentStatus?: string | null;
  deliveryPriceAmount?: number | null;
  onClick: () => void;
};

function formatDeliveryMethod(value?: string | null): string {
  if (value === "PICKUP_POINT") return "ПВЗ";
  if (value === "COURIER") return "Курьер";
  return value || "—";
}

function formatShipmentStatus(value?: string | null): string {
  switch (value) {
    case "NEW":
      return "Новая";
    case "CREATED":
      return "Создана";
    case "PROCESSING":
      return "В обработке";
    case "READY_FOR_PICKUP":
      return "Готова к выдаче";
    case "IN_TRANSIT":
      return "В пути";
    case "DELIVERED":
      return "Доставлена";
    case "CANCELLED":
      return "Отменена";
    case "FAILED":
      return "Ошибка";
    default:
      return value || "—";
  }
}

export function AccountOrderCard({
  id,
  statusLabel,
  dateLabel,
  amountLabel,
  items,
  deliveryMethod,
  deliveryShipmentStatus,
  deliveryPriceAmount,
  onClick,
}: Props) {
  return (
    <button type="button" className={styles.orderPreviewCard} onClick={onClick}>
      <div className={styles.orderPreviewTop}>
        <div className={styles.orderStatusBlock}>
          <div className={styles.orderStatusLine}>
            <span className={styles.orderStatus}>{statusLabel}</span>
            <span className={styles.orderDate}>{dateLabel}</span>
          </div>

          <div className={styles.orderNumberSmall}>Заказ #{id}</div>

          {(deliveryMethod || deliveryShipmentStatus) && (
            <div
              className={styles.orderDate}
              style={{ marginTop: "6px", display: "flex", gap: "10px", flexWrap: "wrap" }}
            >
              {deliveryMethod ? (
                <span>Доставка: {formatDeliveryMethod(deliveryMethod)}</span>
              ) : null}
              {deliveryShipmentStatus ? (
                <span
                  className={`${styles.deliveryBadge} ${
                    deliveryShipmentStatus === "DELIVERED"
                      ? styles.deliveryBadgeSuccess
                      : deliveryShipmentStatus === "IN_TRANSIT"
                      ? styles.deliveryBadgeInfo
                      : styles.deliveryBadgeDefault
                  }`}
                >
                  {formatShipmentStatus(deliveryShipmentStatus)}
                </span>
              ) : null}
              {typeof deliveryPriceAmount === "number" ? (
                <span>{deliveryPriceAmount.toLocaleString("ru-RU")} ₽</span>
              ) : null}
            </div>
          )}
        </div>

        <div className={styles.orderArrow}>›</div>
      </div>

      <div className={styles.orderPreviewBottom}>
        <div className={styles.orderImages}>
          {items.length > 0 ? (
            items.slice(0, 4).map((item, index) => (
              <div
                key={`${item.imageUrl ?? "placeholder"}-${index}`}
                className={styles.orderImageWrap}
              >
                <img
                  src={item.imageUrl || "/placeholder.png"}
                  alt=""
                  className={styles.orderImage}
                />
              </div>
            ))
          ) : (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className={styles.orderImageWrap}>
                <div className={styles.orderImagePlaceholder} />
              </div>
            ))
          )}
        </div>

        <div className={styles.orderAmountInline}>{amountLabel}</div>
      </div>
    </button>
  );
}