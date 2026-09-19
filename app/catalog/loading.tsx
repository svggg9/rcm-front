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
        <div className={styles.primaryCategories} aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className={styles.skeletonCategory} />
          ))}
        </div>

        <div className={styles.subcategoryScroller} aria-hidden="true">
          <div className={styles.subcategories}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className={styles.skeletonSubcategory}>
                <SkeletonBlock className={styles.skeletonSubcategoryLine} />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.catalogToolbar} aria-hidden="true">
          <div className={styles.mobileCatalogContext}>
            <SkeletonBlock className={styles.skeletonContext} />
          </div>
          <SkeletonBlock className={styles.skeletonFilter} />
          <div className={styles.sortWrap}>
            <SkeletonBlock className={styles.skeletonSort} />
          </div>
        </div>

        <div className={styles.results}>
          <ul className={styles.grid} aria-hidden="true">
            {Array.from({ length: 12 }).map((_, index) => (
              <ProductTileSkeleton key={index} />
            ))}
          </ul>
        </div>

        <div className={styles.productCount}>
          <SkeletonBlock className={styles.skeletonCount} />
        </div>
      </div>
    </div>
  );
}
