import type { InputHTMLAttributes } from "react";

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

function getRussianPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.startsWith("7")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

function formatRussianPhone(value: string): string {
  const digits = getRussianPhoneDigits(value);

  return digits.length > 0 ? `+7${digits}` : "";
}

function formatRussianPhoneInputValue(value: string): string {
  const digits = getRussianPhoneDigits(value);

  if (digits.length <= 3) {
    return digits;
  }

  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

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
  const displayValue = formatRussianPhoneInputValue(value);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatRussianPhone(event.target.value);
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
          pattern="[0-9]{3} [0-9]{7}"
          minLength={11}
          maxLength={11}
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
