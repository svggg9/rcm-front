"use client";

import styles from "./CabinetTabs.module.css";

export type CabinetTabItem<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

type Props<T extends string> = {
  items: CabinetTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  fullBleedMobile?: boolean;
  pinFirst?: boolean;
  countTone?: "black" | "gold";
  tone?: "muted" | "gold";
  appearance?: "filled" | "line";
};

export function CabinetTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  fullBleedMobile = false,
  pinFirst = false,
  countTone = "black",
  tone = "muted",
  appearance = "filled",
}: Props<T>) {
  const pinnedItem = pinFirst ? items[0] : null;
  const scrollItems = pinFirst ? items.slice(1) : items;

  function renderItem(item: CabinetTabItem<T>) {
    const active = item.value === value;

    return (
      <button
        key={item.value}
        type="button"
        role="tab"
        aria-selected={active}
        className={`${styles.item} textSmall ${active ? styles.itemActive : ""}`}
        onClick={() => onChange(item.value)}
      >
        <span className={styles.label}>{item.label}</span>

        {typeof item.count === "number" ? (
          <span
            className={`${styles.count} textMicro ${
              countTone === "gold" ? styles.countGold : ""
            }`.trim()}
          >
            {item.count}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div
      className={`${styles.root} ${
        fullBleedMobile ? styles.fullBleedMobile : ""
      } ${tone === "gold" ? styles.gold : ""} ${
        appearance === "line" ? styles.line : ""
      }`.trim()}
    >
      <div
        className={`${styles.shell} ${pinnedItem ? styles.shellPinned : ""}`}
        role="tablist"
        aria-label={ariaLabel}
      >
        {pinnedItem ? (
          <div className={styles.pinned}>{renderItem(pinnedItem)}</div>
        ) : null}

        <div className={styles.scroller}>
          <div className={styles.list}>
            {scrollItems.map((item) => renderItem(item))}
          </div>
        </div>
      </div>
    </div>
  );
}
