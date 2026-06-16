import { SkeletonTile } from "../components/SkeletonTile/SkeletonTile";

import styles from "../components/Catalog/Catalog.module.css";

export default function Loading() {
  return (
    <div className="pageContainer">
      <div className={styles.catalogPage}>
        <div className={styles.skeletonTop}>
          <div className={styles.skeletonBreadcrumb} />
        </div>

        <div className={styles.skeletonActions}>
          <div className={styles.skeletonChip} />
          <div className={styles.skeletonChip} />
          <div className={styles.skeletonChip} />
          <div className={styles.skeletonSort} />
        </div>

        <div className={styles.skeletonCount} />

        <ul className={styles.grid} aria-hidden="true">
          {Array.from({ length: 12 }).map((_, index) => (
            <SkeletonTile key={index} />
          ))}
        </ul>
      </div>
    </div>
  );
}
