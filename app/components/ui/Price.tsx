import styles from "./Price.module.css";

type Props = {
  amount: number;
  className?: string;
  locale?: string;
};

export function Price({ amount, className, locale = "ru-RU" }: Props) {
  return (
    <span className={`${styles.price} ${className ?? ""}`.trim()}>
      <span>{amount.toLocaleString(locale)}</span>{" "}
      <span className={styles.currency}>₽</span>
    </span>
  );
}
