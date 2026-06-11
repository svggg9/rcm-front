"use client";

import type {
  DeliveryCityOption,
  DeliveryMethod,
  DeliveryOption,
} from "../types";

import styles from "../Checkout.module.css";
import { PickupPointMap } from "./PickupPointMap";

type Props = {
  options: DeliveryOption[];
  deliveryMethod: DeliveryMethod;
  selectedAddressId: string;
  deliveryAddress: string;
  comment: string;
  confirmed: boolean;
  expanded: boolean;
  enabled: boolean;
  pickupLoading: boolean;
  quoteLoading: boolean;
  cityQuery: string;
  cityOptions: DeliveryCityOption[];
  selectedCity: DeliveryCityOption | null;
  cityLoading: boolean;
  addressOptions: {
  value: string;
  displayName: string;
}[];
addressLoading: boolean;
onAddressSelect: (value: string) => void;
  onCityQueryChange: (value: string) => void;
  onCitySelect: (city: DeliveryCityOption) => void;
  onPickupSearch: () => void;
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
  pickupLoading,
  quoteLoading,
  cityQuery,
  cityOptions,
  selectedCity,
  addressOptions,
  addressLoading,
  onAddressSelect,
  onCityQueryChange,
  onCitySelect,
  onPickupSearch,
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
    deliveryMethod === "PICKUP" ? selectedOption?.hint : "Курьерская доставка";

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
          <button type="button" onClick={onEdit} className={styles.sectionEditBtn}>
            Изменить
          </button>
        ) : null}
      </div>

      {!expanded && confirmed ? (
        <div className={styles.sectionSummary}>
          <div>{deliveryMethod === "PICKUP" ? "Пункт выдачи" : "Курьер"}</div>
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
              <div className={styles.paymentText}>Самовывоз из ПВЗ СДЭК</div>
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
              <div className={styles.paymentText}>Доставка по адресу</div>
            </button>
          </div>

          <div className={styles.cityPicker}>
            <label className={styles.field}>
              <span className={styles.label}>Город</span>
              <input
                className={styles.input}
                value={cityQuery}
                onChange={(event) => onCityQueryChange(event.target.value)}
                placeholder="Москва"
                disabled={!enabled}
              />
            </label>

            {cityOptions.length > 0 ? (
              <div className={styles.cityOptions}>
                {cityOptions.map((city) => (
                  <button
                    key={`${city.code}-${city.cityUuid}`}
                    type="button"
                    className={`${styles.cityOption} ${
                      selectedCity?.code === city.code
                        ? styles.cityOptionActive
                        : ""
                    }`}
                    onClick={() => onCitySelect(city)}
                    disabled={!enabled}
                  >
                    {city.fullName}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {deliveryMethod === "PICKUP" ? (
            <div className={styles.pickupPicker}>
              <button
                type="button"
                className={styles.pickupSearchButton}
                onClick={onPickupSearch}
                disabled={!enabled || pickupLoading || !selectedCity}
              >
                {pickupLoading ? "Ищем…" : "Показать ПВЗ"}
              </button>

              <div className={styles.pickupMapLayout}>
                <div className={styles.pickupList}>
                  {options.length === 0 ? (
                    <div className={styles.deliveryHint}>
                      Выберите город и нажмите «Показать ПВЗ»
                    </div>
                  ) : (
                    options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`${styles.pickupPoint} ${
                          selectedAddressId === option.id
                            ? styles.pickupPointActive
                            : ""
                        }`}
                        onClick={() => onAddressChange(option.id)}
                        disabled={!enabled}
                      >
                        <span className={styles.pickupPointTitle}>
                          {option.label}
                        </span>

                        {option.hint ? (
                          <span className={styles.pickupPointHint}>
                            {option.hint}
                          </span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>

                <div className={styles.pickupMap}>
                  <PickupPointMap
                    points={options}
                    selectedId={selectedAddressId}
                    onSelect={onAddressChange}
                  />
                </div>
              </div>
            </div>
          ) : (
<div className={styles.addressSuggest}>
  <label className={styles.field}>
    <span className={styles.label}>Адрес доставки</span>
    <input
      className={styles.input}
      value={deliveryAddress}
      onChange={(event) => onDeliveryAddressChange(event.target.value)}
      placeholder="ул. Тверская, 12, кв. 8"
      disabled={!enabled || !selectedCity}
    />
  </label>

  {addressOptions.length > 0 ? (
    <div className={styles.cityOptions}>
      {addressOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.cityOption}
          onClick={() => onAddressSelect(option.value)}
          disabled={!enabled}
        >
          {option.displayName || option.value}
        </button>
      ))}
    </div>
  ) : null}

  {addressLoading ? (
    <div className={styles.deliveryHint}>Ищем адрес…</div>
  ) : null}
</div>
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
            Доставка рассчитывается через СДЭК. Для самовывоза выберите пункт
            выдачи.
          </div>

          <button
            type="button"
            onClick={onConfirm}
            className={styles.confirmBtn}
            disabled={!enabled || pickupLoading || quoteLoading}
          >
            {quoteLoading ? "Рассчитываем…" : "Подтвердить доставку"}
          </button>
        </div>
      )}
    </section>
  );
}