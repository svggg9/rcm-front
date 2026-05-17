import { SkeletonTile } from "../components/SkeletonTile/SkeletonTile";

import styles from "../components/Catalog/Catalog.module.css";

export default function Loading() {
  return (
    <div className={styles.catalogPage}>
      <div className={styles.catalogTop}>
        <div style={{ height: 16, width: 120 }} />
        <div style={{ height: 40 }} />
      </div>

      <div className={styles.grid}>
        {Array.from({ length: 12 }).map((_, index) => (
          <SkeletonTile key={index} />
        ))}
      </div>
    </div>
  );
}