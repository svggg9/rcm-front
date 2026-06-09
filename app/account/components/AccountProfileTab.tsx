"use client";

import { Button } from "../../components/ui/Button";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { TextInput } from "../../components/ui/TextInput";

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
  onSave: () => void;
  onLastNameChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onMiddleNameChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onGenderChange: (value: "men" | "women") => void;
  onPhoneChange: (value: string) => void;
};

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
  onSave,
  onLastNameChange,
  onFirstNameChange,
  onMiddleNameChange,
  onBirthDateChange,
  onGenderChange,
  onPhoneChange,
}: Props) {
  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.kicker}>Профиль</div>
          <h1 className={styles.title}>Мои данные</h1>
          <p className={styles.hint}>
            Контактная информация для заказов, доставки и уведомлений.
          </p>
        </div>
      </div>

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
          <p>ФИО и базовые данные покупателя.</p>
        </div>

        <div className={styles.formGrid}>
          <TextInput
            label="Фамилия"
            value={lastName}
            onChange={(event) => onLastNameChange(event.target.value)}
          />

          <TextInput
            label="Имя"
            value={firstName}
            onChange={(event) => onFirstNameChange(event.target.value)}
          />

          <TextInput
            label="Отчество"
            value={middleName}
            onChange={(event) => onMiddleNameChange(event.target.value)}
          />

          <TextInput
            label="Дата рождения"
            value={birthDate}
            onChange={(event) => onBirthDateChange(event.target.value)}
            placeholder="дд.мм.гггг"
          />
        </div>

        <div className={styles.subSection}>
          <div className={styles.subSectionTitle}>Пол</div>

          <div className={styles.radioRow}>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="gender"
                value="men"
                checked={gender === "men"}
                onChange={() => onGenderChange("men")}
              />
              <span>Мужской</span>
            </label>

            <label className={styles.radioOption}>
              <input
                type="radio"
                name="gender"
                value="women"
                checked={gender === "women"}
                onChange={() => onGenderChange("women")}
              />
              <span>Женский</span>
            </label>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Контакты</h2>
          <p>E-mail и телефон для связи по заказам.</p>
        </div>

        <div className={styles.formGrid}>
          <TextInput label="E-mail" value={email} disabled />

          <TextInput label="Роль" value={role} disabled />

          <PhoneInput
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="primary" onClick={onSave} disabled={saving}>
            {saving ? "Сохраняем…" : "Сохранить"}
          </Button>
        </div>
      </section>
    </section>
  );
}