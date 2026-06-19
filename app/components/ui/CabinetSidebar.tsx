"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import styles from "./CabinetSidebar.module.css";

type SidebarItem = {
  href?: string;
  label: string;
  mobileLabel?: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  disabled?: boolean;
};

type Props = {
  title?: string;
  titleLoading?: boolean;
  subtitle?: string;
  items: SidebarItem[];
  footer?: ReactNode;
  ariaLabel: string;
  mobileInline?: boolean;
};

export function CabinetSidebar({
  title,
  titleLoading = false,
  subtitle,
  items,
  footer,
  ariaLabel,
  mobileInline = false,
}: Props) {
  const [pendingActiveKey, setPendingActiveKey] = useState<string | null>(null);

  return (
    <aside
      className={`${styles.sidebar} ${mobileInline ? styles.mobileInline : ""}`}
      onMouseLeave={() => setPendingActiveKey(null)}
    >
      {title || subtitle ? (
        <div className={styles.head}>
          {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
          {titleLoading ? (
            <div className={styles.titleSkeleton} aria-hidden="true" />
          ) : title ? (
            <strong className={styles.title}>{title}</strong>
          ) : null}
        </div>
      ) : null}

      <nav className={styles.nav} aria-label={ariaLabel}>
        {items.map((item) => {
          const itemKey = getItemKey(item);
          const isActive = pendingActiveKey
            ? pendingActiveKey === itemKey
            : item.active;

          return item.href ? (
            <Link
              key={itemKey}
              href={item.href}
              className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
              aria-current={isActive ? "page" : undefined}
              prefetch={false}
              onClick={() => setPendingActiveKey(itemKey)}
            >
              <span>
                <span className={styles.desktopLabel}>{item.label}</span>
                <span className={styles.mobileLabel}>
                  {item.mobileLabel ?? item.label}
                </span>
              </span>

              {typeof item.count === "number" && item.count > 0 ? (
                <span className={styles.count}>{item.count}</span>
              ) : null}
            </Link>
          ) : (
            <button
              key={itemKey}
              type="button"
              className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
              onClick={() => {
                item.onClick?.();
              }}
              disabled={item.disabled}
            >
              <span>
                <span className={styles.desktopLabel}>{item.label}</span>
                <span className={styles.mobileLabel}>
                  {item.mobileLabel ?? item.label}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </aside>
  );
}

function getItemKey(item: SidebarItem) {
  return item.href ?? item.label;
}
