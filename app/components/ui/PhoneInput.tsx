import type { InputHTMLAttributes } from "react";

import {
  formatRussianPhoneInput,
  getRussianPhoneDigits,
  normalizeRussianPhone,
} from "../../lib/phone";
import { Field } from "./Field";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  label?: string;
  error?: string | null;
  hint?: string;
  fieldVariant?: "line" | "boxed";
  hideLabel?: boolean;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

function createChangeEvent(
  event:
    | React.ChangeEvent<HTMLInputElement>
    | React.FocusEvent<HTMLInputElement>,
  value: string
): React.ChangeEvent<HTMLInputElement> {
  return {
    ...event,
    target: {
      ...event.target,
      value,
    },
    currentTarget: {
      ...event.currentTarget,
      value,
    },
  } as React.ChangeEvent<HTMLInputElement>;
}

export function PhoneInput({
  label = "Телефон",
  placeholder = "",
  inputMode = "tel",
  autoComplete = "tel",
  title = "Введите 10 цифр номера телефона после +7",
  fieldVariant = "line",
  hideLabel = false,
  hint,
  value,
  onChange,
  onFocus,
  onBlur,
  className = "",
  error,
  required,
  ...props
}: Props) {
  const displayValue = formatRussianPhoneInput(value);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const formatted = normalizeRussianPhone(event.target.value);
    onChange(createChangeEvent(event, formatted));
  }

  function handleFocus(event: React.FocusEvent<HTMLInputElement>) {
    onFocus?.(event);
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    if (!getRussianPhoneDigits(value)) {
      onChange(createChangeEvent(event, ""));
    }

    onBlur?.(event);
  }

  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      variant={fieldVariant}
      hideLabel={hideLabel}
    >
      <span
        className={`phoneInputShell ${error ? "inputError" : ""}`.trim()}
      >
        <span className="phoneInputPrefix">+7</span>
        <input
          {...props}
          type="tel"
          className={`phoneInput ${className}`.trim()}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={displayValue}
          pattern="[(][0-9]{3}[)] [0-9]{3} [0-9]{2}-[0-9]{2}"
          minLength={15}
          maxLength={15}
          title={title}
          aria-invalid={error ? "true" : undefined}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </span>
    </Field>
  );
}
