import Link from "next/link";

import { EmptyState } from "../../components/ui/EmptyState";
import styles from "../Cart.module.css";

export function EmptyCart() {
  return (
    <div className={styles.emptyState}>
      <EmptyState
        icon="cart"
        title="Корзина пуста"
        text="Добавьте вещи из каталога, чтобы оформить заказ."
        actions={
          <Link href="/catalog" className={styles.emptyAction}>
            Перейти в каталог
          </Link>
        }
      />
    </div>
  );
}
