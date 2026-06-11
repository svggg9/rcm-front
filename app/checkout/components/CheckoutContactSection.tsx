"use client";

import styles from "../Checkout.module.css";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { TextInput } from "../../components/ui/TextInput";

type Props = {
  email: string;
  fullName: string;
  phone: string;
  otherRecipientEnabled: boolean;
  otherRecipientName: string;
  otherRecipientPhone: string;
  confirmed: boolean;
  expanded: boolean;
  onEdit: () => void;
  onConfirm: () => void;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onOtherRecipientEnabledChange: (value: boolean) => void;
  onOtherRecipientNameChange: (value: string) => void;
  onOtherRecipientPhoneChange: (value: string) => void;
};

export function CheckoutContactSection({
  email,
  fullName,
  phone,
  otherRecipientEnabled,
  otherRecipientName,
  otherRecipientPhone,
  confirmed,
  expanded,
  onEdit,
  onConfirm,
  onEmailChange,
  onFullNameChange,
  onPhoneChange,
  onOtherRecipientEnabledChange,
  onOtherRecipientNameChange,
  onOtherRecipientPhoneChange,
}: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderMain}>
          <span className={styles.stepBadge}>2</span>
          <h2 className={styles.sectionTitle}>Получатель</h2>
        </div>

        {confirmed ? (
          <button
            type="button"
            onClick={onEdit}
            className={styles.sectionEditBtn}
          >
            Изменить
          </button>
        ) : null}
      </div>

      {!expanded && confirmed ? (
        <div className={styles.sectionSummary}>
          <div>{fullName}</div>
          <div className={styles.sectionSummaryMuted}>{email}</div>
          <div className={styles.sectionSummaryMuted}>{phone}</div>

          {otherRecipientEnabled ? (
            <div className={styles.sectionSummaryMuted}>
              Заберет другой человек: {otherRecipientName}, {otherRecipientPhone}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.sectionBody}>
          <div className={styles.formGrid}>
            <PhoneInput
              required
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
            />

            <TextInput
              label="Электронная почта"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="example@mail.com"
            />

            <TextInput
              label="Фамилия, имя и отчество"
              value={fullName}
              onChange={(event) => onFullNameChange(event.target.value)}
              placeholder="Иванов Иван Иванович"
            />
          </div>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={otherRecipientEnabled}
              onChange={(event) =>
                onOtherRecipientEnabledChange(event.target.checked)
              }
            />
            <span>Заказ заберет другой человек</span>
          </label>

          {otherRecipientEnabled ? (
            <div className={styles.formGrid}>
              <TextInput
                label="ФИО получателя"
                value={otherRecipientName}
                onChange={(event) =>
                  onOtherRecipientNameChange(event.target.value)
                }
                placeholder="Иванов Иван Иванович"
              />

              <PhoneInput
                label="Телефон получателя"
                value={otherRecipientPhone}
                onChange={(event) =>
                  onOtherRecipientPhoneChange(event.target.value)
                }
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={onConfirm}
            className={styles.confirmBtn}
          >
            Подтвердить получателя
          </button>
        </div>
      )}
    </section>
  );
}