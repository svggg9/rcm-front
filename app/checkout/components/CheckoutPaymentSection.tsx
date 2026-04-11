"use client";

import type { PaymentMethod } from "../types";
import styles from "../Checkout.module.css";

type Props = {
  paymentMethod: PaymentMethod;
  confirmed: boolean;
  expanded: boolean;
  enabled: boolean;
  onEdit: () => void;
  onConfirm: () => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
};

export function CheckoutPaymentSection({
  paymentMethod,
  confirmed,
  expanded,
  enabled,
  onEdit,
  onConfirm,
  onPaymentMethodChange,
}: Props) {
  return (
    <section className={`${styles.section} ${!enabled ? styles.sectionDisabled : ""}`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderMain}>
          <span className={styles.stepBadge}>3</span>
          <h2 className={styles.sectionTitle}>Оплата</h2>
        </div>

        {confirmed ? (
          <button type="button" onClick={onEdit} className={styles.sectionEditBtn}>
            Изменить
          </button>
        ) : null}
      </div>

      {!expanded && confirmed ? (
        <div className={styles.sectionSummary}>
          <div>{paymentMethod === "SBP" ? "СБП" : "Банковская карта"}</div>
          <div className={styles.sectionSummaryMuted}>Mock-оплата для тестирования</div>
        </div>
      ) : (
        <div className={styles.sectionBody}>
          <div className={styles.paymentMethods}>
            <button
              type="button"
              className={`${styles.paymentOption} ${
                paymentMethod === "SBP" ? styles.paymentOptionActive : ""
              }`}
              onClick={() => onPaymentMethodChange("SBP")}
              disabled={!enabled}
            >
              <div className={styles.paymentTitle}>СБП</div>
              <div className={styles.paymentText}>
                Mock-оплата через систему быстрых платежей
              </div>
            </button>

            <button
              type="button"
              className={`${styles.paymentOption} ${
                paymentMethod === "CARD" ? styles.paymentOptionActive : ""
              }`}
              onClick={() => onPaymentMethodChange("CARD")}
              disabled={!enabled}
            >
              <div className={styles.paymentTitle}>Банковская карта</div>
              <div className={styles.paymentText}>Mock-оплата банковской картой</div>
            </button>
          </div>

          <button
            type="button"
            onClick={onConfirm}
            className={styles.confirmBtn}
            disabled={!enabled}
          >
            Подтвердить способ оплаты
          </button>
        </div>
      )}
    </section>
  );
}