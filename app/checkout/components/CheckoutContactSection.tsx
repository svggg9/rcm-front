"use client";

import { useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { TextInput } from "../../components/ui/TextInput";
import { formatRussianPhone } from "../../lib/phone";
import { isValidCheckoutPhone } from "../lib/checkoutPhone";
import styles from "./CheckoutContactSection.module.css";

type Props = {
  fullName: string; phone: string; countryCode?: string; fullNameError?: string | null; phoneError?: string | null;
  disabled?: boolean; onFullNameChange: (value: string) => void; onPhoneChange: (value: string) => void;
  onFullNameBlur?: () => void; onPhoneBlur?: () => void;
};
export function CheckoutContactSection({ fullName, phone, countryCode = "RU", fullNameError, phoneError, disabled, onFullNameChange, onPhoneChange, onFullNameBlur, onPhoneBlur }: Props) {
  const [editing, setEditing] = useState(false);
  const complete = Boolean(fullName.trim()) && isValidCheckoutPhone(phone, countryCode) && !fullNameError && !phoneError;
  const compact = complete && !editing;
  return <section className={styles.section} aria-label="Получатель">
    <div className={styles.header}><h3>Получатель</h3>{compact && <button type="button" className={styles.edit}
      aria-label="Изменить данные получателя" disabled={disabled} onClick={() => setEditing(true)}><Icon name="pencil" size={20} strokeWidth={1} /></button>}</div>
    {compact ? <div className={styles.summary}><p>{fullName.trim()}</p><p className={styles.muted}>{countryCode === "RU" ? formatRussianPhone(phone) : phone}</p></div> : <div className={styles.fields}>
      <TextInput label="Имя и фамилия" value={fullName} error={fullNameError} disabled={disabled} required maxLength={120} autoComplete="name" enterKeyHint="next" onBlur={onFullNameBlur} onChange={event => onFullNameChange(event.target.value)} />
      {countryCode === "RU" ? <PhoneInput label="Телефон" value={phone} error={phoneError} disabled={disabled} required enterKeyHint="done" onBlur={onPhoneBlur} onChange={event => onPhoneChange(event.target.value)} /> :
        <TextInput label="Телефон" type="tel" inputMode="tel" autoComplete="tel" hint="Укажите номер с кодом страны" value={phone} error={phoneError} disabled={disabled} required maxLength={32} enterKeyHint="done" onBlur={onPhoneBlur} onChange={event => onPhoneChange(event.target.value)} />}
      {complete && <button type="button" className={styles.done} disabled={disabled} onClick={() => setEditing(false)}>Готово</button>}
    </div>}
  </section>;
}
