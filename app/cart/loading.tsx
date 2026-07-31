import { CartContentSkeleton } from "../components/ui/CommerceSkeleton";
import styles from "./Cart.module.css";

export default function CartLoading() {
  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.top}>
          <h1 className={styles.title}>Корзина</h1>
          <p className={styles.count}>Загрузка…</p>
        </div>
        <CartContentSkeleton />
      </div>
    </div>
  );
}
