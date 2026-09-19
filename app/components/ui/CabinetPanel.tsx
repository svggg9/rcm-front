"use client";

import { useId, type ReactNode } from "react";
import { CabinetTabs, type CabinetTabItem } from "./CabinetTabs";
import styles from "./CabinetPanel.module.css";

type Props<T extends string> = {
  items: CabinetTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  actions?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function CabinetPanel<T extends string>({
  items, value, onChange, ariaLabel, actions, children, disabled = false, className,
}: Props<T>) {
  const id = useId();
  const tabPrefix = `${id}-tab`;
  const panelId = `${id}-panel`;

  return (
    <section className={`${styles.panel} ${className ?? ""}`.trim()} data-ui="cabinet-panel" aria-label={ariaLabel}>
      <div className={styles.header}>
        <CabinetTabs items={items} value={value} onChange={onChange} ariaLabel={ariaLabel}
          appearance="panel" idPrefix={tabPrefix} panelId={panelId} disabled={disabled} />
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      <div className={styles.content} id={panelId} role="tabpanel" aria-labelledby={`${tabPrefix}-${value}`} tabIndex={0}>
        {children}
      </div>
    </section>
  );
}
