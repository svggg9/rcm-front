"use client";

import { Button } from "./Button";

import styles from "./ListLoadMore.module.css";

type Props = {
  loaded: number;
  total: number;
  loading?: boolean;
  onLoadMore?: () => void;
  label?: string;
};

export function ListLoadMore({
  loaded,
  total,
  loading = false,
  onLoadMore,
  label = "Показать ещё",
}: Props) {
  const safeLoaded = Math.max(0, loaded);
  const safeTotal = Math.max(safeLoaded, total);

  if (!onLoadMore || safeLoaded >= safeTotal) return null;

  return (
    <div className={styles.root}>
      <span className={styles.counter}>
        Показано {safeLoaded} из {safeTotal}
      </span>
      <Button
        type="button"
        variant="secondary"
        loading={loading}
        onClick={onLoadMore}
        className={styles.button}
      >
        {label}
      </Button>
    </div>
  );
}
