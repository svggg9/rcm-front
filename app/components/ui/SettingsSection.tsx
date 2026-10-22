import { useId, type ReactNode } from "react";
import styles from "./SettingsSection.module.css";

export function SettingsSection({ title, description, actions, children }: {
  title: string; description?: string; actions?: ReactNode; children: ReactNode;
}) {
  const titleId = useId();
  return <section className={styles.section} aria-labelledby={titleId} data-ui="settings-section">
    <header className={styles.header}>
      <div><h2 id={titleId}>{title}</h2>{description ? <p>{description}</p> : null}</div>
      {actions}
    </header>
    <div className={styles.body}>{children}</div>
  </section>;
}
