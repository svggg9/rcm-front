"use client";

import type { InputHTMLAttributes } from "react";

import { Button } from "../../components/ui/Button";

import styles from "./AccountProfileTab.module.css";

type Props = {
  email: string;
  firstName: string;
  phone: string;
  defaultDeliveryAddress: string;
  defaultDeliveryMethod: string | null;
  defaultDeliveryCityName: string;
  deliveryFullName: string;
  defaultDeliveryApartment: string;
  defaultDeliveryFloor: string;
  defaultDeliveryIntercom: string;
  saving: boolean;
  changed: boolean;
  savedMessage: string | null;
  onSave: () => void;
  onFirstNameChange: (value: string) => void;
  onDeliveryFullNameChange: (value: string) => void;
  onDefaultDeliveryAddressChange: (value: string) => void;
  onDefaultDeliveryCityNameChange: (value: string) => void;
  onDefaultDeliveryApartmentChange: (value: string) => void;
  onDefaultDeliveryFloorChange: (value: string) => void;
  onDefaultDeliveryIntercomChange: (value: string) => void;
};

type ProfileFieldProps = {
  label: string;
};

function formatDeliveryMethod(value: string | null): string {
  if (value === "COURIER") return "Курьером";
  if (value === "PICKUP_POINT" || value === "PICKUP") return "ПВЗ СДЭК";

  return "Не указано";
}

function ProfileTextField({
  label,
  className = "",
  ...props
}: ProfileFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={styles.fieldWrap}>
      <span className={styles.fieldLabel}>{label}</span>
      <input className={`${styles.input} ${className}`.trim()} {...props} />
    </label>
  );
}

export function AccountProfileTab({
  email,
  firstName,
  phone,
  defaultDeliveryAddress,
  defaultDeliveryMethod,
  defaultDeliveryCityName,
  deliveryFullName,
  defaultDeliveryApartment,
  defaultDeliveryFloor,
  defaultDeliveryIntercom,
  saving,
  changed,
  savedMessage,
  onSave,
  onFirstNameChange,
  onDeliveryFullNameChange,
  onDefaultDeliveryAddressChange,
  onDefaultDeliveryCityNameChange,
  onDefaultDeliveryApartmentChange,
  onDefaultDeliveryFloorChange,
  onDefaultDeliveryIntercomChange,
}: Props) {
  const saveButtonText = savedMessage && !changed ? savedMessage : "Сохранить";

  return (
    <section className={styles.page}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Основные данные</h2>
        </div>

        <div className={styles.formGrid}>
          <ProfileTextField
            label="Имя"
            value={firstName}
            onChange={(event) => onFirstNameChange(event.target.value)}
          />

          <ProfileTextField
            label="Телефон"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            placeholder="+7 999 123-45-67"
            disabled
          />

          <ProfileTextField label="E-mail" value={email} disabled />
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Данные доставки</h2>
        </div>

        <div className={styles.formGrid}>
          <ProfileTextField
            label="Фамилия, имя и отчество"
            value={deliveryFullName}
            onChange={(event) => onDeliveryFullNameChange(event.target.value)}
          />

          <ProfileTextField
            label="Способ доставки"
            value={formatDeliveryMethod(defaultDeliveryMethod)}
            disabled
          />

          <ProfileTextField
            label="Город"
            value={defaultDeliveryCityName}
            onChange={(event) => onDefaultDeliveryCityNameChange(event.target.value)}
          />

          <ProfileTextField
            label="Адрес"
            value={defaultDeliveryAddress}
            onChange={(event) => onDefaultDeliveryAddressChange(event.target.value)}
          />

          <ProfileTextField
            label="Квартира"
            value={defaultDeliveryApartment}
            onChange={(event) => onDefaultDeliveryApartmentChange(event.target.value)}
          />

          <ProfileTextField
            label="Этаж"
            value={defaultDeliveryFloor}
            onChange={(event) => onDefaultDeliveryFloorChange(event.target.value)}
          />

          <ProfileTextField
            label="Домофон"
            value={defaultDeliveryIntercom}
            onChange={(event) => onDefaultDeliveryIntercomChange(event.target.value)}
          />
        </div>
      </section>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="primary"
          onClick={onSave}
          disabled={saving || !changed}
        >
          {saveButtonText}
        </Button>
      </div>
    </section>
  );
}
