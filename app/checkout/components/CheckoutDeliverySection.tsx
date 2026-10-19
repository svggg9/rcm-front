"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DeliveryCityOption, DeliveryOption } from "../types";
import { Icon } from "../../components/ui/Icon";
import { CdekLogo } from "../../components/Delivery/CdekLogo";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FormCombobox } from "../../components/ui/FormCombobox";
import { PickupPointModal } from "./PickupPointModal";
import styles from "./CheckoutDeliverySection.module.css";

type Props = {
  options: DeliveryOption[]; selectedAddressId: string; enabled: boolean;
  pickupLoading: boolean; quoteLoading: boolean; cityLoading?: boolean; pickupError?: string | null;
  countryCode: "RU"; cityQuery: string; cityOptions: DeliveryCityOption[]; selectedCity: DeliveryCityOption | null;
  cityError?: string | null; pickupPointError?: string | null; deliveryPrice: number; deliveryDateText: string; deliveryCalculated?: boolean;
  onCountryChange: (value: "RU") => void; onCityQueryChange: (value: string) => void;
  onCitySuggestionsClose: () => void; onCitySelect: (city: DeliveryCityOption) => void;
  onPickupSearch: () => void; onAddressChange: (value: string) => void;
  onPickerOpen?: () => void; onPickerCancel?: () => void; onPickerConfirm?: () => void;
};

export function CheckoutDeliverySection(props: Props) {
  const { options, selectedAddressId, enabled, pickupLoading, quoteLoading, cityLoading, pickupError,
    cityQuery, cityOptions, selectedCity, cityError, pickupPointError, deliveryPrice, deliveryDateText, deliveryCalculated,
    onCityQueryChange, onCitySelect, onPickupSearch, onAddressChange } = props;
  const [open, setOpen] = useState(false);
  const search = useRef(onPickupSearch);
  useEffect(() => { search.current = onPickupSearch; }, [onPickupSearch]);
  const errorId = useId();
  const point = options.find(option => option.id === selectedAddressId) ?? null;
  useEffect(() => { if (open && selectedCity) search.current(); }, [open, selectedCity]);
  const price = deliveryCalculated
    ? deliveryPrice === 0 ? "Бесплатно" : deliveryPrice.toLocaleString("ru-RU") + " ₽" : "";
  return <section className={styles.section} aria-label="Доставка">
    <div className={styles.method}>
      <div className={styles.methodHeader}><span className={styles.checked} aria-hidden="true" /><div><h3>Пункт выдачи</h3><span className={styles.provider}><CdekLogo height={18} />{quoteLoading ? <Loader inline label="Расчёт доставки" /> : price && <span className={styles.muted}>{price}</span>}</span></div></div>
      {point && <div className={styles.selection}><p>{point.label}</p><p className={styles.muted}>{selectedCity?.fullName}</p>{deliveryDateText && <p className={styles.muted}>{deliveryDateText}</p>}</div>}
      <Button type="button" variant={point ? "secondary" : "primary"} className={point ? styles.edit : styles.primary}
        aria-label={point ? "Изменить пункт выдачи" : undefined} disabled={!enabled}
        onClick={() => { props.onPickerOpen?.(); setOpen(true); }}>
        {point ? <Icon name="pencil" size={20} strokeWidth={1} /> : "Выбрать пункт выдачи"}
      </Button>
      {pickupPointError && <p role="alert" className={styles.error}>{pickupPointError}</p>}
    </div>
    <button type="button" className={`${styles.method} ${styles.unavailable}`} disabled>
      <span className={styles.methodHeader}><span className={styles.unchecked} aria-hidden="true" /><span className={styles.methodName}>Курьером</span><StatusBadge>Скоро</StatusBadge></span>
    </button>
    <PickupPointModal open={open} loading={pickupLoading} points={options} selectedId={selectedAddressId} cityKey={selectedCity?.code}
      deliveryPrice={deliveryPrice} error={pickupError} onRetry={onPickupSearch}
      cityField={<div className={styles.city}>
        <FormCombobox label="Город" value={selectedCity?.code ?? ""} customValue={cityQuery}
          options={cityOptions.map(city => ({ value: city.code, label: city.fullName }))}
          suggestionsOnInput showModerationBadge={false} allowCustomValue={false} loading={cityLoading}
          emptyText={cityQuery.trim().length < 2 ? "Введите не меньше двух букв" : "Город не найден"}
          onQueryChange={onCityQueryChange} placeholder="Начните вводить город" invalid={Boolean(cityError)} errorId={errorId}
          onChange={value => { const city = cityOptions.find(city => city.code === value); if (city) onCitySelect(city); }} />
        {cityError && <p role="alert" id={errorId} className={styles.error}>{cityError}</p>}
      </div>}
      onClose={() => { props.onPickerCancel?.(); setOpen(false); }} onSelect={onAddressChange}
      onConfirm={() => { props.onPickerConfirm?.(); setOpen(false); }} />
  </section>;
}
