"use client";

import Image from "next/image";

import { Button } from "../../components/ui/Button";
import { Price } from "../../components/ui/Price";
import styles from "../Checkout.module.css";
import type { CartItem } from "../types";

type Props = {
  items: CartItem[];
  subtotal: number;
  deliveryPrice: number;
  quoteLoading: boolean;
  deliveryCalculated: boolean;
  total: number;
  submitDisabled: boolean;
  onSubmit: () => void;
};

export function CheckoutSummary({
  items,
  subtotal,
  deliveryPrice,
  quoteLoading,
  deliveryCalculated,
  total,
  submitDisabled,
  onSubmit,
}: Props) {
  const deliveryValue = quoteLoading || !deliveryCalculated
    ? null
    : deliveryPrice === 0
      ? "Бесплатно"
      : <Price amount={deliveryPrice} />;

  return (
    <aside className={styles.summary}>
      <div className={styles.summaryItems}>
        {items.map((item) => {
          const meta = [item.size, item.color].filter(Boolean).join(" / ");

          return (
            <div key={item.variantId} className={styles.summaryItem}>
              <Image
                src={item.imageUrl || "/placeholder-product.png"}
                alt={item.title}
                width={64}
                height={84}
                className={styles.summaryImage}
              />

              <div className={styles.summaryItemInfo}>
                <div className={styles.summaryItemTitle}>{item.title}</div>
                <div className={styles.summaryItemMeta}>
                  {meta ? `${meta} · ` : ""}{item.quantity} шт.
                </div>
              </div>

              <div className={styles.summaryItemPrice}>
                <Price amount={item.price * item.quantity} />
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.summaryBlock}>
        <div className={styles.summaryRow}>
          <span>Товары</span>
          <span><Price amount={subtotal} /></span>
        </div>

        <div className={styles.summaryRow}>
          <span>Доставка</span>
          <span>{deliveryValue}</span>
        </div>
      </div>

      <div className={styles.summaryTotal}>
        <span>Итого</span>
        <span><Price amount={total} /></span>
      </div>

      <div className={styles.summaryActions}>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          variant="primaryShimmer"
          className={styles.finalSubmitButton}
        >
          Перейти к оплате
        </Button>

        <div className={styles.disclaimer}>
          Оплата картой, T-Pay, СБП или SberPay на защищенной странице Т-Банка.
          Нажимая «Перейти к оплате», вы соглашаетесь с публичной офертой,
          политикой конфиденциальности, условиями обработки персональных данных
          и условиями доставки и возврата.
        </div>
      </div>
    </aside>
  );
}
