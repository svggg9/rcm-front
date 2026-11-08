"use client";

import { useId, type FocusEventHandler } from "react";
import { Field, getFieldDescriptionIds } from "./Field";
import { Icon } from "./Icon";
import { useDropdown } from "./useDropdown";
import styles from "./FormControl.module.css";

type SelectValue = string | number;
type Option = { value: SelectValue; label: string; disabled?: boolean };
type Props<TValue extends SelectValue> = {
  id?: string;
  label?: string;
  ariaLabel?: string;
  "aria-describedby"?: string;
  hint?: string;
  error?: string | null;
  value: TValue | "";
  options: Option[];
  placeholder?: string;
  emptyOptionLabel?: string;
  emptyText?: string;
  invalid?: boolean;
  errorId?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  fieldVariant?: "boxed" | "inline";
  full?: boolean;
  size?: "default" | "compact";
  onChange: (value: TValue | "") => void;
  onBlur?: FocusEventHandler<HTMLDivElement>;
};

export function FormSelect<TValue extends SelectValue>({
  id, label, ariaLabel, "aria-describedby": describedBy, hint, error, value, options,
  placeholder, emptyOptionLabel, emptyText = "Нет доступных вариантов", invalid = false, errorId,
  required = false, disabled = false, readOnly = false, fieldVariant = "boxed", full = false,
  size = "default", onChange, onBlur,
}: Props<TValue>) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const valueId = controlId + "-value";
  const listboxId = controlId + "-listbox";
  const labelId = controlId + "-label";
  const { open, setOpen, rootRef, controlRef, menuRef, closeMenu, handleKeyDown, handleBlur, menuStyle, side } =
    useDropdown<HTMLButtonElement>({ disabled, readOnly });
  const selectedOption = options.find(option => option.value === value) ?? null;
  const hasValue = value !== "";
  const displayValue = selectedOption?.label ?? placeholder ?? emptyOptionLabel ?? "";
  const visibleError = error?.trim();
  const isInvalid = invalid || Boolean(visibleError);
  const inactive = disabled || readOnly;
  const descriptionIds = getFieldDescriptionIds(controlId, {
    hint, error: visibleError, describedBy: [describedBy, isInvalid ? errorId : undefined].filter(Boolean).join(" "),
  });

  function selectValue(nextValue: TValue | "") {
    if (inactive || controlRef.current?.matches(":disabled")) return;
    onChange(nextValue);
    closeMenu(true);
  }

  return <Field label={label} controlId={controlId} required={required} hint={hint} error={visibleError}
    variant={fieldVariant} disabled={disabled} readOnly={readOnly}
    className={[full ? styles.fieldFull : styles.field, size === "compact" ? styles.compact : ""].filter(Boolean).join(" ")}
    data-validation-error={isInvalid ? "true" : undefined} ref={rootRef} onKeyDown={handleKeyDown}
    onBlur={event => {
      handleBlur(event);
      if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.(event);
    }}>
    <div ref={menuRef} style={menuStyle} data-side={side}
      className={[styles.select, open ? styles.selectOpen : "", isInvalid ? styles.invalid : "",
        required && !hasValue ? styles.requiredEmpty : "", inactive ? styles.selectDisabled : ""].filter(Boolean).join(" ")}>
      <button type="button" role="combobox" id={controlId} ref={controlRef}
        className={[styles.selectButton, hasValue ? "" : styles.placeholder].filter(Boolean).join(" ")}
        disabled={disabled} aria-readonly={readOnly || undefined} aria-describedby={descriptionIds}
        aria-expanded={open} aria-haspopup="listbox" aria-invalid={isInvalid || undefined}
        aria-required={required || undefined} aria-controls={listboxId}
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? labelId + " " + valueId : ariaLabel ? undefined : valueId}
        title={displayValue} onClick={() => { if (!inactive) setOpen(current => !current); }}>
        <span id={valueId} className={hasValue ? styles.selectValue : styles.selectPlaceholderValue}>{displayValue}</span>
        <span className={styles.chevron} aria-hidden="true"><Icon name="chevron-down" size={20} strokeWidth={1.5} /></span>
      </button>
      <div className={styles.menu} id={listboxId} role="listbox" aria-hidden={!open} inert={!open}
        aria-labelledby={label ? labelId : undefined} aria-label={label ? undefined : ariaLabel}>
        <div className={styles.options}>
          {(emptyOptionLabel || placeholder) && !required ? <button type="button" className={styles.option}
            role="option" aria-selected={!hasValue} tabIndex={-1} disabled={inactive} onClick={() => selectValue("")}>
            <span className={[styles.optionLabel, emptyOptionLabel ? styles.optionValue : styles.optionPlaceholder].join(" ")}
              title={emptyOptionLabel ?? placeholder}>{emptyOptionLabel ?? placeholder}</span>
            <span className={styles.optionCheck} aria-hidden="true">{!hasValue ? <Icon name="check" size={18} /> : null}</span>
          </button> : null}
          {options.map(option => <button key={String(option.value)} type="button" className={styles.option}
            role="option" disabled={inactive || option.disabled} aria-selected={option.value === value} tabIndex={-1}
            onClick={() => selectValue(option.value as TValue)}>
            <span className={[styles.optionLabel, styles.optionValue].join(" ")} title={option.label}>{option.label}</span>
            <span className={styles.optionCheck} aria-hidden="true">{option.value === value ? <Icon name="check" size={18} /> : null}</span>
          </button>)}
          {!options.length ? <div className={styles.empty} role="status">{emptyText}</div> : null}
        </div>
      </div>
    </div>
  </Field>;
}
