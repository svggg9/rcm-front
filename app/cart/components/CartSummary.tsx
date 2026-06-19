"use client";

import styles from "../Cart.module.css";
import { Price } from "../../components/ui/Price";

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
          <span><Price amount={subtotal} /></span>
        </div>

        <div className={styles.summaryRow}>
          <span>Доставка</span>
          <span><Price amount={0} /></span>
        </div>
      </div>

      <div className={styles.summaryTotal}>
        <span>Итого</span>
        <span><Price amount={subtotal} /></span>
      </div>

    <button
      type="button"
      className="buttonPrimary wFull"
      onClick={onCheckout}
      disabled={disabled}
    >
      Перейти к оплате
    </button>
    </aside>
  );
}
