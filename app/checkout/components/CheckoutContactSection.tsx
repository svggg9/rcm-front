"use client";

import { useId, useState } from "react";

import { Icon } from "../../components/ui/Icon";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { isValidPhone } from "../../lib/validation";
import { formatRussianPhoneInput } from "../../lib/phone";
import styles from "./CheckoutContactSection.module.css";

type Props = {
  fullName: string;
  phone: string;
  fullNameError?: string | null;
  phoneError?: string | null;
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
};

export function CheckoutContactSection({
  fullName,
  phone,
  fullNameError,
  phoneError,
  onFullNameChange,
  onPhoneChange,
}: Props) {
  const fullNameErrorId = useId();
  const fullNameId = useId();
  const bodyId = useId();
  const [editing, setEditing] = useState(false);
  const complete = Boolean(fullName.trim()) && isValidPhone(phone);
  const canCollapse = complete && !fullNameError && !phoneError;
  const compact = canCollapse && !editing;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <h2 className={styles.title}>Получатель</h2>
        </div>
        {compact ? (
          <button
            type="button"
            className={styles.editButton}
            aria-label="Изменить данные получателя"
            aria-expanded={false}
            aria-controls={bodyId}
            onClick={() => setEditing(true)}
          >
            <Icon name="pencil" size={19} strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      {compact ? (
        <div className={styles.mobileSummary}>
          <span>{fullName.trim()}</span>
          <span className={styles.summaryMuted}>+7 {formatRussianPhoneInput(phone)}</span>
        </div>
      ) : null}

      <div
        id={bodyId}
        className={`${styles.body} ${compact ? styles.bodyCompact : ""}`}
        onFocusCapture={() => setEditing(true)}
      >
        <div className={styles.contactGrid}>
          <PhoneInput
            label="Телефон"
            fieldVariant="boxed"
            value={phone}
            error={phoneError}
            onChange={(event) => onPhoneChange(event.target.value)}
            required
          />

          <div className={styles.fieldWrap}>
            <label className={styles.fieldLabel} htmlFor={fullNameId}>Имя и фамилия</label>
            <input
              id={fullNameId}
              className={styles.textField}
              value={fullName}
              aria-invalid={fullNameError ? "true" : undefined}
              aria-describedby={fullNameError ? fullNameErrorId : undefined}
              onChange={(event) => onFullNameChange(event.target.value)}
              autoComplete="name"
            />
            {fullNameError ? (
              <div id={fullNameErrorId} className="fieldError">
                {fullNameError}
              </div>
            ) : null}
          </div>
        </div>
        {canCollapse ? (
          <button
            type="button"
            className={styles.doneButton}
            onClick={() => setEditing(false)}
          >
            Готово
          </button>
        ) : null}
      </div>
    </section>
  );
}
