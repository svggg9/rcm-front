"use client";

import Image from "next/image";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

import { Icon } from "./ui/Icon";
import { Price } from "./ui/Price";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "./ui/StatusBadge";

import styles from "./ProductListCard.module.css";

type Props = {
  id: number;
  title: string;
  imageUrl: string | null;
  brandName?: string | null;
  categoryName?: string | null;
  minPrice?: number | null;
  variantsCount?: number | null;
  totalStock?: number | null;
  statusLabel: string;
  statusTone?: StatusBadgeTone;
  dateLabel?: string | null;
  suggestedCategory?: boolean;
  flushMedia?: boolean;
  actions?: ReactNode;
  onOpen: () => void;
  onPrefetch?: () => void;
};

export function ProductListCard({
  id,
  title,
  imageUrl,
  brandName,
  categoryName,
  minPrice,
  variantsCount,
  totalStock,
  statusLabel,
  statusTone = "default",
  dateLabel,
  suggestedCategory = false,
  flushMedia = false,
  actions,
  onOpen,
  onPrefetch,
}: Props) {
  const displayTitle = title.trim() || "Без названия";
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    },
    []
  );

  function schedulePrefetch() {
    if (!onPrefetch || prefetchTimerRef.current) return;
    prefetchTimerRef.current = setTimeout(() => {
      prefetchTimerRef.current = null;
      onPrefetch();
    }, 180);
  }

  function cancelPrefetch() {
    if (!prefetchTimerRef.current) return;
    clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (target.closest("button, a, input, select, textarea")) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <article
      className={`${styles.card} ${flushMedia ? styles.cardFlushMedia : ""}`.trim()}
      onMouseEnter={schedulePrefetch}
      onMouseLeave={cancelPrefetch}
    >
      <div
        className={styles.main}
        role="button"
        tabIndex={0}
        aria-label={`Открыть товар «${displayTitle}»`}
        onClick={onOpen}
        onFocus={() => {
          cancelPrefetch();
          onPrefetch?.();
        }}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.media}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={displayTitle}
              fill
              sizes={flushMedia ? "(max-width: 640px) 84px, 100px" : "(max-width: 640px) 72px, 82px"}
              className={styles.image}
            />
          ) : (
            <span className={styles.imagePlaceholder}>Нет изображения</span>
          )}
        </div>

        <div className={styles.identity}>
          <span className={styles.label}>Товар</span>
          <strong className={styles.title}>{displayTitle}</strong>
          <span className={styles.meta}>
            <span>ID {id}</span>
            {brandName ? <span>{brandName}</span> : null}
            {categoryName ? (
              <span className={suggestedCategory ? styles.suggested : undefined}>
                {categoryName}
              </span>
            ) : null}
          </span>
        </div>

        <div className={styles.facts}>
          <ProductFact label="Цена">
            <Price amount={Number(minPrice ?? 0)} />
          </ProductFact>
          <ProductFact label="Варианты">
            {formatVariantsCount(variantsCount ?? 0)}
          </ProductFact>
          <ProductFact label="Остаток">
            {totalStock === null
              ? "Без лимита"
              : Number(totalStock ?? 0).toLocaleString("ru-RU")}
          </ProductFact>
        </div>

        <div className={styles.state}>
          <span className={styles.label}>Статус</span>
          <StatusBadge tone={statusTone} size="regular">
            {statusLabel}
          </StatusBadge>
          {dateLabel ? <span className={styles.date}>{dateLabel}</span> : null}
        </div>

        <span className={styles.chevron} aria-hidden="true">
          <Icon name="chevron-right" size={18} strokeWidth={1.5} />
        </span>
      </div>

      {actions ? (
        <div className={styles.actions}>
          {actions}
        </div>
      ) : null}
    </article>
  );
}

function ProductFact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className={styles.fact}>
      <span className={styles.label}>{label}</span>
      <strong>{children}</strong>
    </span>
  );
}

function formatVariantsCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return `${count} вариант`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} варианта`;
  }
  return `${count} вариантов`;
}
