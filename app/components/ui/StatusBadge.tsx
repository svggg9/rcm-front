import styles from "./StatusBadge.module.css";

export type StatusBadgeTone = "default" | "success" | "warning" | "danger";
export type StatusBadgeSize = "compact" | "regular";

type Props = {
  children: React.ReactNode;
  tone?: StatusBadgeTone;
  size?: StatusBadgeSize;
};

export function StatusBadge({
  children,
  tone = "default",
  size = "compact",
}: Props) {
  return (
    <span
      className={`${styles.badge} ${styles[`tone-${tone}`]} ${
        styles[`size-${size}`]
      }`}
    >
      {children}
    </span>
  );
}
