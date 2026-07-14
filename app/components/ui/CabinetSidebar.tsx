"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { Icon, type IconName } from "./Icon";
import styles from "./CabinetSidebar.module.css";

type SidebarItem = {
  href?: string;
  label: string;
  mobileLabel?: string;
  icon?: IconName;
  active?: boolean;
  count?: number;
  action?: {
    label: string;
    mobileLabel?: string;
    onClick: () => void;
    disabled?: boolean;
  };
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
          {subtitle ? <div className={`${styles.subtitle} textMicro`}>{subtitle}</div> : null}
          {titleLoading ? (
            <div className={styles.titleSkeleton} aria-hidden="true" />
          ) : title ? (
            <strong className={`${styles.title} textSectionTitle`}>{title}</strong>
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
            <div key={itemKey} className={styles.itemRow}>
              <Link
                href={item.href}
                className={`${styles.item} textSmall ${item.action ? styles.itemWithAction : ""} ${isActive ? styles.itemActive : ""}`}
                aria-current={isActive ? "page" : undefined}
                prefetch={false}
                onClick={() => setPendingActiveKey(itemKey)}
              >
                {item.icon ? (
                  <Icon name={item.icon} size={17} className={styles.itemIcon} />
                ) : null}

                <span className={styles.labelWrap}>
                  <span className={styles.desktopLabel}>{item.label}</span>
                  <span className={styles.mobileLabel}>
                    {item.mobileLabel ?? item.label}
                  </span>
                </span>

                {typeof item.count === "number" && item.count > 0 ? (
                  <span className={`${styles.count} textMicro`}>{item.count}</span>
                ) : null}
              </Link>

              {item.action ? (
                <button
                  type="button"
                  className={`${styles.itemAction} textMicro`}
                  onClick={item.action.onClick}
                  disabled={item.action.disabled}
                aria-label={item.action.label}
                title={item.action.label}
              >
                {item.action.mobileLabel === "+" || !item.action.mobileLabel ? (
                  <Icon name="plus" size={15} />
                ) : (
                  <span aria-hidden="true">{item.action.mobileLabel}</span>
                )}
              </button>
              ) : null}
            </div>
          ) : (
            <button
              key={itemKey}
              type="button"
              className={`${styles.item} textSmall ${isActive ? styles.itemActive : ""}`}
              onClick={() => {
                item.onClick?.();
              }}
              disabled={item.disabled}
            >
              {item.icon ? (
                <Icon name={item.icon} size={17} className={styles.itemIcon} />
              ) : null}

              <span className={styles.labelWrap}>
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
