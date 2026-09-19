import Link from "next/link";

import { EmptyState } from "../../components/ui/EmptyState";
import styles from "../Cart.module.css";

export function EmptyCart() {
  return (
    <div className={styles.emptyState}>
      <EmptyState
        icon="cart"
        title="Корзина пуста"
        actions={
          <Link href="/catalog" className={styles.emptyAction}>
            Каталог
          </Link>
        }
      />
    </div>
  );
}
