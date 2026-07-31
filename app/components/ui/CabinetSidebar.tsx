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
  titleIcon?: IconName;
  titleBadge?: string;
  titleLoading?: boolean;
  subtitle?: string;
  items: SidebarItem[];
  footer?: ReactNode;
  ariaLabel: string;
  mobileInline?: boolean;
  onNavigate?: (href: string) => void;
};

export function CabinetSidebar({
  title,
  titleIcon,
  titleBadge,
  titleLoading = false,
  subtitle,
  items,
  footer,
  ariaLabel,
  mobileInline = false,
  onNavigate,
}: Props) {
  const activeItem = items.find((item) => item.active);
  const activeItemKey = activeItem ? getItemKey(activeItem) : null;
  const [pendingNavigation, setPendingNavigation] = useState<{
    from: string | null;
    to: string;
  } | null>(null);
  const pendingActiveKey =
    pendingNavigation?.from === activeItemKey ? pendingNavigation.to : null;

  return (
    <aside
      className={`${styles.sidebar} ${mobileInline ? styles.mobileInline : ""}`}
      onMouseLeave={() => setPendingNavigation(null)}
    >
      {title || subtitle ? (
        <div className={styles.head}>
          {subtitle ? <div className={`${styles.subtitle} textMicro`}>{subtitle}</div> : null}
          {titleLoading ? (
            <div className={styles.titleSkeleton} aria-hidden="true" />
          ) : title ? (
            <div className={styles.identity}>
              {titleIcon ? (
                <Icon
                  name={titleIcon}
                  size={28}
                  strokeWidth={1.25}
                  className={styles.identityIcon}
                />
              ) : null}
              <div className={styles.identityContent}>
                <strong className={`${styles.title} textSectionTitle`}>{title}</strong>
                {titleBadge ? (
                  <span className={styles.titleBadge}>{titleBadge}</span>
                ) : null}
              </div>
            </div>
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
                onClick={(event) => {
                  setPendingNavigation({ from: activeItemKey, to: itemKey });
                  if (onNavigate) {
                    event.preventDefault();
                    onNavigate(item.href!);
                  }
                }}
              >
                <span className={styles.labelWrap}>
                  <span className={styles.desktopLabel}>{item.label}</span>
                  <span className={styles.mobileLabel}>
                    {item.mobileLabel ?? item.label}
                  </span>
                </span>

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
