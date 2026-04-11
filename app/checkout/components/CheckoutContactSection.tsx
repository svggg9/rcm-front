"use client";

import styles from "../Checkout.module.css";

type Props = {
  email: string;
  fullName: string;
  phone: string;
  confirmed: boolean;
  expanded: boolean;
  onEdit: () => void;
  onConfirm: () => void;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
};

export function CheckoutContactSection({
  email,
  fullName,
  phone,
  confirmed,
  expanded,
  onEdit,
  onConfirm,
  onEmailChange,
  onFullNameChange,
  onPhoneChange,
}: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderMain}>
          <span className={styles.stepBadge}>1</span>
          <h2 className={styles.sectionTitle}>Контактные данные</h2>
        </div>

        {confirmed ? (
          <button type="button" onClick={onEdit} className={styles.sectionEditBtn}>
            Изменить
          </button>
        ) : null}
      </div>

      {!expanded && confirmed ? (
        <div className={styles.sectionSummary}>
          <div>{fullName}</div>
          <div className={styles.sectionSummaryMuted}>{email}</div>
          <div className={styles.sectionSummaryMuted}>{phone}</div>
        </div>
      ) : (
        <div className={styles.sectionBody}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="example@mail.com"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>ФИО</span>
              <input
                className={styles.input}
                value={fullName}
                onChange={(event) => onFullNameChange(event.target.value)}
                placeholder="Иван Иванов"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Телефон</span>
              <input
                className={styles.input}
                value={phone}
                onChange={(event) => onPhoneChange(event.target.value)}
                placeholder="+7 999 123-45-67"
              />
            </label>
          </div>

          <button type="button" onClick={onConfirm} className={styles.confirmBtn}>
            Подтвердить контакты
          </button>
        </div>
      )}
    </section>
  );
}