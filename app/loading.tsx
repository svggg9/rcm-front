import styles from "./loading.module.css";
import { ProductTileSkeleton } from "./components/ui/CommerceSkeleton";
import { SkeletonBlock } from "./components/ui/SkeletonBlock";

function RailSkeleton() {
  return (
    <section className={styles.rail}>
      <div className={styles.railHeader}>
        <SkeletonBlock className={styles.titleLine} />
        <SkeletonBlock className={styles.actionLine} />
      </div>

      <ul className={styles.gridList}>
        {Array.from({ length: 4 }).map((_, index) => (
          <ProductTileSkeleton key={index} />
        ))}
      </ul>
    </section>
  );
}

export default function Loading() {
  return (
    <div
      className={styles.page}
      role="status"
      aria-label="Загрузка страницы"
      aria-busy="true"
    >
      <div className="pageContainer">
        <section className={styles.hero}>
          <SkeletonBlock className={styles.heroBackdrop} />
          <div className={styles.heroContent}>
            <SkeletonBlock className={styles.heroEyebrow} />
            <SkeletonBlock className={styles.heroTitle} />
            <SkeletonBlock className={styles.heroTitleShort} />
            <SkeletonBlock className={styles.heroText} />
            <SkeletonBlock className={styles.heroTextShort} />
            <SkeletonBlock className={styles.heroButton} />
          </div>
        </section>

        <RailSkeleton />
        <RailSkeleton />
        <RailSkeleton />
      </div>
    </div>
  );
}
