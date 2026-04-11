"use client";

import styles from "../Checkout.module.css";
import type { CartItem } from "../types";

type Props = {
  items: CartItem[];
  subtotal: number;
  deliveryPrice: number;
  total: number;
  submitting: boolean;
  contactConfirmed: boolean;
  onSubmit: () => void;
};

export function CheckoutSummary({
  items,
  subtotal,
  deliveryPrice,
  total,
  submitting,
  contactConfirmed,
  onSubmit,
}: Props) {
  return (
    <aside className={styles.summary}>
      <div className={styles.summaryTop}>
        <div className={styles.summaryTotalLine}>
          <span className={styles.summaryTotalLabel}>Итого</span>
          <span className={styles.summaryTotalValue}>
            {total.toLocaleString()} ₽
          </span>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !contactConfirmed}
          className={styles.placeOrderBtn}
        >
          {submitting ? "Оформляем…" : "Оформить заказ"}
        </button>

        <div className={styles.disclaimer}>
          Нажимая «Оформить заказ», вы соглашаетесь с условиями пользования и
          политикой конфиденциальности.
        </div>
      </div>

      <div className={styles.summaryDivider} />

      <div className={styles.summaryBlock}>
        <h2 className={styles.summaryTitle}>Сумма заказа</h2>

        <div className={styles.summaryItems}>
          {items.map((item) => (
            <div key={item.variantId} className={styles.summaryItem}>
              <img
                src={item.imageUrl}
                alt={item.title}
                className={styles.summaryImage}
              />

              <div className={styles.summaryItemInfo}>
                <div className={styles.summaryItemTitle}>{item.title}</div>
                <div className={styles.summaryItemMeta}>
                  {item.size} / {item.color} · {item.quantity} шт.
                </div>
              </div>

              <div className={styles.summaryItemPrice}>
                {(item.price * item.quantity).toLocaleString()} ₽
              </div>
            </div>
          ))}
        </div>

        <div className={styles.summaryLines}>
          <div className={styles.summaryRow}>
            <span>Товары</span>
            <span>{subtotal.toLocaleString()} ₽</span>
          </div>

          <div className={styles.summaryRow}>
            <span>Доставка</span>
            <span>
              {deliveryPrice === 0 ? "Бесплатно" : `${deliveryPrice.toLocaleString()} ₽`}
            </span>
          </div>
        </div>

        <div className={styles.summaryBottom}>
          <div className={styles.summaryBottomRow}>
            <span className={styles.summaryBottomLabel}>Итого</span>
            <div className={styles.summaryBottomPrice}>
              <div>{total.toLocaleString()} ₽</div>
              <div className={styles.summaryBottomNote}>Пошлины включены</div>
            </div>
          </div>
        </div>

        <div className={styles.promoBlock}>
          <label className={styles.label}>Промокод</label>
          <div className={styles.promoRow}>
            <input className={styles.input} placeholder="Введите промокод" />
            <button type="button" className={styles.promoBtn}>
              Применить
            </button>
          </div>
        </div>

        <div className={styles.returnInfo}>
          <strong>Возврат в течение 30 дней</strong>
          <div className={styles.returnInfoFree}>Бесплатно</div>
        </div>
      </div>
    </aside>
  );
}