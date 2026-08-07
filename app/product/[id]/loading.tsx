import { SkeletonBlock } from "../../components/ui/SkeletonBlock";

import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div
      className="pageContainer"
      role="status"
      aria-label="Загрузка товара"
      aria-busy="true"
    >
      <div className={styles.top}>
        <SkeletonBlock className={styles.breadcrumb} />
      </div>
      <div className={styles.layout} aria-hidden="true">
        <div className={styles.gallery}>
          <SkeletonBlock className={styles.image} />
          <SkeletonBlock className={styles.image} />
        </div>
        <div className={styles.info}>
          <SkeletonBlock className={styles.brand} />
          <SkeletonBlock className={styles.title} />
          <SkeletonBlock className={styles.price} />
          <SkeletonBlock className={styles.optionLabel} />
          <div className={styles.options}>
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock className={styles.option} key={index} />
            ))}
          </div>
          <SkeletonBlock className={styles.button} />
          <SkeletonBlock className={styles.detail} />
          <SkeletonBlock className={styles.detail} />
        </div>
      </div>
    </div>
  );
}
