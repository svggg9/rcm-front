"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Icon } from "./Icon";
import styles from "./FormControl.module.css";

type Option = {
  value: number;
  label: string;
};

type Props = {
  label: string;
  value: number | "";
  customValue: string;
  options: Option[];
  placeholder: string;
  invalid?: boolean;
  required?: boolean;
  full?: boolean;
  disabled?: boolean;
  moderationLabel?: string;
  showModerationBadge?: boolean;
  emptyOptionLabel?: string;
  onChange: (value: number | "", customValue: string) => void;
};

export function FormCombobox({
  label,
  value,
  customValue,
  options,
  placeholder,
  invalid = false,
  required = false,
  full = false,
  disabled = false,
  moderationLabel = "На модерации",
  showModerationBadge = true,
  emptyOptionLabel,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const inputValue = open ? query : selectedOption?.label ?? customValue;
  const normalizedQuery = query.trim().toLowerCase();
  const hasValue = Boolean(selectedOption || customValue.trim());
  const shouldShowModerationBadge = showModerationBadge && !open && Boolean(customValue.trim());

  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, options]);

  const exactMatch = options.some(
    (option) => option.label.trim().toLowerCase() === normalizedQuery
  );
  const canSuggest = normalizedQuery.length > 1 && !exactMatch;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function selectExisting(option: Option) {
    if (disabled) return;
    onChange(option.value, "");
    setOpen(false);
    setQuery("");
  }

  function selectEmpty() {
    if (disabled) return;
    onChange("", "");
    setOpen(false);
    setQuery("");
  }

  function selectSuggested() {
    if (disabled) return;
    const nextValue = query.trim();
    if (!nextValue) return;

    onChange("", nextValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div
      className={full ? styles.fieldFull : styles.field}
      data-validation-error={invalid ? "true" : undefined}
      ref={rootRef}
    >
      <span className={required ? styles.required : undefined}>{label}</span>

      <div
        className={`${styles.select} ${open ? styles.selectOpen : ""} ${
          invalid ? styles.invalid : ""
        } ${required && !hasValue ? styles.requiredEmpty : ""} ${
          disabled ? styles.selectDisabled : ""
        }`}
      >
        <input
          value={inputValue}
          className={`${styles.comboboxInput} ${shouldShowModerationBadge ? styles.comboboxInputWithBadge : ""} ${hasValue ? "" : styles.placeholder}`}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            if (disabled) return;
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (!disabled && event.key === "Enter" && canSuggest) {
              event.preventDefault();
              selectSuggested();
            }
          }}
        />

        {shouldShowModerationBadge ? (
          <span className={styles.comboboxBadge}>{moderationLabel}</span>
        ) : null}

        <button
          type="button"
          className={styles.chevron}
          aria-label={open ? "Свернуть список" : "Раскрыть список"}
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (disabled) return;
            setOpen((current) => !current);
            setQuery("");
          }}
        >
          <Icon name="chevron-down" size={18} strokeWidth={1.8} />
        </button>

        <div className={styles.menu} id={listboxId} role="listbox">
          <div className={styles.options}>
            {emptyOptionLabel ? (
              <button
                type="button"
                className={`${styles.option} ${styles.optionMuted}`}
                role="option"
                aria-selected={!hasValue}
                onClick={selectEmpty}
              >
                <span className={`${styles.optionLabel} ${styles.optionPlaceholder}`}>{emptyOptionLabel}</span>
              </button>
            ) : null}
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={styles.option}
                role="option"
                aria-selected={option.value === value}
                onClick={() => selectExisting(option)}
              >
                <span className={`${styles.optionLabel} ${styles.optionValue}`}>{option.label}</span>
              </button>
            ))}

            {canSuggest ? (
              <button
                type="button"
                className={styles.option}
                role="option"
                aria-selected={false}
                onClick={selectSuggested}
              >
                <span className={`${styles.optionLabel} ${styles.optionValue}`}>{query.trim()}</span>
              </button>
            ) : null}

            {!filteredOptions.length && !canSuggest ? (
              <div className={`${styles.empty} ${styles.optionPlaceholder}`}>Начните вводить свой вариант</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
