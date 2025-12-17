import styles from "./SkeletonCard.module.css";

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.image} />
      <div className={styles.text}>
        <div className={styles.line} />
        <div className={`${styles.line} ${styles.short}`} />
      </div>
    </div>
  );
}
