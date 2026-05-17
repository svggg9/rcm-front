"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./DashboardTabs.module.css";

type DashboardTab = {
  href: string;
  label: string;
  active: boolean;
  count?: number;
};

type Props = {
  tabs: DashboardTab[];
  actions?: ReactNode;
  ariaLabel: string;
};

export function DashboardTabs({ tabs, actions, ariaLabel }: Props) {
  return (
    <div className={styles.wrap}>
      <nav className={styles.tabs} aria-label={ariaLabel}>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${tab.active ? styles.tabActive : ""}`}
            aria-current={tab.active ? "page" : undefined}
            prefetch={false}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" ? (
              <span className={styles.count}>{tab.count}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}