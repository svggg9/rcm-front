import styles from "./NotificationBadge.module.css";

type Props = {
  count?: number;
  muted?: boolean;
  tone?: "default" | "success" | "warning" | "danger";
};

export function NotificationBadge({ count, muted = false, tone = "default" }: Props) {
  const hasCount = typeof count === "number" && Number.isSafeInteger(count) && count > 0;

  return (
    <span
      aria-hidden="true"
      data-ui="notification-badge"
      data-tone={tone}
      className={`${styles.badge} ${hasCount ? styles.counter : styles.dot} ${tone !== "default" ? styles[tone] : ""} ${muted ? styles.muted : ""}`}
    >
      {hasCount ? (count > 99 ? "99+" : count) : null}
    </span>
  );
}
