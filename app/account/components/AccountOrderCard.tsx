"use client";

import Image from "next/image";

import { StatusBadge } from "../../components/ui/StatusBadge";
import styles from "../Account.module.css";

type Props = {
  id: number;
  statusLabel: string;
  dateLabel: string;
  amountLabel: string;
  firstImageUrl: string | null;
  itemsCount: number;
  onClick: () => void;
};

export function AccountOrderCard({
  id,
  statusLabel,
  dateLabel,
  amountLabel,
  firstImageUrl,
  itemsCount,
  onClick,
}: Props) {

  return (
    <button type="button" className={styles.orderPreviewCard} onClick={onClick}>
      <div className={styles.orderPreviewMain}>
        <div className={styles.orderStatusLine}>
          <StatusBadge>{statusLabel}</StatusBadge>
          <span className={styles.orderDate}>{dateLabel}</span>
        </div>

        <div className={styles.orderNumberSmall}>Заказ #{id}</div>
      </div>

      <div className={styles.orderPreviewImages}>
        <div className={styles.orderImageWrap}>
          {firstImageUrl ? (
            <Image
              src={firstImageUrl}
              alt=""
              width={52}
              height={68}
              className={styles.orderImage}
            />
          ) : (
            <div className={styles.orderImagePlaceholder} />
          )}
        </div>

        {itemsCount > 1 ? (
          <div className={styles.orderMoreItems}>+{itemsCount - 1}</div>
        ) : null}
      </div>

      <div className={styles.orderPreviewMeta}>
        <div className={styles.orderAmountInline}>{amountLabel}</div>
        <div className={styles.orderOpenLabel}>Открыть</div>
      </div>
    </button>
  );
}