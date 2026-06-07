import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./CabinetSidebar.module.css";

type SidebarItem = {
  href: string;
  label: string;
  active?: boolean;
  count?: number;
};

type Props = {
  title?: string;
  subtitle?: string;
  items: SidebarItem[];
  footer?: ReactNode;
  ariaLabel: string;
};

export function CabinetSidebar({
  title,
  subtitle,
  items,
  footer,
  ariaLabel,
}: Props) {
  return (
    <aside className={styles.sidebar}>
      {title || subtitle ? (
        <div className={styles.head}>
          {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
          {title ? <strong className={styles.title}>{title}</strong> : null}
        </div>
      ) : null}

      <nav className={styles.nav} aria-label={ariaLabel}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${item.active ? styles.itemActive : ""}`}
            aria-current={item.active ? "page" : undefined}
            prefetch={false}
          >
            <span>{item.label}</span>

            {typeof item.count === "number" ? (
              <span className={styles.count}>{item.count}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </aside>
  );
}