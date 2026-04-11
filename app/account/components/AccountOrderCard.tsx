"use client";

import styles from "../Account.module.css";

type OrderItemPreview = {
  imageUrl?: string;
};

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
  return (
    <button type="button" className={styles.orderPreviewCard} onClick={onClick}>
      <div className={styles.orderPreviewTop}>
        <div className={styles.orderStatusBlock}>
          <div className={styles.orderStatusLine}>
            <span className={styles.orderStatus}>{statusLabel}</span>
            <span className={styles.orderDate}>{dateLabel}</span>
          </div>

          <div className={styles.orderNumberSmall}>Заказ #{id}</div>
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