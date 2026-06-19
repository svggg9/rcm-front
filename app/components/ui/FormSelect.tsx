"use client";

import { useEffect, useId, useRef, useState } from "react";

import styles from "./FormControl.module.css";

type SelectValue = string | number;

type Option = {
  value: SelectValue;
  label: string;
  disabled?: boolean;
};

type Props<TValue extends SelectValue> = {
  label: string;
  value: TValue | "";
  options: Option[];
  placeholder?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  full?: boolean;
  onChange: (value: TValue | "") => void;
};

export function FormSelect<TValue extends SelectValue>({
  label,
  value,
  options,
  placeholder,
  invalid = false,
  required = false,
  disabled = false,
  full = false,
  onChange,
}: Props<TValue>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const hasValue = value !== "";
  const displayValue = selectedOption?.label ?? placeholder ?? "";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function selectValue(nextValue: TValue | "") {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className={full ? styles.fieldFull : styles.field} ref={rootRef}>
      <span className={required ? styles.required : undefined}>{label}</span>

      <div
        className={`${styles.select} ${open ? styles.selectOpen : ""} ${
          invalid ? styles.invalid : ""
        } ${required && !hasValue ? styles.requiredEmpty : ""} ${
          disabled ? styles.selectDisabled : ""
        }`}
      >
        <button
          type="button"
          className={`${styles.selectButton} ${hasValue ? "" : styles.placeholder}`}
          disabled={disabled}
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={hasValue ? styles.selectValue : styles.selectPlaceholderValue}>{displayValue}</span>
          <span className={styles.chevron} aria-hidden="true">
            <svg viewBox="0 0 16 16" focusable="false">
              <path d="M4 6L8 10L12 6" />
            </svg>
          </span>
        </button>

        <div className={styles.menu} id={listboxId} role="listbox">
          <div className={styles.options}>
            {placeholder && !required ? (
              <button
                type="button"
                className={styles.option}
                role="option"
                aria-selected={!hasValue}
                onClick={() => selectValue("")}
              >
                <span className={`${styles.optionLabel} ${styles.optionPlaceholder}`}>{placeholder}</span>
              </button>
            ) : null}

            {options.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                className={styles.option}
                role="option"
                disabled={option.disabled}
                aria-selected={option.value === value}
                onClick={() => selectValue(option.value as TValue)}
              >
                <span className={`${styles.optionLabel} ${styles.optionValue}`}>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
