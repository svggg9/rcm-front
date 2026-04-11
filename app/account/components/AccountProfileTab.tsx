"use client";

import styles from "../Account.module.css";

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
  onLastNameChange,
  onFirstNameChange,
  onMiddleNameChange,
  onBirthDateChange,
  onGenderChange,
  onPhoneChange,
}: Props) {
  return (
    <>
      <div className={styles.sectionTitle}>Мои данные</div>

      <section className={styles.profileCard}>
        <div className={styles.profileHead}>
          <div className={styles.avatar}>{initials}</div>

          <div className={styles.profileMeta}>
            <div className={styles.profileName}>{displayName}</div>
            <div className={styles.profileSub}>Личный кабинет покупателя</div>
          </div>
        </div>
      </section>

      <section className={styles.formCard}>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Фамилия</span>
            <input
              className={styles.input}
              value={lastName}
              onChange={(event) => onLastNameChange(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Имя</span>
            <input
              className={styles.input}
              value={firstName}
              onChange={(event) => onFirstNameChange(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Отчество</span>
            <input
              className={styles.input}
              value={middleName}
              onChange={(event) => onMiddleNameChange(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Дата рождения</span>
            <input
              className={styles.input}
              value={birthDate}
              onChange={(event) => onBirthDateChange(event.target.value)}
              placeholder="дд.мм.гггг"
            />
          </label>
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

        <div className={styles.infoRows}>
          <div className={styles.infoRow}>
            <div className={styles.infoLabel}>E-mail</div>
            <div className={styles.infoValue}>{email}</div>
          </div>

          <div className={styles.infoRow}>
            <div className={styles.infoLabel}>Роль</div>
            <div className={styles.infoValue}>{role}</div>
          </div>

          <div className={styles.infoRow}>
            <div className={styles.infoLabel}>Телефон</div>
            <div className={styles.infoValueWrap}>
              <input
                className={styles.inlineInput}
                value={phone}
                onChange={(event) => onPhoneChange(event.target.value)}
                placeholder="+7 999 123-45-67"
              />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.saveBtn}>
            Сохранить
          </button>
        </div>
      </section>
    </>
  );
}