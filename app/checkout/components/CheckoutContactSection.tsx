"use client";

import { PhoneInput } from "../../components/ui/PhoneInput";
import styles from "./CheckoutContactSection.module.css";

type Props = {
  fullName: string;
  phone: string;
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
};

export function CheckoutContactSection({
  fullName,
  phone,
  onFullNameChange,
  onPhoneChange,
}: Props) {
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
            onChange={(event) => onPhoneChange(event.target.value)}
            required
          />

          <div className={styles.fieldWrap}>
            <span className={styles.fieldLabel}>Имя и фамилия</span>
            <input
              className={styles.textField}
              value={fullName}
              onChange={(event) => onFullNameChange(event.target.value)}
              autoComplete="name"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
