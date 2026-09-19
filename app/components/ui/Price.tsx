import styles from "./Price.module.css";

type Props = {
  amount: number;
  className?: string;
  locale?: string;
  maximumFractionDigits?: number;
};

export function Price({ amount, className, locale = "ru-RU", maximumFractionDigits }: Props) {
  return (
    <span className={`${styles.price} ${className ?? ""}`.trim()}>
      <span>{amount.toLocaleString(locale, { maximumFractionDigits })}</span>{" "}
      <span className={styles.currency}>
        <span className={styles.currencyText}>₽</span>
        <svg
          className={styles.currencySymbol}
          width="16"
          height="20"
          viewBox="0 0 16 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M4.2 18V2h4.1c3.4 0 5.2 1.6 5.2 4.3s-1.8 4.3-5.2 4.3H1.6M1.6 14.4h8.3" />
        </svg>
      </span>
    </span>
  );
}
