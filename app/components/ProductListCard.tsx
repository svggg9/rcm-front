"use client";

import Image from "next/image";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

import { Icon } from "./ui/Icon";
import { Price } from "./ui/Price";
import { SortIndicator } from "./ui/SortIndicator";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "./ui/StatusBadge";

import styles from "./ProductListCard.module.css";
import { formatProductCreatedAt, nextProductSort, type ProductSort, type ProductSortKey } from "../seller/lib/sellerProductSort";

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
  createdAt?: string | null;
  suggestedCategory?: boolean;
  flushMedia?: boolean;
  appearance?: "default" | "order-list";
  columnLabels?: boolean;
  actions?: ReactNode;
  leadingControl?: ReactNode;
  trailingControl?: ReactNode;
  selected?: boolean;
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
  createdAt,
  suggestedCategory = false,
  flushMedia = false,
  appearance = "default",
  columnLabels = false,
  actions,
  leadingControl,
  trailingControl,
  selected = false,
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
      className={`${styles.card} ${flushMedia ? styles.cardFlushMedia : ""} ${
        appearance === "order-list" ? styles.cardOrderList : ""
      } ${leadingControl || trailingControl ? styles.cardWithControls : ""} ${columnLabels ? styles.columnLabels : ""} ${selected ? styles.cardSelected : ""}`.trim()}
      onMouseEnter={schedulePrefetch}
      onMouseLeave={cancelPrefetch}
    >
      {leadingControl ? <div className={styles.leadingControl}>{leadingControl}</div> : null}
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
          {appearance === "default" ? (
            <span className={styles.label}>Товар</span>
          ) : null}
          <strong className={styles.title}>{displayTitle}</strong>
          <span className={styles.meta}>
            {appearance === "default" ? <span>ID {id}</span> : null}
            {brandName ? <span>{brandName}</span> : null}
            {categoryName ? (
              <span className={suggestedCategory ? styles.suggested : undefined}>
                {categoryName}
              </span>
            ) : null}
          </span>
        </div>

        {columnLabels ? <div className={styles.state}>
          <span className={styles.label}>Статус</span>
          <StatusBadge tone={statusTone} size="regular">{statusLabel}</StatusBadge>
          {dateLabel ? <span className={styles.date}>{dateLabel}</span> : null}
        </div> : null}

        <div className={styles.facts}>
          <ProductFact label="Цена">
            <Price amount={Number(minPrice ?? 0)} />
          </ProductFact>
          {!columnLabels ? <ProductFact label="Варианты">
            {formatVariantsCount(variantsCount ?? 0)}
          </ProductFact> : null}
          <ProductFact label="Остаток">
            {totalStock === null
              ? "Без лимита"
              : Number(totalStock ?? 0).toLocaleString("ru-RU")}
          </ProductFact>
        </div>

        {!columnLabels ? <div className={styles.state}>
          <span className={styles.label}>Статус</span>
          <StatusBadge tone={statusTone} size="regular">
            {statusLabel}
          </StatusBadge>
          {dateLabel ? <span className={styles.date}>{dateLabel}</span> : null}
        </div> : null}

        {columnLabels ? <div className={styles.added}>
          <ProductFact label="Добавлен">{formatProductCreatedAt(createdAt)}</ProductFact>
        </div> : null}

        {!trailingControl ? <span className={styles.chevron} aria-hidden="true">
          <Icon name="chevron-right" size={18} strokeWidth={1.5} />
        </span> : null}
      </div>

      {trailingControl ? <div className={styles.trailingControl}>{trailingControl}</div> : null}

      {actions ? (
        <div className={styles.actions}>
          {actions}
        </div>
      ) : null}
    </article>
  );
}

export function ProductListHeader({ sort, onSort, disabled = false, leadingControl }: {
  sort: ProductSort | null;
  onSort: (key: ProductSortKey) => void;
  disabled?: boolean;
  leadingControl?: ReactNode;
}) {
  function heading(key: ProductSortKey, label: string) {
    const active = sort?.key === key;
    return <button type="button" className={`${styles.sortButton} ${key === "minPrice" || key === "totalStock" || key === "createdAt" ? styles.mutedColumn : ""}`} disabled={disabled}
      aria-label={`${label}: ${active ? (sort.direction === "asc" ? "по возрастанию" : "по убыванию") : "без сортировки"}. Сортировать ${nextProductSort(sort, key).direction === "desc" ? "по убыванию" : "по возрастанию"}`}
      onClick={() => onSort(key)}>
      {label}
      <SortIndicator direction={active ? sort.direction : null} />
    </button>;
  }
  return (
    <div className={`${styles.listHeader} ${styles.cardOrderList} ${styles.cardWithControls}`} role="group" aria-label="Сортировка товаров">
      {leadingControl ?? <span />}
      <div className={styles.main}>
        <span className={styles.photoHeading}>Фото</span>
        {heading("title", "Название")}
        {heading("status", "Статус")}
        <div className={styles.facts}>
          {heading("minPrice", "Цена")}
          {heading("totalStock", "Остаток")}
        </div>
        {heading("createdAt", "Добавлен")}
      </div>
      <span />
    </div>
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
