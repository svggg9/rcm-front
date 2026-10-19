"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type FocusEventHandler } from "react";

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
  readOnly?: boolean;
  fieldVariant?: "boxed" | "inline";
  full?: boolean;
  size?: "default" | "compact";
  onChange: (value: TValue | "") => void;
  onBlur?: FocusEventHandler<HTMLDivElement>;
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
  readOnly = false,
  fieldVariant = "boxed",
  full = false,
  size = "default",
  onChange,
  onBlur,
}: Props<TValue>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const labelId = useId();
  const valueId = useId();
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const hasValue = value !== "";
  const displayValue = selectedOption?.label ?? placeholder ?? "";
  const inactive = disabled || readOnly;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
      }
    };
  }, []);

  if (inactive && open) {
    setOpen(false);
  }

  function closeMenu(returnFocus = false) {
    if (focusFrameRef.current !== null) {
      window.cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = null;
    }
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function focusOption(key: string) {
    const enabledOptions = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    ).filter((option) => !option.matches(":disabled"));
    if (enabledOptions.length === 0) return;

    const currentIndex = enabledOptions.findIndex((option) => option === document.activeElement);
    const selectedIndex = enabledOptions.findIndex((option) => option.getAttribute("aria-selected") === "true");
    let nextIndex: number;

    if (key === "Home") nextIndex = 0;
    else if (key === "End") nextIndex = enabledOptions.length - 1;
    else if (currentIndex >= 0) {
      nextIndex = key === "ArrowDown"
        ? Math.min(currentIndex + 1, enabledOptions.length - 1)
        : Math.max(currentIndex - 1, 0);
    } else {
      nextIndex = selectedIndex >= 0 ? selectedIndex : key === "ArrowDown" ? 0 : enabledOptions.length - 1;
    }

    enabledOptions[nextIndex]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (inactive || triggerRef.current?.matches(":disabled")) return;

    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    } else if (event.key === "Tab" && open) {
      closeMenu(true);
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (open) {
        focusOption(event.key);
      } else {
        setOpen(true);
        const key = event.key;
        focusFrameRef.current = window.requestAnimationFrame(() => {
          focusFrameRef.current = null;
          if (triggerRef.current?.getAttribute("aria-expanded") === "true"
            && !triggerRef.current.matches(":disabled")) {
            focusOption(key);
          }
        });
      }
    }
  }

  function selectValue(nextValue: TValue | "") {
    if (inactive || triggerRef.current?.matches(":disabled")) return;
    onChange(nextValue);
    closeMenu(true);
  }

  return (
    <div
      data-ui="field"
      data-field-variant={fieldVariant === "inline" ? "inline" : undefined}
      data-readonly={readOnly || undefined}
      className={`${full ? styles.fieldFull : styles.field} ${size === "compact" ? styles.compact : ""}`}
      data-validation-error={invalid ? "true" : undefined}
      ref={rootRef}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) { closeMenu(); onBlur?.(event); }
      }}
    >
      {label ? <span id={labelId} className={required ? styles.required : undefined}>
        {label}
      </span> : null}

      <div
        className={`${styles.select} ${open ? styles.selectOpen : ""} ${
          invalid ? styles.invalid : ""
        } ${required && !hasValue ? styles.requiredEmpty : ""} ${
          inactive ? styles.selectDisabled : ""
        }`}
      >
        <button
          type="button"
          role="combobox"
          ref={triggerRef}
          className={`${styles.selectButton} ${hasValue ? "" : styles.placeholder}`}
          disabled={inactive}
          aria-readonly={readOnly || undefined}
          aria-describedby={invalid && errorId ? errorId : undefined}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
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
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : ariaLabel}
        >
          <div className={styles.options}>
            {(emptyOptionLabel || placeholder) && !required ? (
              <button
                type="button"
                className={styles.option}
                role="option"
                aria-selected={!hasValue}
                tabIndex={-1}
                disabled={inactive}
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
                disabled={inactive || option.disabled}
                aria-selected={option.value === value}
                tabIndex={-1}
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
