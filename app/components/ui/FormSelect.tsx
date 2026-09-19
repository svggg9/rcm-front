"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "./Icon";
import styles from "./FormControl.module.css";

type SelectValue = string | number;

type Option = {
  value: SelectValue;
  label: string;
  disabled?: boolean;
};

type Props<TValue extends SelectValue> = {
  label?: string;
  ariaLabel?: string;
  value: TValue | "";
  options: Option[];
  placeholder?: string;
  emptyOptionLabel?: string;
  invalid?: boolean;
  errorId?: string;
  required?: boolean;
  disabled?: boolean;
  full?: boolean;
  onChange: (value: TValue | "") => void;
};

export function FormSelect<TValue extends SelectValue>({
  label,
  ariaLabel,
  value,
  options,
  placeholder,
  emptyOptionLabel,
  invalid = false,
  errorId,
  required = false,
  disabled = false,
  full = false,
  onChange,
}: Props<TValue>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const labelId = useId();
  const valueId = useId();
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
    <div
      data-ui="field"
      className={full ? styles.fieldFull : styles.field}
      data-validation-error={invalid ? "true" : undefined}
      ref={rootRef}
    >
      {label ? <span id={labelId} className={required ? styles.required : undefined}>
        {label}
      </span> : null}

      <div
        className={`${styles.select} ${open ? styles.selectOpen : ""} ${
          invalid ? styles.invalid : ""
        } ${required && !hasValue ? styles.requiredEmpty : ""} ${
          disabled ? styles.selectDisabled : ""
        }`}
      >
        <button
          type="button"
          role="combobox"
          className={`${styles.selectButton} ${hasValue ? "" : styles.placeholder}`}
          disabled={disabled}
          aria-describedby={invalid && errorId ? errorId : undefined}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={invalid || undefined}
          aria-controls={listboxId}
          aria-label={label ? undefined : ariaLabel}
          aria-labelledby={label ? `${labelId} ${valueId}` : undefined}
          onClick={() => setOpen((current) => !current)}
        >
          <span
            id={valueId}
            className={hasValue ? styles.selectValue : styles.selectPlaceholderValue}
          >
            {displayValue}
          </span>
          <span className={styles.chevron} aria-hidden="true">
            <Icon name="chevron-down" size={20} strokeWidth={1.5} />
          </span>
        </button>

        <div
          className={styles.menu}
          id={listboxId}
          role="listbox"
          aria-hidden={!open}
        >
          <div className={styles.options}>
            {(emptyOptionLabel || placeholder) && !required ? (
              <button
                type="button"
                className={styles.option}
                role="option"
                aria-selected={!hasValue}
                tabIndex={open ? 0 : -1}
                onClick={() => selectValue("")}
              >
                <span className={`${styles.optionLabel} ${emptyOptionLabel ? styles.optionValue : styles.optionPlaceholder}`}>{emptyOptionLabel ?? placeholder}</span>
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
                tabIndex={open ? 0 : -1}
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
