"use client";

import styles from "./CheckoutContactSection.module.css";

type Props = {
  email: string;
  fullName: string;
  phone: string;
  otherRecipientEnabled: boolean;
  otherRecipientName: string;
  otherRecipientPhone: string;
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
  onEmailChange,
  onFullNameChange,
  onPhoneChange,
  onOtherRecipientEnabledChange,
  onOtherRecipientNameChange,
  onOtherRecipientPhoneChange,
}: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.stepBadge}>2</span>
          <h2 className={styles.title}>Получатель</h2>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.fieldWrap}>
          <span className={styles.fieldLabel}>Телефон</span>
          <input
            className={styles.textField}
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
          />
        </div>

        <div className={styles.fieldWrap}>
          <span className={styles.fieldLabel}>Электронная почта</span>
          <input
            className={styles.textField}
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
          />
        </div>

        <div className={styles.fieldWrap}>
          <span className={styles.fieldLabel}>Фамилия, имя и отчество</span>
          <input
            className={styles.textField}
            value={fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            autoComplete="name"
          />
        </div>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={otherRecipientEnabled}
            onChange={(event) =>
              onOtherRecipientEnabledChange(event.target.checked)
            }
          />
          <span className={styles.checkboxMark} aria-hidden="true" />
          <span className={styles.checkboxText}>Заберет другой человек</span>
        </label>

        {otherRecipientEnabled ? (
          <div className={styles.recipientFields}>
            <div className={styles.fieldWrap}>
              <span className={styles.fieldLabel}>ФИО получателя</span>
              <input
                className={styles.textField}
                value={otherRecipientName}
                onChange={(event) =>
                  onOtherRecipientNameChange(event.target.value)
                }
                autoComplete="name"
              />
            </div>

            <div className={styles.fieldWrap}>
              <span className={styles.fieldLabel}>Телефон получателя</span>
              <input
                className={styles.textField}
                value={otherRecipientPhone}
                onChange={(event) =>
                  onOtherRecipientPhoneChange(event.target.value)
                }
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}