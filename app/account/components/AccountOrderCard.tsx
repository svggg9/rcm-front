"use client";

import Image from "next/image";

import { StatusBadge } from "../../components/ui/StatusBadge";
import styles from "./AccountOrderCard.module.css";

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
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.main}>
        <div className={styles.statusLine}>
          <StatusBadge>{statusLabel}</StatusBadge>
          <span className={styles.date}>{dateLabel}</span>
        </div>

        <div className={styles.number}>Заказ #{id}</div>
      </div>

      <div className={styles.images}>
        <div className={styles.imageWrap}>
          {firstImageUrl ? (
            <Image
              src={firstImageUrl}
              alt=""
              width={52}
              height={68}
              className={styles.image}
            />
          ) : (
            <div className={styles.imagePlaceholder} />
          )}
        </div>

        {itemsCount > 1 ? (
          <div className={styles.moreItems}>+{itemsCount - 1}</div>
        ) : null}
      </div>

      <div className={styles.meta}>
        <div className={styles.amount}>{amountLabel}</div>
        <div className={styles.openLabel}>Открыть</div>
      </div>
    </button>
  );
}