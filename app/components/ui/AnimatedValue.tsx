import type { ReactNode } from "react";
import styles from "./AnimatedValue.module.css";

/** Animate a confirmed value without remounting its surrounding control. */
export function AnimatedValue({ children, revision = 0 }: { children: ReactNode; revision?: number }) {
  return <span key={revision} className={revision ? styles.bounce : undefined}>{children}</span>;
}
