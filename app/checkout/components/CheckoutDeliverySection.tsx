"use client";

import type { DeliveryOption } from "../types";
import styles from "../Checkout.module.css";

type Props = {
  options: DeliveryOption[];
  selectedAddressId: string;
  confirmed: boolean;
  expanded: boolean;
  enabled: boolean;
  onEdit: () => void;
  onConfirm: () => void;
  onAddressChange: (value: string) => void;
};

export function CheckoutDeliverySection({
  options,
  selectedAddressId,
  confirmed,
  expanded,
  enabled,
  onEdit,
  onConfirm,
  onAddressChange,
}: Props) {
  const selectedOption =
    options.find((option) => option.id === selectedAddressId) ?? null;

  return (
    <section className={`${styles.section} ${!enabled ? styles.sectionDisabled : ""}`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderMain}>
          <span className={styles.stepBadge}>2</span>
          <h2 className={styles.sectionTitle}>Доставка</h2>
        </div>

        {confirmed ? (
          <button type="button" onClick={onEdit} className={styles.sectionEditBtn}>
            Изменить
          </button>
        ) : null}
      </div>

      {!expanded && confirmed ? (
        <div className={styles.sectionSummary}>
          <div>{selectedOption?.label ?? "Пункт не выбран"}</div>
          {selectedOption?.hint ? (
            <div className={styles.sectionSummaryMuted}>{selectedOption.hint}</div>
          ) : null}
        </div>
      ) : (
        <div className={styles.sectionBody}>
          <label className={styles.field}>
            <span className={styles.label}>Пункт выдачи / адрес доставки</span>

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

          <div className={styles.deliveryHint}>
            Пока это тестовый список. Позже подключим интеграцию с сервисом доставки.
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