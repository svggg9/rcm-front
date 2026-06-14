"use client";

import type { InputHTMLAttributes } from "react";

import { Button } from "../../components/ui/Button";
import { ChoiceMark } from "../../components/ui/ChoiceMark";

import styles from "./AccountProfileTab.module.css";

type Props = {
  displayName: string;
  initials: string;
  email: string;
  role: string;
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  gender: "men" | "women" | "";
  phone: string;
  saving: boolean;
  changed: boolean;
  savedMessage: string | null;
  onSave: () => void;
  onLastNameChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onMiddleNameChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onGenderChange: (value: "men" | "women") => void;
  onPhoneChange: (value: string) => void;
};

type ProfileFieldProps = {
  label: string;
};

function getRussianPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.startsWith("7")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

function formatRussianPhone(value: string): string {
  const digits = getRussianPhoneDigits(value);

  let result = "+7";

  if (digits.length > 0) result += ` ${digits.slice(0, 3)}`;
  if (digits.length > 3) result += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) result += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) result += `-${digits.slice(8, 10)}`;

  return result;
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
  displayName,
  initials,
  email,
  role,
  lastName,
  firstName,
  middleName,
  birthDate,
  gender,
  phone,
  saving,
  changed,
  savedMessage,
  onSave,
  onLastNameChange,
  onFirstNameChange,
  onMiddleNameChange,
  onBirthDateChange,
  onGenderChange,
  onPhoneChange,
}: Props) {
  const saveButtonText = savedMessage && !changed ? savedMessage : "Сохранить";

  return (
    <section className={styles.page}>
      <section className={styles.profileCard}>
        <div className={styles.profileHead}>
          <div className={styles.avatar}>{initials}</div>

          <div className={styles.profileMeta}>
            <div className={styles.profileName}>{displayName}</div>
            <div className={styles.profileSub}>Личный кабинет покупателя</div>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Основная информация</h2>
        </div>

        <div className={styles.formGrid}>
          <ProfileTextField
            label="Фамилия"
            value={lastName}
            onChange={(event) => onLastNameChange(event.target.value)}
          />

          <ProfileTextField
            label="Имя"
            value={firstName}
            onChange={(event) => onFirstNameChange(event.target.value)}
          />

          <ProfileTextField
            label="Отчество"
            value={middleName}
            onChange={(event) => onMiddleNameChange(event.target.value)}
          />

          <ProfileTextField
            label="Дата рождения"
            value={birthDate}
            placeholder="дд.мм.гггг"
            onChange={(event) => onBirthDateChange(event.target.value)}
          />
        </div>

        <div className={styles.subSection}>
          <div className={styles.subSectionTitle}>Пол</div>

          <div className={styles.choiceGrid}>
            {[
              { value: "men" as const, label: "Мужской" },
              { value: "women" as const, label: "Женский" },
            ].map((option) => {
              const checked = gender === option.value;

              return (
                <label
                  key={option.value}
                  className={`${styles.choiceOption} ${
                    checked ? styles.choiceOptionActive : ""
                  }`.trim()}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={checked}
                    onChange={() => onGenderChange(option.value)}
                  />
                  <span>{option.label}</span>
                  <ChoiceMark checked={checked} />
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Контакты</h2>
        </div>

        <div className={styles.formGrid}>
          <ProfileTextField label="E-mail" value={email} disabled />

          <ProfileTextField label="Роль" value={role} disabled />

          <ProfileTextField
            label="Телефон"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            placeholder="+7 999 123-45-67"
            onChange={(event) => onPhoneChange(formatRussianPhone(event.target.value))}
            onFocus={() => {
              if (!phone) {
                onPhoneChange("+7");
              }
            }}
            onBlur={() => {
              if (phone === "+7" || phone === "+7 ") {
                onPhoneChange("");
              }
            }}
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
