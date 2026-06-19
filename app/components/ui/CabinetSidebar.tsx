import Link from "next/link";
import type { ReactNode } from "react";

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
  subtitle?: string;
  items: SidebarItem[];
  footer?: ReactNode;
  ariaLabel: string;
  mobileInline?: boolean;
};

export function CabinetSidebar({
  title,
  subtitle,
  items,
  footer,
  ariaLabel,
  mobileInline = false,
}: Props) {
  return (
    <aside
      className={`${styles.sidebar} ${mobileInline ? styles.mobileInline : ""}`}
    >
      {title || subtitle ? (
        <div className={styles.head}>
          {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
          {title ? <strong className={styles.title}>{title}</strong> : null}
        </div>
      ) : null}

      <nav className={styles.nav} aria-label={ariaLabel}>
        {items.map((item) => (
          item.href ? (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.item} ${item.active ? styles.itemActive : ""}`}
              aria-current={item.active ? "page" : undefined}
              prefetch={false}
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
              key={item.label}
              type="button"
              className={styles.item}
              onClick={item.onClick}
              disabled={item.disabled}
            >
              <span>
                <span className={styles.desktopLabel}>{item.label}</span>
                <span className={styles.mobileLabel}>
                  {item.mobileLabel ?? item.label}
                </span>
              </span>
            </button>
          )
        ))}
      </nav>

      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </aside>
  );
}
