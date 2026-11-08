"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DeliveryCityOption, DeliveryOption } from "../types";
import { Icon } from "../../components/ui/Icon";
import { CdekLogo } from "../../components/Delivery/CdekLogo";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { FormCombobox } from "../../components/ui/FormCombobox";
import { PickupPointModal } from "./PickupPointModal";
import { hasValidCoordinates, PickupPointMap } from "./PickupPointMap";
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

const deliveryMethods = [
  { value: "pickup", label: "Пункт выдачи" },
  { value: "courier", label: "Курьером · скоро", disabled: true },
] as const;

export function CheckoutDeliverySection(props: Props) {
  const { options, selectedAddressId, enabled, pickupLoading, quoteLoading, cityLoading, pickupError,
    cityQuery, cityOptions, selectedCity, cityError, pickupPointError, deliveryPrice, deliveryDateText, deliveryCalculated,
    onCityQueryChange, onCitySelect, onPickupSearch, onAddressChange } = props;
  const [open, setOpen] = useState(false);
  const search = useRef(onPickupSearch);
  useEffect(() => { search.current = onPickupSearch; }, [onPickupSearch]);
  const errorId = useId();
  const point = options.find(option => option.id === selectedAddressId) ?? null;
  const previewPoints = useMemo(() => point && hasValidCoordinates(point) ? [point] : [], [point]);
  useEffect(() => { if (open && selectedCity) search.current(); }, [open, selectedCity]);
  const price = deliveryCalculated
    ? deliveryPrice === 0 ? "Бесплатно" : deliveryPrice.toLocaleString("ru-RU") + " ₽" : "";
  return <section className={styles.section} aria-label="Доставка">
    <h3 className={styles.heading}>Способ получения</h3>
    <SegmentedControl items={deliveryMethods} value="pickup" onChange={() => {}} ariaLabel="Способ получения" disabled={!enabled} />
    <div className={styles.method}>
      <div className={styles.selectionLayout}>
        <div className={styles.selection}>
          <CdekLogo height={18} />
          <h4>Пункт выдачи</h4>
          {point && <><p>{point.label}</p><p className={styles.muted}>{selectedCity?.fullName}</p></>}
          {(quoteLoading || price || deliveryDateText) && <p className={styles.deliveryDetails}>{quoteLoading ? <Loader inline label="Расчёт доставки" /> : price}{deliveryDateText && <span>{price && " · "}{deliveryDateText}</span>}</p>}
          <Button type="button" variant={point ? "utility" : "primary"} className={point ? styles.edit : styles.primary}
            aria-label={point ? "Изменить пункт выдачи" : undefined} disabled={!enabled}
            onClick={() => { props.onPickerOpen?.(); setOpen(true); }}>
            {point ? <span className={styles.editLabel}>Изменить пункт <Icon name="arrow-right" size={16} /></span> : "Выбрать пункт выдачи"}
          </Button>
        </div>
        {!open && point && previewPoints.length > 0 && <PickupPointMap key={`${point.id}:${point.latitude}:${point.longitude}`} points={previewPoints} selectedId={point.id} preview className={styles.mapPreview} />}
      </div>
      {pickupPointError && <p role="alert" className={styles.error}>{pickupPointError}</p>}
    </div>
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
