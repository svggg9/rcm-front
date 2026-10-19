"use client";

import { Button } from "../../components/ui/Button";
import type { ReactNode } from "react";
import styles from "../Cart.module.css";

type Props = { subtotal: number; itemCount: number; onCheckout: () => void; disabled: boolean; children?: ReactNode; hideAction?: boolean };

export function CartSummary({ subtotal, itemCount, onCheckout, disabled, children, hideAction = false }: Props) {
  const price = `${subtotal.toLocaleString("ru-RU")} ₽`;
  return <aside className={styles.summary} aria-label="Итог корзины" data-cart-summary>
    <dl className={styles.summaryRows}>
      <div><dt>Количество</dt><dd>{itemCount} ед.</dd></div>
      <div><dt>Общая стоимость товаров</dt><dd>{price}</dd></div>
    </dl>
    {!hideAction && (children || <Button type="button" variant="primary" className={styles.checkoutBtn} onClick={onCheckout} disabled={disabled} data-checkout-trigger>
      Перейти к оформлению
    </Button>)}
  </aside>;
}
