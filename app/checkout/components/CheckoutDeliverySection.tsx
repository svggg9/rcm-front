"use client";

import { useState } from "react";

import type {
  DeliveryCityOption,
  DeliveryMethod,
  DeliveryOption,
} from "../types";

import { PickupPointModal } from "./PickupPointModal";
import styles from "./CheckoutDeliverySection.module.css";

type CountryCode = "RU" | "BY" | "KZ" | "AM";
type FittingMode = "WITH_FITTING" | "WITHOUT_FITTING";

type Props = {
  options: DeliveryOption[];
  deliveryMethod: DeliveryMethod;
  selectedAddressId: string;
  deliveryAddress: string;
  apartment: string;
  floor: string;
  intercom: string;
  fittingMode: FittingMode;
  comment: string;
  confirmed: boolean;
  expanded: boolean;
  enabled: boolean;
  pickupLoading: boolean;
  quoteLoading: boolean;
  countryCode: CountryCode;
  cityQuery: string;
  cityOptions: DeliveryCityOption[];
  selectedCity: DeliveryCityOption | null;
  cityLoading: boolean;
  addressOptions: {
    value: string;
    displayName: string;
  }[];
  addressLoading: boolean;
  deliveryPrice: number;
  deliveryDateText: string;
  onCountryChange: (value: CountryCode) => void;
  onCityQueryChange: (value: string) => void;
  onCitySelect: (city: DeliveryCityOption) => void;
  onPickupSearch: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  onDeliveryMethodChange: (value: DeliveryMethod) => void;
  onAddressChange: (value: string) => void;
  onDeliveryAddressChange: (value: string) => void;
  onAddressSelect: (value: string) => void;
  onApartmentChange: (value: string) => void;
  onFloorChange: (value: string) => void;
  onIntercomChange: (value: string) => void;
  onFittingModeChange: (value: FittingMode) => void;
  onCommentChange: (value: string) => void;
};

const countries: Record<CountryCode, { label: string; flag: string }> = {
  RU: { label: "Россия", flag: "🇷🇺" },
  BY: { label: "Беларусь", flag: "🇧🇾" },
  KZ: { label: "Казахстан", flag: "🇰🇿" },
  AM: { label: "Армения", flag: "🇦🇲" },
};

export function CheckoutDeliverySection({
  options,
  deliveryMethod,
  selectedAddressId,
  deliveryAddress,
  apartment,
  floor,
  intercom,
  fittingMode,
  comment,
  confirmed,
  expanded,
  enabled,
  pickupLoading,
  quoteLoading,
  countryCode,
  cityQuery,
  cityOptions,
  selectedCity,
  cityLoading,
  addressOptions,
  addressLoading,
  deliveryPrice,
  deliveryDateText,
  onCountryChange,
  onCityQueryChange,
  onCitySelect,
  onPickupSearch,
  onEdit,
  onConfirm,
  onDeliveryMethodChange,
  onAddressChange,
  onDeliveryAddressChange,
  onAddressSelect,
  onApartmentChange,
  onFloorChange,
  onIntercomChange,
  onFittingModeChange,
  onCommentChange,
}: Props) {
  const [pickupModalOpen, setPickupModalOpen] = useState(false);

  const selectedPickupPoint =
    options.find((option) => option.id === selectedAddressId) ?? null;

  const deliveryPriceText =
    deliveryPrice > 0 ? `${deliveryPrice.toLocaleString()} ₽` : "рассчитается";

  const deliveryDateLabel = deliveryDateText
    ? `от ${deliveryDateText}`
    : "срок рассчитается";

  const fittingInfo =
    fittingMode === "WITH_FITTING"
      ? `Вы можете заказать до 8 товаров и оплатить только то, что понравится. ${
          deliveryDateText
            ? `Ближайшая доставка — от ${deliveryDateText}.`
            : "Срок доставки рассчитается автоматически."
        } Удобный день и время доставки можно выбрать заранее в приложении СДЭК. Курьер позвонит за 30 минут до приезда.`
      : `Без возможности отказаться от части товаров при получении. Бесплатная доставка от 10000₽. ${
          deliveryDateText
            ? `Ближайшая доставка — от ${deliveryDateText}.`
            : "Срок доставки рассчитается автоматически."
        } Удобный день и время доставки можно выбрать заранее в приложении СДЭК. Курьер позвонит за 30 минут до приезда.`;

  const summaryAddress =
    deliveryMethod === "PICKUP"
      ? selectedPickupPoint?.label ?? "Пункт самовывоза не выбран"
      : deliveryAddress || "Адрес не указан";

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.stepBadge}>1</span>
          <h2 className={styles.title}>Условия и способ получения</h2>
        </div>

        {confirmed ? (
          <button type="button" onClick={onEdit} className={styles.editButton}>
            Изменить
          </button>
        ) : null}
      </div>

      {!expanded && confirmed ? (
        <div className={styles.summary}>
          <div>{deliveryMethod === "PICKUP" ? "Самовывоз" : "Курьером"}</div>
          <div className={styles.summaryMuted}>{summaryAddress}</div>
          <div className={styles.summaryMuted}>
            {fittingMode === "WITH_FITTING" ? "С примеркой" : "Без примерки"}
          </div>
        </div>
      ) : (
        <div className={styles.deliveryContainer}>
          <div className={styles.fieldWrap}>
            <span className={styles.flagBadge}>{countries[countryCode].flag}</span>

            <select
              className={`${styles.selectField} ${styles.fieldWithIcon}`}
              value={countryCode}
              onChange={(event) =>
                onCountryChange(event.target.value as CountryCode)
              }
              disabled={!enabled}
            >
              <option value="RU">Россия</option>
              <option value="BY">Беларусь</option>
              <option value="KZ">Казахстан</option>
              <option value="AM">Армения</option>
            </select>
          </div>

          <div className={styles.suggestWrap}>
            <input
              className={styles.textField}
              value={cityQuery}
              onChange={(event) => onCityQueryChange(event.target.value)}
              placeholder="Населённый пункт"
              disabled={!enabled}
            />

            {cityLoading ? (
              <div className={styles.inlineHint}>Ищем город…</div>
            ) : null}

            {cityOptions.length > 0 ? (
              <div className={styles.suggestList}>
                {cityOptions.map((city) => (
                  <button
                    key={`${city.code}-${city.cityUuid}`}
                    type="button"
                    className={`${styles.suggestItem} ${
                      selectedCity?.code === city.code
                        ? styles.suggestItemActive
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

          <div className={styles.choiceGrid}>
  <button
    type="button"
    className={`${styles.choiceCard} ${
      deliveryMethod === "COURIER" ? styles.choiceCardActive : ""
    }`}
    onClick={() => onDeliveryMethodChange("COURIER")}
    disabled={!enabled}
  >
    <span>
      <span className={styles.choiceTitle}>Курьером</span>
      <span className={styles.choiceText}>По адресу</span>
    </span>

    <span className={styles.choiceCheck}>
      {deliveryMethod === "COURIER" ? "✓" : ""}
    </span>
  </button>

  <button
    type="button"
    className={`${styles.choiceCard} ${
      deliveryMethod === "PICKUP" ? styles.choiceCardActive : ""
    }`}
    onClick={() => {
      onDeliveryMethodChange("PICKUP");
    }}
    disabled={!enabled}
  >
    <span>
      <span className={styles.choiceTitle}>Самовывоз</span>
      <span className={styles.choiceText}>ПВЗ СДЭК</span>
    </span>

    <span className={styles.choiceCheck}>
      {deliveryMethod === "PICKUP" ? "✓" : ""}
    </span>
  </button>
          </div>

          {deliveryMethod === "COURIER" ? (
            <>
              <div className={styles.suggestWrap}>
                <input
                  className={styles.textField}
                  value={deliveryAddress}
                  onChange={(event) =>
                    onDeliveryAddressChange(event.target.value)
                  }
                  placeholder="Адрес"
                  disabled={!enabled || !selectedCity}
                />

                {addressOptions.length > 0 ? (
                  <div className={styles.suggestList}>
                    {addressOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={styles.suggestItem}
                        onClick={() => onAddressSelect(option.value)}
                        disabled={!enabled}
                      >
                        {option.displayName || option.value}
                      </button>
                    ))}
                  </div>
                ) : null}

                {addressLoading ? (
                  <div className={styles.inlineHint}>Ищем адрес…</div>
                ) : null}
              </div>

              <div className={styles.compactGrid}>
                <input
                  className={styles.textField}
                  value={apartment}
                  onChange={(event) => onApartmentChange(event.target.value)}
                  placeholder="Квартира/офис"
                  disabled={!enabled}
                />

                <input
                  className={styles.textField}
                  value={floor}
                  onChange={(event) => onFloorChange(event.target.value)}
                  placeholder="Этаж"
                  disabled={!enabled}
                />

                <input
                  className={styles.textField}
                  value={intercom}
                  onChange={(event) => onIntercomChange(event.target.value)}
                  placeholder="Домофон"
                  disabled={!enabled}
                />
              </div>

              <div className={styles.choiceGrid}>
  <button
    type="button"
    className={`${styles.choiceCard} ${
      fittingMode === "WITH_FITTING" ? styles.choiceCardActive : ""
    }`}
    onClick={() => onFittingModeChange("WITH_FITTING")}
    disabled={!enabled}
  >
    <span>
      <span className={styles.choiceTitle}>С примеркой</span>
      <span className={styles.choiceText}>
        Доставка {deliveryPriceText} · {deliveryDateLabel}
      </span>
    </span>
    <span className={styles.choiceCheck}>
      {fittingMode === "WITH_FITTING" ? "✓" : ""}
    </span>
  </button>

  <button
    type="button"
    className={`${styles.choiceCard} ${
      fittingMode === "WITHOUT_FITTING" ? styles.choiceCardActive : ""
    }`}
    onClick={() => onFittingModeChange("WITHOUT_FITTING")}
    disabled={!enabled}
  >
    <span>
      <span className={styles.choiceTitle}>Без примерки</span>
      <span className={styles.choiceText}>
        Доставка {deliveryPriceText}
      </span>
    </span>
    <span className={styles.choiceCheck}>
      {fittingMode === "WITHOUT_FITTING" ? "✓" : ""}
    </span>
  </button>
              </div>

              <div className={styles.infoBlock}>{fittingInfo}</div>
            </>
          ) : (
              <div className={styles.pickupBlock}>
                <button
                  type="button"
                  className={styles.pickupSelected}
                  onClick={() => {
                    if (!selectedCity) return;

                    setPickupModalOpen(true);
                    onPickupSearch();
                  }}
                  disabled={!enabled || pickupLoading || !selectedCity}
                >
                  <span className={styles.pickupSelectedLabel}>Пункт самовывоза</span>

                  <span className={styles.pickupSelectedValue}>
                    {pickupLoading
                      ? "Ищем пункты выдачи…"
                      : selectedPickupPoint
                        ? `СДЭК • ${selectedPickupPoint.label}`
                        : "Выберите пункт выдачи"}
                  </span>
                </button>

                {!selectedCity ? (
                  <div className={styles.inlineHint}>
                    Сначала выберите населённый пункт.
                  </div>
                ) : null}

                <PickupPointModal
                  open={pickupModalOpen}
                  points={options}
                  selectedId={selectedAddressId}
                  deliveryPrice={deliveryPrice}
                  onClose={() => setPickupModalOpen(false)}
                  onSelect={onAddressChange}
                  onConfirm={() => setPickupModalOpen(false)}
                />
              </div>
          )}

          <textarea
            className={styles.textareaField}
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="Пожелания к заказу"
            disabled={!enabled}
          />

          <button
            type="button"
            onClick={onConfirm}
            className={styles.confirmButton}
            disabled={!enabled || pickupLoading || quoteLoading}
          >
            {quoteLoading ? "Рассчитываем…" : "Подтвердить условия получения"}
          </button>
        </div>
      )}
    </section>
  );
}