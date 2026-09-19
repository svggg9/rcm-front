"use client";

import { Button } from "../../components/ui/Button";
import { Price } from "../../components/ui/Price";
import styles from "../Cart.module.css";

type Props = {
  subtotal: number;
  itemCount: number;
  onCheckout: () => void;
  disabled: boolean;
};

export function CartSummary({ subtotal, itemCount, onCheckout, disabled }: Props) {
  return (
    <aside className={styles.summary} data-cart-summary>
      <h2 className={styles.summaryTitle}>Ваш заказ</h2>

      <div className={styles.summaryBlock}>
        <div className={styles.summaryRow}>
          <span>Товары, {itemCount} шт.</span>
          <span>
            <Price amount={subtotal} />
          </span>
        </div>

        <div className={styles.summaryRow}>
          <span>Доставка</span>
          <span className={styles.deliveryValue}>Рассчитаем при оформлении</span>
        </div>
      </div>

      <div className={styles.summaryTotal}>
        <span className={styles.subtotalLabel}>Товары</span>
        <span>
          <Price amount={subtotal} />
        </span>
        <span className={styles.mobileDeliveryNote}>Доставка при оформлении</span>
      </div>

      <Button
        type="button"
        variant="primary"
        className={styles.checkoutBtn}
        onClick={onCheckout}
        disabled={disabled}
      >
        <span className={styles.desktopCheckoutLabel}>Перейти к оформлению</span>
        <span className={styles.mobileCheckoutLabel}>К оформлению</span>
      </Button>

      <p className={styles.summaryNote}>
        Способы доставки и оплаты можно выбрать на следующем шаге.
      </p>
    </aside>
  );
}
