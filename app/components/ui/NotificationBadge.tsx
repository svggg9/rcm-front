import styles from "./NotificationBadge.module.css";

type Props = {
  count?: number;
  muted?: boolean;
};

export function NotificationBadge({ count, muted = false }: Props) {
  const hasCount = typeof count === "number" && Number.isSafeInteger(count) && count > 0;

  return (
    <span
      aria-hidden="true"
      data-ui="notification-badge"
      className={`${styles.badge} ${hasCount ? styles.counter : styles.dot} ${muted ? styles.muted : ""}`}
    >
      {hasCount ? (count > 99 ? "99+" : count) : null}
    </span>
  );
}
