"use client";

import styles from "../Cart.module.css";

type Props = {
  subtotal: number;
  onCheckout: () => void;
  disabled: boolean;
};

export function CartSummary({ subtotal, onCheckout, disabled }: Props) {
  return (
    <aside className={styles.summary}>
      <h2 className={styles.summaryTitle}>Сумма заказа</h2>

      <div className={styles.summaryBlock}>
        <div className={styles.summaryRow}>
          <span>Товары</span>
          <span>{subtotal.toLocaleString()} ₽</span>
        </div>

        <div className={styles.summaryRow}>
          <span>Доставка</span>
          <span>0 ₽</span>
        </div>
      </div>

      <div className={styles.summaryTotal}>
        <span>Итого</span>
        <span>{subtotal.toLocaleString()} ₽</span>
      </div>

      <button
        className={styles.checkoutBtn}
        onClick={onCheckout}
        disabled={disabled}
      >
        Перейти к оплате
      </button>
    </aside>
  );
}