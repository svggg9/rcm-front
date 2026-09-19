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
  const deliveryValue = quoteLoading
    ? "Рассчитываем…"
    : !deliveryCalculated
      ? "Не рассчитана"
      : deliveryPrice === 0
        ? "Бесплатно"
        : <Price amount={deliveryPrice} />;
  const totalReady = deliveryCalculated && !quoteLoading;

  return (
    <aside className={styles.summary}>
      <div className={styles.summaryItems}>
        {items.map((item) => (
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
                {item.size ? <span>{item.size}</span> : null}
                {item.color ? <span>{item.color}</span> : null}
                <span>{item.quantity} шт.</span>
              </div>
            </div>

            <div className={styles.summaryItemPrice}>
              <Price amount={item.price * item.quantity} />
            </div>
          </div>
        ))}
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

      <div className={styles.summaryActions} data-checkout-summary>
        <div className={styles.summaryTotal} aria-live="polite">
          <span>{totalReady ? "Итого" : "Стоимость товаров"}</span>
          <span><Price amount={totalReady ? total : subtotal} /></span>
          {!totalReady ? (
            <span className={styles.totalPending}>
              {quoteLoading ? "Рассчитываем доставку…" : "Доставка ещё не рассчитана"}
            </span>
          ) : null}
        </div>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          variant="primaryShimmer"
          className={styles.finalSubmitButton}
        >
          Перейти к оплате
        </Button>
      </div>

      <div className={styles.disclaimer}>
        Оплата картой, T-Pay, СБП или SberPay на защищенной странице Т-Банка.
        Нажимая «Перейти к оплате», вы соглашаетесь с публичной офертой,
        политикой конфиденциальности, условиями обработки персональных данных
        и условиями доставки и возврата.
      </div>
    </aside>
  );
}
