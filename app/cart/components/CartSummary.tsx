"use client";

import { Button } from "../../components/ui/Button";
import { Price } from "../../components/ui/Price";
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
          <span>
            <Price amount={subtotal} />
          </span>
        </div>

        <div className={styles.summaryRow}>
          <span>Доставка</span>
          <span>
            <Price amount={0} />
          </span>
        </div>
      </div>

      <div className={styles.summaryTotal}>
        <span>Итого</span>
        <span>
          <Price amount={subtotal} />
        </span>
      </div>

      <Button
        type="button"
        variant="primaryShimmer"
        className={styles.checkoutBtn}
        onClick={onCheckout}
        disabled={disabled}
      >
        Перейти к оплате
      </Button>
    </aside>
  );
}
