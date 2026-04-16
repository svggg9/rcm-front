"use client";

import type { DeliveryMethod, DeliveryOption } from "../types";
import styles from "../Checkout.module.css";

type Props = {
  options: DeliveryOption[];
  deliveryMethod: DeliveryMethod;
  selectedAddressId: string;
  deliveryAddress: string;
  comment: string;
  confirmed: boolean;
  expanded: boolean;
  enabled: boolean;
  onEdit: () => void;
  onConfirm: () => void;
  onDeliveryMethodChange: (value: DeliveryMethod) => void;
  onAddressChange: (value: string) => void;
  onDeliveryAddressChange: (value: string) => void;
  onCommentChange: (value: string) => void;
};

export function CheckoutDeliverySection({
  options,
  deliveryMethod,
  selectedAddressId,
  deliveryAddress,
  comment,
  confirmed,
  expanded,
  enabled,
  onEdit,
  onConfirm,
  onDeliveryMethodChange,
  onAddressChange,
  onDeliveryAddressChange,
  onCommentChange,
}: Props) {
  const selectedOption =
    options.find((option) => option.id === selectedAddressId) ?? null;

  const summaryAddress =
    deliveryMethod === "PICKUP"
      ? selectedOption?.label ?? "Пункт не выбран"
      : deliveryAddress || "Адрес не указан";

  const summaryHint =
    deliveryMethod === "PICKUP"
      ? selectedOption?.hint
      : "Курьерская доставка";

  return (
    <section
      className={`${styles.section} ${!enabled ? styles.sectionDisabled : ""}`}
    >
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderMain}>
          <span className={styles.stepBadge}>2</span>
          <h2 className={styles.sectionTitle}>Доставка</h2>
        </div>

        {confirmed ? (
          <button
            type="button"
            onClick={onEdit}
            className={styles.sectionEditBtn}
          >
            Изменить
          </button>
        ) : null}
      </div>

      {!expanded && confirmed ? (
        <div className={styles.sectionSummary}>
          <div>
            {deliveryMethod === "PICKUP" ? "Пункт выдачи" : "Курьер"}
          </div>
          <div className={styles.sectionSummaryMuted}>{summaryAddress}</div>
          {summaryHint ? (
            <div className={styles.sectionSummaryMuted}>{summaryHint}</div>
          ) : null}
          {comment.trim() ? (
            <div className={styles.sectionSummaryMuted}>
              Комментарий: {comment}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.sectionBody}>
          <div className={styles.paymentMethods}>
            <button
              type="button"
              className={`${styles.paymentOption} ${
                deliveryMethod === "PICKUP" ? styles.paymentOptionActive : ""
              }`}
              onClick={() => onDeliveryMethodChange("PICKUP")}
              disabled={!enabled}
            >
              <div className={styles.paymentTitle}>Пункт выдачи</div>
              <div className={styles.paymentText}>
                Самовывоз из тестового ПВЗ
              </div>
            </button>

            <button
              type="button"
              className={`${styles.paymentOption} ${
                deliveryMethod === "COURIER" ? styles.paymentOptionActive : ""
              }`}
              onClick={() => onDeliveryMethodChange("COURIER")}
              disabled={!enabled}
            >
              <div className={styles.paymentTitle}>Курьер</div>
              <div className={styles.paymentText}>
                Доставка по указанному адресу
              </div>
            </button>
          </div>

          {deliveryMethod === "PICKUP" ? (
            <label className={styles.field}>
              <span className={styles.label}>Пункт выдачи</span>

              <select
                className={styles.input}
                value={selectedAddressId}
                onChange={(event) => onAddressChange(event.target.value)}
                disabled={!enabled}
              >
                <option value="">Выберите пункт выдачи</option>

                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className={styles.field}>
              <span className={styles.label}>Адрес доставки</span>
              <input
                className={styles.input}
                value={deliveryAddress}
                onChange={(event) => onDeliveryAddressChange(event.target.value)}
                placeholder="Москва, ул. Тверская, 12, кв. 8"
                disabled={!enabled}
              />
            </label>
          )}

          <label className={styles.field}>
            <span className={styles.label}>Комментарий для доставки</span>
            <input
              className={styles.input}
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
              placeholder="Например: позвонить за 10 минут"
              disabled={!enabled}
            />
          </label>

          <div className={styles.deliveryHint}>
            Пока это тестовый сценарий. Позже сюда подключим интеграцию с
            сервисом доставки.
          </div>

          <button
            type="button"
            onClick={onConfirm}
            className={styles.confirmBtn}
            disabled={!enabled}
          >
            Подтвердить доставку
          </button>
        </div>
      )}
    </section>
  );
}