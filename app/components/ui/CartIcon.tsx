import { useId } from "react";
import styles from "./CartIcon.module.css";

type Props = { size?: number; fillLevel?: "empty" | "half" | "full"; count?: number };
const bagPath = "M5.1 3.6c.1-1 1-1.6 1.9-1.6h1.2l.4 6h6.8l.4-6H17c1 0 1.8.7 1.9 1.6l1.4 14.9c.2 1.9-1.2 3.5-3.1 3.5H6.8c-1.9 0-3.3-1.6-3.1-3.5L5.1 3.6Z";

// The buyer navigation and empty cart share the selected bag silhouette.
export function CartIcon({ size = 24, fillLevel, count }: Props) {
  const clipId = useId();
  const level = fillLevel ?? (count === undefined ? undefined : count >= 2 ? "full" : count === 1 ? "half" : "empty");
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {level !== undefined && <>
        <defs><clipPath id={clipId}><path d={bagPath} fill="black" stroke="none" /></clipPath></defs>
        <g clipPath={`url(#${clipId})`}>
          <rect className={styles.fill} data-level={level} x="0" y="8" width="24" height="14" fill="var(--gold)" stroke="none" />
        </g>
      </>}
      <path d={bagPath} />
      <path d="M7 2c.7 0 1.1.6 1.2 1.4M17 2c-.7 0-1.1.6-1.2 1.4" />
    </svg>
  );
}
