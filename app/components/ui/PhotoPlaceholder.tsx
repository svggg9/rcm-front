import styles from "./PhotoPlaceholder.module.css";

type Props = {
  className?: string;
  decorative?: boolean;
  label?: string;
};

/** Empty photo surface; its dimensions are supplied by the surrounding media slot. */
export function PhotoPlaceholder({ className, decorative = false, label = "Фото отсутствует" }: Props) {
  return (
    <span className={[styles.placeholder, className].filter(Boolean).join(" ")}
      role={decorative ? undefined : "img"} aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}>
      <svg className={styles.icon} viewBox="0 0 136 106" fill="none" aria-hidden="true" focusable="false">
        <rect x="4" y="4" width="128" height="98" rx="4" stroke="currentColor" strokeWidth="8" />
        <path d="M8 72 39 33c2.6-3.4 6.4-3.6 9.2-.3L84 73l18-18c2.3-2.3 5.5-2.3 7.9 0L128 73v27H8V72Z" fill="currentColor" />
        <circle cx="103" cy="28" r="12" fill="currentColor" />
      </svg>
    </span>
  );
}
