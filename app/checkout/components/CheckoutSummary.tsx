"use client";

import styles from "../Checkout.module.css";
import type {
  CartItem,
  DeliveryMethod,
  DeliveryOffer,
  PickupPoint,
} from "../types";

type Props = {
  items: CartItem[];
  subtotal: number;
  deliveryPrice: number;
  total: number;
  deliveryMethod: DeliveryMethod;
  selectedPickupPoint: PickupPoint | null;
  selectedOffer: DeliveryOffer | null;
  submitting: boolean;
  checkoutReady: boolean;
  onSubmit: () => void;
};

function formatMoney(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CheckoutSummary({
  items,
  subtotal,
  deliveryPrice,
  total,
  deliveryMethod,
  selectedPickupPoint,
  selectedOffer,
  submitting,
  checkoutReady,
  onSubmit,
}: Props) {
  const isPickupPoint = deliveryMethod === "PICKUP_POINT";

  return (
    <aside className={styles.summary}>
      <div className={styles.summaryTop}>
        <div className={styles.summaryTotalLine}>
          <span className={styles.summaryTotalLabel}>Итого</span>
          <span className={styles.summaryTotalValue}>
            {formatMoney(total)}
          </span>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !checkoutReady}
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
                src={item.imageUrl || "/placeholder-product.png"}
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
                {formatMoney(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.summaryLines}>
          <div className={styles.summaryRow}>
            <span>Товары</span>
            <span>{formatMoney(subtotal)}</span>
          </div>

          <div className={styles.summaryRow}>
            <span>Доставка</span>
            <span>
              {deliveryPrice === 0 ? "Бесплатно" : formatMoney(deliveryPrice)}
            </span>
          </div>
        </div>

        {(isPickupPoint && selectedPickupPoint) || selectedOffer ? (
          <div className={styles.summaryDivider} />
        ) : null}

        {isPickupPoint && selectedPickupPoint ? (
          <div className={styles.summaryLines}>
            <div className={styles.summaryRow}>
              <span>Способ доставки</span>
              <span>ПВЗ</span>
            </div>

            <div className={styles.summaryRow}>
              <span>Пункт выдачи</span>
              <span style={{ textAlign: "right", maxWidth: "220px" }}>
                {selectedPickupPoint.name || "ПВЗ"}
              </span>
            </div>

            <div className={styles.summaryRow}>
              <span>Адрес</span>
              <span style={{ textAlign: "right", maxWidth: "220px" }}>
                {selectedPickupPoint.fullAddress}
              </span>
            </div>

            {selectedPickupPoint.instruction ? (
              <div className={styles.summaryRow}>
                <span>Как найти</span>
                <span style={{ textAlign: "right", maxWidth: "220px" }}>
                  {selectedPickupPoint.instruction}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {selectedOffer ? (
          <div className={styles.summaryLines}>
            <div className={styles.summaryRow}>
              <span>Оффер</span>
              <span style={{ textAlign: "right", maxWidth: "220px" }}>
                {selectedOffer.offerId}
              </span>
            </div>

            {selectedOffer.deliveryFrom || selectedOffer.deliveryTo ? (
              <div className={styles.summaryRow}>
                <span>Доставка</span>
                <span style={{ textAlign: "right", maxWidth: "220px" }}>
                  {formatDateTime(selectedOffer.deliveryFrom)} —{" "}
                  {formatDateTime(selectedOffer.deliveryTo)}
                </span>
              </div>
            ) : null}

            {selectedOffer.pickupFrom || selectedOffer.pickupTo ? (
              <div className={styles.summaryRow}>
                <span>Забор</span>
                <span style={{ textAlign: "right", maxWidth: "220px" }}>
                  {formatDateTime(selectedOffer.pickupFrom)} —{" "}
                  {formatDateTime(selectedOffer.pickupTo)}
                </span>
              </div>
            ) : null}

            {selectedOffer.expiresAt ? (
              <div className={styles.summaryRow}>
                <span>Действует до</span>
                <span style={{ textAlign: "right", maxWidth: "220px" }}>
                  {formatDateTime(selectedOffer.expiresAt)}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={styles.summaryBottom}>
          <div className={styles.summaryBottomRow}>
            <span className={styles.summaryBottomLabel}>Итого</span>
            <div className={styles.summaryBottomPrice}>
              <div>{formatMoney(total)}</div>
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