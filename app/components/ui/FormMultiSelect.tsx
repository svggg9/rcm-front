"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "./Icon";
import styles from "./FormControl.module.css";

type SelectValue = string | number;

type Option<TValue extends SelectValue> = {
  value: TValue;
  label: string;
  disabled?: boolean;
};

export function FormMultiSelect<TValue extends SelectValue>({
  label,
  values,
  options,
  placeholder = "Выберите значения",
  required = false,
  disabled = false,
  onChange,
}: {
  label?: string;
  values: TValue[];
  options: Option<TValue>[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (values: TValue[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const labelId = useId();
  const valueId = useId();
  const listboxId = useId();
  const selected = new Set(values);
  const displayValue = values.length === 1
    ? options.find(option => option.value === values[0])?.label ?? "Выбрано: 1"
    : values.length > 1 ? `Выбрано: ${values.length}` : placeholder;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function toggle(value: TValue) {
    onChange(selected.has(value) ? values.filter(item => item !== value) : [...values, value]);
  }

  return <div data-ui="field" className={styles.field} ref={rootRef}>
    {label ? <span id={labelId} className={required ? styles.required : undefined}>{label}</span> : null}
    <div className={`${styles.select} ${open ? styles.selectOpen : ""} ${required && !values.length ? styles.requiredEmpty : ""} ${disabled ? styles.selectDisabled : ""}`}>
      <button type="button" role="combobox" className={`${styles.selectButton} ${values.length ? "" : styles.placeholder}`}
        disabled={disabled} aria-expanded={open} aria-haspopup="listbox" aria-controls={listboxId}
        aria-labelledby={label ? `${labelId} ${valueId}` : valueId} onClick={() => setOpen(current => !current)}>
        <span id={valueId} className={values.length ? styles.selectValue : styles.selectPlaceholderValue}>{displayValue}</span>
        <span className={styles.chevron} aria-hidden="true"><Icon name="chevron-down" size={20} strokeWidth={1.5} /></span>
      </button>
      <div className={styles.menu} id={listboxId} role="listbox" aria-multiselectable="true" aria-hidden={!open}>
        <div className={styles.options}>
          {options.map(option => <button key={String(option.value)} type="button" className={styles.option}
            role="option" disabled={option.disabled} aria-selected={selected.has(option.value)} tabIndex={open ? 0 : -1}
            onClick={() => toggle(option.value)}>
            <span className={`${styles.optionLabel} ${styles.optionValue}`}>{option.label}</span>
            <span className={styles.optionCheck} aria-hidden="true">{selected.has(option.value) ? <Icon name="check" size={18} /> : null}</span>
          </button>)}
        </div>
      </div>
    </div>
  </div>;
}
