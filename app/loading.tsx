import styles from "./loading.module.css";

function RailSkeleton() {
  return (
    <section className={styles.rail}>
      <div className={styles.railHeader}>
        <div className={styles.titleLine} />
        <div className={styles.actionLine} />
      </div>

      <ul className={styles.gridList}>
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index} className={styles.card}>
            <div className={styles.media} />
            <div className={styles.line} />
            <div className={styles.lineShort} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Loading() {
  return (
    <div className={styles.page} aria-busy="true">
      <div className="pageContainer">
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow} />
            <div className={styles.heroTitle} />
            <div className={styles.heroTitleShort} />
            <div className={styles.heroText} />
            <div className={styles.heroTextShort} />
            <div className={styles.heroButton} />
          </div>
        </section>

        <RailSkeleton />
        <RailSkeleton />
        <RailSkeleton />
      </div>
    </div>
  );
}
