"use client";

import { useEffect, useRef, useState } from "react";

import type { DeliveryCityOption, DeliveryOption } from "../types";
import { SkeletonBlock } from "../../components/ui/SkeletonBlock";

import { PickupPointModal } from "./PickupPointModal";
import styles from "./CheckoutDeliverySection.module.css";

type CountryCode = "RU";

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
  selectedAddressId: string;
  comment: string;
  enabled: boolean;
  pickupLoading: boolean;
  quoteLoading: boolean;
  countryCode: CountryCode;
  cityQuery: string;
  cityOptions: DeliveryCityOption[];
  selectedCity: DeliveryCityOption | null;
  deliveryPrice: number;
  deliveryDateText: string;
  onCountryChange: (value: CountryCode) => void;
  onCityQueryChange: (value: string) => void;
  onCitySuggestionsClose: () => void;
  onCitySelect: (city: DeliveryCityOption) => void;
  onPickupSearch: () => void;
  onAddressChange: (value: string) => void;
  onCommentChange: (value: string) => void;
};

export function CheckoutDeliverySection({
  options,
  selectedAddressId,
  comment,
  enabled,
  pickupLoading,
  quoteLoading,
  countryCode,
  cityQuery,
  cityOptions,
  selectedCity,
  deliveryPrice,
  deliveryDateText,
  onCountryChange,
  onCityQueryChange,
  onCitySuggestionsClose,
  onCitySelect,
  onPickupSearch,
  onAddressChange,
  onCommentChange,
}: Props) {
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const citySuggestRef = useRef<HTMLDivElement | null>(null);

  const selectedPickupPoint =
    options.find((option) => option.id === selectedAddressId) ?? null;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) return;

      if (citySuggestRef.current && !citySuggestRef.current.contains(target)) {
        onCitySuggestionsClose();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onCitySuggestionsClose]);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <h2 className={styles.title}>Условия и способ получения</h2>
        </div>
      </div>

      <div className={styles.deliveryContainer}>
        <div className={styles.fieldWrap}>
          <span className={styles.flagBadge} aria-label="Флаг: Россия">
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

          {selectedCity && deliveryDateText ? (
            <span
              className={`${styles.metaBadge} ${styles.cityEtaBadge}`}
            >
              {deliveryDateText}
            </span>
          ) : selectedCity && quoteLoading ? (
            <SkeletonBlock
              as="span"
              className={`${styles.metaBadge} ${styles.cityEtaBadge} ${styles.metaBadgeLoading}`}
            />
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
            <span className={styles.pickupSelectedLabel}>Пункт выдачи</span>

            <span className={styles.pickupSelectedValue}>
              {selectedPickupPoint
                ? `СДЭК • ${selectedPickupPoint.label}`
                : "Выберите пункт выдачи"}
            </span>
          </button>

          {!selectedCity ? (
            <div className={styles.inlineHint}>
              Сначала выберите населённый пункт
            </div>
          ) : null}

          <PickupPointModal
            open={pickupModalOpen}
            loading={pickupLoading}
            points={options}
            selectedId={selectedAddressId}
            deliveryPrice={deliveryPrice}
            onClose={() => setPickupModalOpen(false)}
            onSelect={onAddressChange}
            onConfirm={() => setPickupModalOpen(false)}
          />
        </div>

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
