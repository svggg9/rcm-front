import { useState } from "react";

import styles from "../ProductEditPage.module.css";

type Props = {
  label: string;
  value: number | "";
  invalid?: boolean;
  decimal?: boolean;
  onChange: (value: number | "") => void;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function decimalOnly(value: string) {
  const normalized = value.replace(",", ".");
  const [integer = "", ...rest] = normalized.split(".");
  const decimal = rest.join("").replace(/\D/g, "");
  const cleanInteger = integer.replace(/\D/g, "");

  if (normalized.includes(".")) {
    return `${cleanInteger}.${decimal}`;
  }

  return cleanInteger;
}

export function NumberField({
  label,
  value,
  invalid = false,
  decimal = false,
  onChange,
}: Props) {
  const [inputState, setInputState] = useState({
    value,
    displayValue: value === "" ? "" : String(value),
  });

  let displayValue = inputState.displayValue;

  if (inputState.value !== value) {
    displayValue = value === "" ? "" : String(value);
    setInputState({ value, displayValue });
  }

  return (
    <label className={styles.field}>
      <span className={styles.required}>{label}</span>

      <input
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        pattern={decimal ? "[0-9]*[.,]?[0-9]*" : "[0-9]*"}
        value={displayValue}
        onChange={(event) => {
          const nextValue = decimal
            ? decimalOnly(event.target.value)
            : digitsOnly(event.target.value);

          if (nextValue === "" || nextValue === ".") {
            setInputState({ value: "", displayValue: nextValue });
            onChange("");
            return;
          }

          const parsedValue = Number(nextValue);

          setInputState({ value: parsedValue, displayValue: nextValue });
          onChange(parsedValue);
        }}
        className={`${styles.input} ${
          invalid ? styles.fieldInvalid : ""
        } ${value === "" ? styles.requiredEmpty : ""}`}
      />
    </label>
  );
}
