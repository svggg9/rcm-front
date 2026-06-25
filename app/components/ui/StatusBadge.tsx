import styles from "./StatusBadge.module.css";

export type StatusBadgeTone = "default" | "success" | "warning" | "danger";

type Props = {
  children: React.ReactNode;
  tone?: StatusBadgeTone;
};

export function StatusBadge({
  children,
  tone = "default",
}: Props) {
  return (
    <span
      className={`${styles.badge} ${styles[`tone-${tone}`]}`}
    >
      {children}
    </span>
  );
}
