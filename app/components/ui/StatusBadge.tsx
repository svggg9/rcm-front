import styles from "./StatusBadge.module.css";

type Props = {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
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