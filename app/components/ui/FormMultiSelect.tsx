"use client";

import { useId, type FocusEventHandler } from "react";
import { Field, getFieldDescriptionIds } from "./Field";
import { Icon } from "./Icon";
import { useDropdown } from "./useDropdown";
import styles from "./FormControl.module.css";

type SelectValue = string | number;
type Option<TValue extends SelectValue> = { value: TValue; label: string; disabled?: boolean };
type Props<TValue extends SelectValue> = {
  id?: string;
  label?: string;
  ariaLabel?: string;
  "aria-describedby"?: string;
  hint?: string;
  error?: string | null;
  invalid?: boolean;
  errorId?: string;
  values: TValue[];
  options: Option<TValue>[];
  placeholder?: string;
  emptyText?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  fieldVariant?: "boxed" | "inline";
  full?: boolean;
  onChange: (values: TValue[]) => void;
  onBlur?: FocusEventHandler<HTMLDivElement>;
};

export function FormMultiSelect<TValue extends SelectValue>({
  id, label, ariaLabel, "aria-describedby": describedBy, hint, error, invalid = false, errorId,
  values, options, placeholder = "Выберите значения", emptyText = "Нет доступных вариантов",
  required = false, disabled = false, readOnly = false, fieldVariant = "boxed", full = false, onChange, onBlur,
}: Props<TValue>) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const valueId = controlId + "-value";
  const listboxId = controlId + "-listbox";
  const labelId = controlId + "-label";
  const { open, setOpen, rootRef, controlRef, menuRef, handleKeyDown, handleBlur, menuStyle, side } =
    useDropdown<HTMLButtonElement>({ disabled, readOnly });
  const selected = new Set(values);
  const selectedLabels = values.map(value => options.find(option => option.value === value)?.label)
    .filter((selectedLabel): selectedLabel is string => selectedLabel !== undefined);
  const displayValue = values.length === 1 ? selectedLabels[0] ?? "Выбрано: 1" : values.length > 1 ? "Выбрано: " + values.length : placeholder;
  const visibleError = error?.trim();
  const isInvalid = invalid || Boolean(visibleError);
  const inactive = disabled || readOnly;
  const descriptionIds = getFieldDescriptionIds(controlId, {
    hint, error: visibleError, describedBy: [describedBy, isInvalid ? errorId : undefined].filter(Boolean).join(" "),
  });

  function toggle(value: TValue) {
    if (inactive || controlRef.current?.matches(":disabled")) return;
    onChange(selected.has(value) ? values.filter(item => item !== value) : [...values, value]);
  }

  return <Field label={label} controlId={controlId} required={required} hint={hint} error={visibleError}
    variant={fieldVariant} disabled={disabled} readOnly={readOnly} className={full ? styles.fieldFull : styles.field}
    data-validation-error={isInvalid ? "true" : undefined} ref={rootRef} onKeyDown={handleKeyDown}
    onBlur={event => {
      handleBlur(event);
      if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.(event);
    }}>
    <div ref={menuRef} style={menuStyle} data-side={side}
      className={[styles.select, open ? styles.selectOpen : "", isInvalid ? styles.invalid : "",
        required && !values.length ? styles.requiredEmpty : "", inactive ? styles.selectDisabled : ""].filter(Boolean).join(" ")}>
      <button type="button" role="combobox" id={controlId} ref={controlRef}
        className={[styles.selectButton, values.length ? "" : styles.placeholder].filter(Boolean).join(" ")}
        disabled={disabled} aria-readonly={readOnly || undefined} aria-expanded={open}
        aria-haspopup="listbox" aria-controls={listboxId} aria-required={required || undefined}
        aria-invalid={isInvalid || undefined} aria-describedby={descriptionIds}
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? labelId + " " + valueId : ariaLabel ? undefined : valueId}
        title={selectedLabels.length ? selectedLabels.join(", ") : displayValue}
        onClick={() => { if (!inactive) setOpen(current => !current); }}>
        <span id={valueId} className={values.length ? styles.selectValue : styles.selectPlaceholderValue}>{displayValue}</span>
        <span className={styles.chevron} aria-hidden="true"><Icon name="chevron-down" size={20} strokeWidth={1.5} /></span>
      </button>
      <div className={styles.menu} id={listboxId} role="listbox" aria-multiselectable="true" aria-hidden={!open} inert={!open}
        aria-labelledby={label ? labelId : undefined} aria-label={label ? undefined : ariaLabel}>
        <div className={styles.options}>
          {options.map(option => <button key={String(option.value)} type="button" className={styles.option}
            role="option" disabled={inactive || option.disabled} aria-selected={selected.has(option.value)} tabIndex={-1}
            onClick={() => toggle(option.value)}>
            <span className={[styles.optionLabel, styles.optionValue].join(" ")} title={option.label}>{option.label}</span>
            <span className={styles.optionCheck} aria-hidden="true">{selected.has(option.value) ? <Icon name="check" size={18} /> : null}</span>
          </button>)}
          {!options.length ? <div className={styles.empty} role="status">{emptyText}</div> : null}
        </div>
      </div>
    </div>
  </Field>;
}
