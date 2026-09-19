"use client";

import { useRef } from "react";
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
  tone?: "muted" | "gold";
  appearance?: "filled" | "line" | "segmented" | "text" | "panel";
  idPrefix?: string;
  panelId?: string;
  disabled?: boolean;
};

export function CabinetTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  fullBleedMobile = false,
  pinFirst = false,
  tone = "muted",
  appearance = "filled",
  idPrefix,
  panelId,
  disabled = false,
}: Props<T>) {
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const pinnedItem = pinFirst ? items[0] : null;
  const scrollItems = pinFirst ? items.slice(1) : items;

  function renderItem(item: CabinetTabItem<T>) {
    const active = item.value === value;

    return (
      <button
        key={item.value}
        type="button"
        role="tab"
        id={idPrefix ? `${idPrefix}-${item.value}` : undefined}
        aria-controls={panelId}
        aria-selected={active}
        disabled={disabled}
        tabIndex={appearance === "panel" ? (active ? 0 : -1) : undefined}
        ref={node => {
          if (node) tabRefs.current.set(item.value, node);
          else tabRefs.current.delete(item.value);
        }}
        className={`${styles.item} textSmall ${active ? styles.itemActive : ""}`}
        onClick={() => onChange(item.value)}
        onKeyDown={event => {
          if (appearance !== "panel" || disabled) return;
          const index = items.findIndex(candidate => candidate.value === item.value);
          let nextIndex: number;
          if (event.key === "ArrowRight") nextIndex = (index + 1) % items.length;
          else if (event.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
          else if (event.key === "Home") nextIndex = 0;
          else if (event.key === "End") nextIndex = items.length - 1;
          else return;
          event.preventDefault();
          const next = items[nextIndex];
          tabRefs.current.get(next.value)?.focus();
          if (next.value !== value) onChange(next.value);
        }}
      >
        <span className={styles.label}>{item.label}</span>
      </button>
    );
  }

  return (
    <div
      className={`${styles.root} ${
        fullBleedMobile ? styles.fullBleedMobile : ""
      } ${tone === "gold" ? styles.gold : ""} ${
        appearance === "line" ? styles.line : ""
      } ${
        appearance === "segmented" ? styles.segmented : ""
      } ${appearance === "text" ? styles.text : ""} ${appearance === "panel" ? styles.panel : ""}`.trim()}
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
