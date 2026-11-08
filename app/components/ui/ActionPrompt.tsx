import type { ReactNode } from "react";
import styles from "./ActionPrompt.module.css";

/** A short hint followed by a secondary text action, using a Button or Link. */
export function ActionPrompt({ hint, children, className = "" }: {
  hint: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return <span className={`${styles.prompt} ${className}`.trim()}>
    <span className={styles.hint}>{hint}</span>
    {children}
  </span>;
}
