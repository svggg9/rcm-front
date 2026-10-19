"use client";

import { useId, useState } from "react";
import styles from "./OneTimeCodeInput.module.css";
import { InputControl } from "./InputControl";

export function OneTimeCodeInput({ value, onChange, disabled = false, error, label, hint, onBlur, enterKeyHint = "done" }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
  label?: string;
  hint?: string;
  onBlur?: () => void;
  enterKeyHint?: React.InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];
}) {
  const id = useId();
  const [active, setActive] = useState(0);
  function change(raw: string) {
    const next = raw.replace(/\D/g, "").slice(0, 6);
    setActive(Math.min(next.length, 5));
    onChange(next);
  }
  return <div className={styles.field}>
    <label htmlFor={id} className={label ? styles.label : "visuallyHidden"}>{label ?? "Код из письма"}</label>
    <div className={styles.control} data-error={Boolean(error) || undefined} data-disabled={disabled || undefined}>
      <div className={styles.cells} aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => <span key={index} data-active={active === index || undefined}>{value[index]}</span>)}
      </div>
      <InputControl id={id} name="code" className={styles.input} value={value} type="text" inputMode="numeric"
        autoComplete="one-time-code" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint={enterKeyHint} maxLength={6} required disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={[error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined}
        onChange={event => change(event.target.value)}
        onBlur={onBlur}
        onPaste={event => { event.preventDefault(); change(event.clipboardData.getData("text")); }}
        onSelect={event => setActive(Math.min(event.currentTarget.selectionStart ?? value.length, 5))} />
    </div>
    {error && <p id={`${id}-error`} className="fieldError" role="alert">{error}</p>}
    {hint && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
  </div>;
}
