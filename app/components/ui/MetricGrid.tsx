import type { ReactNode } from "react";
import styles from "./MetricGrid.module.css";

export function MetricGrid({ items, ariaLabel }: { items: { label: string; value: ReactNode; hint?: string }[]; ariaLabel: string }) {
  return <dl className={styles.grid} aria-label={ariaLabel}>{items.map(item => <div key={item.label} className={styles.metric}>
    <dt>{item.label}</dt><dd><strong className={styles.value}>{item.value}</strong>{item.hint && <span className="textHint">{item.hint}</span>}</dd>
  </div>)}</dl>;
}
