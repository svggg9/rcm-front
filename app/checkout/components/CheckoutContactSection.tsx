"use client";

import { useId } from "react";

import { PhoneInput } from "../../components/ui/PhoneInput";
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

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <h2 className={styles.title}>Получатель</h2>
        </div>
      </div>

      <div className={styles.body}>
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
            <span className={styles.fieldLabel}>Имя и фамилия</span>
            <input
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
      </div>
    </section>
  );
}
