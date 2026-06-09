import type { InputHTMLAttributes } from "react";

import { TextInput } from "./TextInput";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  label?: string;
  error?: string | null;
  hint?: string;
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

  let result = "+7";

  if (digits.length > 0) result += ` ${digits.slice(0, 3)}`;
  if (digits.length > 3) result += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) result += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) result += `-${digits.slice(8, 10)}`;

  return result;
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
  placeholder = "+7 999 123-45-67",
  inputMode = "tel",
  autoComplete = "tel",
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}: Props) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatRussianPhone(event.target.value);
    onChange(createChangeEvent(event, formatted));
  }

  function handleFocus(event: React.FocusEvent<HTMLInputElement>) {
    if (!value) {
      onChange(createChangeEvent(event, "+7"));
    }

    onFocus?.(event);
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    if (value === "+7" || value === "+7 ") {
      onChange(createChangeEvent(event, ""));
    }

    onBlur?.(event);
  }

  return (
    <TextInput
      {...props}
      type="tel"
      label={label}
      placeholder={placeholder}
      inputMode={inputMode}
      autoComplete={autoComplete}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}