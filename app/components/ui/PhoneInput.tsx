import type { InputHTMLAttributes } from "react";

import { TextInput } from "./TextInput";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string | null;
  hint?: string;
};

export function PhoneInput({
  label = "Телефон",
  placeholder = "+7 999 123-45-67",
  inputMode = "tel",
  autoComplete = "tel",
  ...props
}: Props) {
  return (
    <TextInput
      {...props}
      type="tel"
      label={label}
      placeholder={placeholder}
      inputMode={inputMode}
      autoComplete={autoComplete}
    />
  );
}