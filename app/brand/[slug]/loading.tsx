import { ProductTileSkeleton } from "../../components/ui/CommerceSkeleton";
import { SkeletonBlock } from "../../components/ui/SkeletonBlock";

import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div
      className="pageContainer"
      role="status"
      aria-label="Загрузка витрины"
      aria-busy="true"
    >
      <div className={styles.header} aria-hidden="true">
        <SkeletonBlock className={styles.breadcrumb} />
        <SkeletonBlock className={styles.title} />
        <SkeletonBlock className={styles.description} />
        <SkeletonBlock className={styles.descriptionShort} />
      </div>
      <div className={styles.visuals} aria-hidden="true">
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
      <div className={styles.catalog} aria-hidden="true">
        <SkeletonBlock className={styles.catalogTitle} />
        <ul className={styles.grid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <ProductTileSkeleton key={index} />
          ))}
        </ul>
      </div>
    </div>
  );
}
