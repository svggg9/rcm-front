"use client";

import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";
import styles from "./MobilePanelHeader.module.css";

export function MobilePanelHeader({ title, children, onBack, onClose, busy = false, className = "" }: {
  title?: string;
  children?: ReactNode;
  onBack: () => void;
  onClose: () => void;
  busy?: boolean;
  className?: string;
}) {
  return <div className={`${styles.bar} ${className}`.trim()} data-mobile-panel-header>
    <button type="button" className={styles.action} aria-label="Назад" disabled={busy} onClick={onBack}>
      <Icon name="chevron-left" size={24} strokeWidth={1.25} />
    </button>
    <div className={styles.center}>{children ?? <span className={styles.title}>{title}</span>}</div>
    <button type="button" className={styles.action} aria-label="Закрыть" disabled={busy} onClick={onClose}>
      <Icon name="x" size={24} strokeWidth={1.25} />
    </button>
  </div>;
}
