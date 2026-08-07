import { ProductTileSkeleton } from "../components/ui/CommerceSkeleton";
import { SkeletonBlock } from "../components/ui/SkeletonBlock";

import styles from "../components/Catalog/Catalog.module.css";

export default function Loading() {
  return (
    <div
      className="pageContainer"
      role="status"
      aria-label="Загрузка каталога"
      aria-busy="true"
    >
      <div className={styles.catalogPage}>
        <div className={styles.skeletonTop}>
          <SkeletonBlock className={styles.skeletonBreadcrumb} />
          <SkeletonBlock className={styles.skeletonHeading} />
          <SkeletonBlock className={styles.skeletonCount} />
        </div>

        <div className={styles.skeletonActions}>
          <SkeletonBlock className={styles.skeletonChip} />
          <SkeletonBlock className={styles.skeletonSort} />
        </div>

        <ul className={styles.grid} aria-hidden="true">
          {Array.from({ length: 12 }).map((_, index) => (
            <ProductTileSkeleton key={index} />
          ))}
        </ul>
      </div>
    </div>
  );
}
