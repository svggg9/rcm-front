"use client";

import styles from "../Checkout.module.css";
import type { CartItem } from "../types";
import Image from "next/image";
import { Price } from "../../components/ui/Price";

type Props = {
  items: CartItem[];
  subtotal: number;
  deliveryPrice: number;
  total: number;
};

export function CheckoutSummary({
  items,
  subtotal,
  deliveryPrice,
  total,
}: Props) {
  return (
    <aside className={styles.summary}>
      <div className={styles.summaryTop}>
        <div className={styles.summaryTotalLine}>
          <span className={styles.summaryTotalLabel}>Итого</span>
          <span className={styles.summaryTotalValue}>
            <Price amount={total} />
          </span>
        </div>

      </div>

      <div className={styles.summaryDivider} />

      <div className={styles.summaryBlock}>
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
                  {item.size} / {item.color} · {item.quantity} шт.
                </div>
              </div>

              <div className={styles.summaryItemPrice}>
                <Price amount={item.price * item.quantity} />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.summaryLines}>
          <div className={styles.summaryRow}>
            <span>Товары</span>
            <span><Price amount={subtotal} /></span>
          </div>

          <div className={styles.summaryRow}>
            <span>Доставка</span>
            <span>
              {deliveryPrice === 0 ? "Бесплатно" : <Price amount={deliveryPrice} />}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
