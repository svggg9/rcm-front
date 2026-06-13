"use client";

import { useEffect, useRef, useState } from "react";

import type {
  DeliveryCityOption,
  DeliveryMethod,
  DeliveryOption,
} from "../types";

import { ChoiceMark } from "../../components/ui/ChoiceMark";
import { PickupPointModal } from "./PickupPointModal";
import styles from "./CheckoutDeliverySection.module.css";

type CountryCode = "RU";
type FittingMode = "WITH_FITTING" | "WITHOUT_FITTING";

function formatCityDisplayName(fullName: string): string {
  const cityName = fullName.split(",")[0]?.trim() ?? "";

  return fullName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== "Россия")
    .filter((part) => part !== `городской округ ${cityName}`)
    .filter((part) => part !== `муниципальный округ ${cityName}`)
    .join(", ");
}

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
  enabled: boolean;
  pickupLoading: boolean;
  quoteLoading: boolean;
  countryCode: CountryCode;
  cityQuery: string;
  cityOptions: DeliveryCityOption[];
  selectedCity: DeliveryCityOption | null;
  addressOptions: {
    value: string;
    displayName: string;
  }[];
  deliveryPrice: number;
  deliveryDateText: string;
  onCountryChange: (value: CountryCode) => void;
  onCityQueryChange: (value: string) => void;
  onCitySuggestionsClose: () => void;
  onCitySelect: (city: DeliveryCityOption) => void;
  onPickupSearch: () => void;
  onDeliveryMethodChange: (value: DeliveryMethod) => void;
  onAddressChange: (value: string) => void;
  onDeliveryAddressFocus: () => void;
  onDeliveryAddressChange: (value: string) => void;
  onAddressSuggestionsClose: () => void;
  onAddressSelect: (value: string) => void;
  onApartmentChange: (value: string) => void;
  onFloorChange: (value: string) => void;
  onIntercomChange: (value: string) => void;
  onFittingModeChange: (value: FittingMode) => void;
  onCommentChange: (value: string) => void;
};

const countries: Record<CountryCode, { label: string }> = {
  RU: { label: "Россия" },
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
  enabled,
  pickupLoading,
  quoteLoading,
  countryCode,
  cityQuery,
  cityOptions,
  selectedCity,
  addressOptions,
  deliveryPrice,
  deliveryDateText,
  onCountryChange,
  onCityQueryChange,
  onCitySuggestionsClose,
  onCitySelect,
  onPickupSearch,
  onDeliveryMethodChange,
  onAddressChange,
  onDeliveryAddressFocus,
  onDeliveryAddressChange,
  onAddressSuggestionsClose,
  onAddressSelect,
  onApartmentChange,
  onFloorChange,
  onIntercomChange,
  onFittingModeChange,
  onCommentChange,
}: Props) {
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const citySuggestRef = useRef<HTMLDivElement | null>(null);
  const addressSuggestRef = useRef<HTMLDivElement | null>(null);

  const selectedPickupPoint =
    options.find((option) => option.id === selectedAddressId) ?? null;

  const deliveryPriceText =
    deliveryPrice > 0 ? `${deliveryPrice.toLocaleString()} ₽` : "";
  const showDeliveryMetaLoading = quoteLoading && !deliveryPriceText;

  const deliveryDateInfo = deliveryDateText
    ? `Ближайшая доставка — ${deliveryDateText}.`
    : "";

  const fittingInfoLines =
    fittingMode === "WITH_FITTING"
      ? [
          "Можно заказать до 8 товаров и оплатить только то, что понравится.",
          deliveryDateInfo,
          "День и время доставки можно выбрать заранее в приложении СДЭК.",
          "Курьер позвонит за 30 минут до приезда.",
        ]
      : [
          "Без возможности отказаться от части товаров при получении.",
          deliveryDateInfo,
          "День и время доставки можно выбрать заранее в приложении СДЭК.",
          "Курьер позвонит за 30 минут до приезда.",
        ];

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) return;

      if (citySuggestRef.current && !citySuggestRef.current.contains(target)) {
        onCitySuggestionsClose();
      }

      if (
        addressSuggestRef.current &&
        !addressSuggestRef.current.contains(target)
      ) {
        onAddressSuggestionsClose();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onAddressSuggestionsClose, onCitySuggestionsClose]);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.stepBadge}>1</span>
          <h2 className={styles.title}>Условия и способ получения</h2>
        </div>

      </div>

        <div className={styles.deliveryContainer}>
          <div className={styles.fieldWrap}>
            <span
              className={styles.flagBadge}
              aria-label={`Флаг: ${countries[countryCode].label}`}
            >
              <span className={styles.russiaFlag} aria-hidden="true" />
            </span>
            <span className={`${styles.fieldLabel} ${styles.fieldLabelWithIcon}`}>
              Страна
            </span>

            <select
              className={`${styles.selectField} ${styles.fieldWithIcon}`}
              value={countryCode}
              onChange={(event) =>
                onCountryChange(event.target.value as CountryCode)
              }
              disabled={!enabled}
            >
              <option value="RU">Россия</option>
            </select>
          </div>

          <div className={styles.suggestWrap} ref={citySuggestRef}>
            <span className={styles.fieldLabel}>Населённый пункт</span>
            <input
              className={`${styles.textField} ${
                deliveryDateText && selectedCity ? styles.cityFieldWithEta : ""
              }`}
              value={cityQuery}
              onChange={(event) => onCityQueryChange(event.target.value)}
              disabled={!enabled}
            />

            {selectedCity && (deliveryDateText || quoteLoading) ? (
              <span
                className={`${styles.metaBadge} ${styles.cityEtaBadge} ${
                  !deliveryDateText ? styles.metaBadgeLoading : ""
                }`}
              >
                {deliveryDateText || ""}
              </span>
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
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onCitySelect(city)}
                    disabled={!enabled}
                  >
                    {formatCityDisplayName(city.fullName)}
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
    <span className={styles.choiceLabel}>
      <span className={styles.choiceTitle}>Курьером</span>
    </span>

    <ChoiceMark checked={deliveryMethod === "COURIER"} />
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
    <span className={styles.choiceLabel}>
      <span className={styles.choiceTitle}>Самовывоз</span>
    </span>

    <ChoiceMark checked={deliveryMethod === "PICKUP"} />
  </button>
          </div>

          {deliveryMethod === "COURIER" ? (
            <>
              <div className={styles.suggestWrap} ref={addressSuggestRef}>
                <span className={styles.fieldLabel}>Адрес</span>
                <input
                  className={`${styles.textField} ${styles.fieldWithSearchIcon}`}
                  value={deliveryAddress}
                  onFocus={onDeliveryAddressFocus}
                  onChange={(event) =>
                    onDeliveryAddressChange(event.target.value)
                  }
                  disabled={!enabled || !selectedCity}
                />
                <span className={styles.searchIcon} aria-hidden="true" />

                {addressOptions.length > 0 ? (
                  <div className={styles.suggestList}>
                    {addressOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={styles.suggestItem}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onAddressSelect(option.value)}
                        disabled={!enabled}
                      >
                        {option.displayName || option.value}
                      </button>
                    ))}
                  </div>
                ) : null}

              </div>

              <div className={styles.compactGrid}>
                <div className={styles.fieldWrap}>
                  <span className={styles.fieldLabel}>Квартира/офис</span>
                  <input
                    className={styles.textField}
                    value={apartment}
                    onChange={(event) => onApartmentChange(event.target.value)}
                    disabled={!enabled}
                  />
                </div>

                <div className={styles.fieldWrap}>
                  <span className={styles.fieldLabel}>Этаж</span>
                  <input
                    className={styles.textField}
                    value={floor}
                    onChange={(event) => onFloorChange(event.target.value)}
                    disabled={!enabled}
                  />
                </div>

                <div className={styles.fieldWrap}>
                  <span className={styles.fieldLabel}>Домофон</span>
                  <input
                    className={styles.textField}
                    value={intercom}
                    onChange={(event) => onIntercomChange(event.target.value)}
                    disabled={!enabled}
                  />
                </div>
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
    <span className={styles.choiceLabel}>
      <span className={styles.choiceTitle}>С примеркой</span>
    </span>
    <span className={styles.choiceMeta}>
      {deliveryPriceText || showDeliveryMetaLoading ? (
        <span
          className={`${styles.metaBadge} ${
            !deliveryPriceText ? styles.metaBadgeLoading : ""
          }`}
        >
          {deliveryPriceText}
        </span>
      ) : null}
      <ChoiceMark checked={fittingMode === "WITH_FITTING"} />
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
    <span className={styles.choiceLabel}>
      <span className={styles.choiceTitle}>Без примерки</span>
    </span>
    <span className={styles.choiceMeta}>
      {deliveryPriceText || showDeliveryMetaLoading ? (
        <span
          className={`${styles.metaBadge} ${
            !deliveryPriceText ? styles.metaBadgeLoading : ""
          }`}
        >
          {deliveryPriceText}
        </span>
      ) : null}
      <ChoiceMark checked={fittingMode === "WITHOUT_FITTING"} />
    </span>
  </button>
              </div>

              <div className={styles.infoBlock}>
                {fittingInfoLines.filter(Boolean).map((line, index) => (
                  <span
                    key={line}
                    className={index < 2 ? styles.infoBlockAccent : undefined}
                  >
                    {line}
                  </span>
                ))}
              </div>
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
                    {selectedPickupPoint
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

          <div className={styles.fieldWrap}>
            <span className={styles.fieldLabel}>Пожелания к заказу</span>
            <textarea
              className={styles.textareaField}
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
              disabled={!enabled}
            />
          </div>
        </div>
    </section>
  );
}
