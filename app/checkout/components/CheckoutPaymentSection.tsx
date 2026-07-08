"use client";

import type { PaymentMethod } from "../types";
import { ChoiceMark } from "../../components/ui/ChoiceMark";
import styles from "./CheckoutPaymentSection.module.css";

type Props = {
  paymentMethod: PaymentMethod;
  enabled: boolean;
  onPaymentMethodChange: (method: PaymentMethod) => void;
};

const paymentOptions: {
  value: PaymentMethod;
  title: string;
  text: string;
}[] = [
  {
    value: "SBP",
    title: "СБП",
    text: "Оплата через систему быстрых платежей.",
  },
  {
    value: "CARD",
    title: "Банковская карта",
    text: "Оплата картой на защищенной странице.",
  },
];

export function CheckoutPaymentSection({
  paymentMethod,
  enabled,
  onPaymentMethodChange,
}: Props) {
  return (
    <section className={`${styles.section} ${!enabled ? styles.disabled : ""}`}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.stepBadge}>3</span>
          <h2 className={styles.title}>Оплата</h2>
        </div>
      </div>

      <div className={styles.body}>
        {paymentOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`${styles.choiceCard} ${
              paymentMethod === option.value ? styles.choiceCardActive : ""
            }`}
            onClick={() => onPaymentMethodChange(option.value)}
            disabled={!enabled}
          >
            <span className={styles.choiceLabel}>
              <span className={styles.choiceTitle}>{option.title}</span>
              <span className={styles.choiceText}>{option.text}</span>
            </span>

            <ChoiceMark checked={paymentMethod === option.value} />
          </button>
        ))}
      </div>
    </section>
  );
}
