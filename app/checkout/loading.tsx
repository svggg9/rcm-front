import { SkeletonBlock } from "../components/ui/SkeletonBlock";
import styles from "./CheckoutLoading.module.css";

export default function CheckoutLoading() {
  return (
    <div className="pageContainer">
      <div
        className={styles.page}
        role="status"
        aria-label="Загрузка оформления заказа"
        aria-busy="true"
      >
        <SkeletonBlock className={styles.title} />
        <div className={styles.layout} aria-hidden="true">
          <div className={styles.main}>
            <SkeletonBlock className={styles.sectionTall} />
            <SkeletonBlock className={styles.section} />
          </div>
          <SkeletonBlock className={styles.summary} />
        </div>
      </div>
    </div>
  );
}
