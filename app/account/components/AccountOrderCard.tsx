"use client";

import styles from "../Account.module.css";

import type { OrderItemPreview } from "../types";

type Props = {
  id: number;
  statusLabel: string;
  dateLabel: string;
  amountLabel: string;
  items: OrderItemPreview[];
  onClick: () => void;
};

export function AccountOrderCard({
  id,
  statusLabel,
  dateLabel,
  amountLabel,
  items,
  onClick,
}: Props) {
  const visibleItems = items.slice(0, 3);
  const hiddenCount = Math.max(items.length - visibleItems.length, 0);

  return (
    <button type="button" className={styles.orderPreviewCard} onClick={onClick}>
      <div className={styles.orderPreviewMain}>
        <div className={styles.orderStatusLine}>
          <span className={styles.orderStatus}>{statusLabel}</span>
          <span className={styles.orderDate}>{dateLabel}</span>
        </div>

        <div className={styles.orderNumberSmall}>Заказ #{id}</div>
      </div>

      <div className={styles.orderPreviewImages}>
        {visibleItems.length > 0 ? (
          visibleItems.map((item, index) => (
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
          <div className={styles.orderImageWrap}>
            <div className={styles.orderImagePlaceholder} />
          </div>
        )}

        {hiddenCount > 0 ? (
          <div className={styles.orderMoreItems}>+{hiddenCount}</div>
        ) : null}
      </div>

      <div className={styles.orderPreviewMeta}>
        <div className={styles.orderAmountInline}>{amountLabel}</div>
        <div className={styles.orderOpenLabel}>Открыть</div>
      </div>
    </button>
  );
}