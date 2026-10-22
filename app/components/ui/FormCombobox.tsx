"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Icon } from "./Icon";
import { Loader } from "./Loader";
import styles from "./FormControl.module.css";

type Option = {
  value: number;
  label: string;
  disabled?: boolean;
  searchTerms?: string[];
};

type Props = {
  label: string;
  value: number | "";
  customValue: string;
  options: Option[];
  placeholder?: string;
  showPlaceholderOption?: boolean;
  invalid?: boolean;
  errorId?: string;
  required?: boolean;
  full?: boolean;
  disabled?: boolean;
  moderationLabel?: string;
  showModerationBadge?: boolean;
  emptyOptionLabel?: string;
  suggestionsOnInput?: boolean;
  onQueryChange?: (query: string) => void;
  allowCustomValue?: boolean;
  loading?: boolean;
  emptyText?: string;
  onChange: (value: number | "", customValue: string) => void;
};

export function FormCombobox({
  label,
  value,
  customValue,
  options,
  placeholder,
  showPlaceholderOption = true,
  invalid = false,
  errorId,
  required = false,
  full = false,
  disabled = false,
  moderationLabel = "На модерации",
  showModerationBadge = true,
  emptyOptionLabel,
  suggestionsOnInput = false,
  onQueryChange,
  allowCustomValue = true,
  loading = false,
  emptyText = "Начните вводить свой вариант",
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suppressNextOpenRef = useRef(false);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const inputValue = open ? query : selectedOption?.label ?? customValue;
  const normalizedQuery = query.trim().toLowerCase();
  const dropdownOpen = open && (!suggestionsOnInput || normalizedQuery.length > 0);
  const hasValue = Boolean(selectedOption || customValue.trim());
  const shouldShowModerationBadge = showModerationBadge && !open && Boolean(customValue.trim());

  const filteredOptions = useMemo(() => {
    if (loading) return [];
    if (!normalizedQuery) return options;

    return options.filter((option) => [option.label, ...(option.searchTerms ?? [])]
      .some(text => text.toLowerCase().includes(normalizedQuery)));
  }, [loading, normalizedQuery, options]);

  const exactMatch = options.some(
    (option) => [option.label, ...(option.searchTerms ?? [])].some(text => text.trim().toLowerCase() === normalizedQuery)
  );
  const canSuggest = !loading && allowCustomValue && normalizedQuery.length > 1 && !exactMatch;

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

  function closeAndFocus() {
    suppressNextOpenRef.current = true;
    setOpen(false);
    setQuery("");
    inputRef.current?.focus({ preventScroll: true });
    suppressNextOpenRef.current = false;
  }

  function selectExisting(option: Option) {
    if (disabled || option.disabled) return;
    onChange(option.value, "");
    closeAndFocus();
  }

  function selectEmpty() {
    if (disabled) return;
    onChange("", "");
    closeAndFocus();
  }

  function selectSuggested() {
    if (disabled) return;
    const nextValue = query.trim();
    if (!nextValue) return;

    onChange("", nextValue);
    closeAndFocus();
  }

  return (
    <div
      data-ui="field"
      className={full ? styles.fieldFull : styles.field}
      data-validation-error={invalid ? "true" : undefined}
      ref={rootRef}
      onBlur={(event) => {
        if (suggestionsOnInput && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setQuery("");
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          closeAndFocus();
        }
        if (event.target instanceof HTMLButtonElement && event.target.getAttribute("role") === "option" &&
          ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          const choices = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not([disabled])') ?? []);
          const current = choices.indexOf(event.target);
          const next = event.key === "Home" ? 0 : event.key === "End" ? choices.length - 1 :
            (current + (event.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length;
          event.preventDefault();
          choices[next]?.focus();
        }
      }}
    >
      <span className={required ? styles.required : undefined}>{label}</span>

      <div
        className={`${styles.select} ${dropdownOpen ? styles.selectOpen : ""} ${
          invalid ? styles.invalid : ""
        } ${required && !hasValue ? styles.requiredEmpty : ""} ${
          disabled ? styles.selectDisabled : ""
        }`}
      >
        <input
          ref={inputRef}
          aria-invalid={invalid ? "true" : undefined}
          aria-label={label}
          aria-describedby={invalid ? errorId : undefined}
          aria-required={required || undefined}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={dropdownOpen}
          aria-controls={dropdownOpen ? listboxId : undefined}
          value={inputValue}
          className={`${styles.comboboxInput} ${shouldShowModerationBadge ? styles.comboboxInputWithBadge : ""} ${hasValue ? "" : styles.placeholder}`}
          placeholder={suggestionsOnInput || open ? placeholder : undefined}
          disabled={disabled}
          onFocus={() => {
            if (disabled) return;
            if (suggestionsOnInput) return;
            if (suppressNextOpenRef.current) {
              suppressNextOpenRef.current = false;
              return;
            }
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            if (disabled) return;
            setQuery(event.target.value);
            setOpen(true);
            onQueryChange?.(event.target.value);
          }}
          onKeyDown={(event) => {
            if (!disabled && event.key === "ArrowDown" && dropdownOpen) {
              event.preventDefault();
              rootRef.current?.querySelector<HTMLButtonElement>('[role="option"]:not([disabled])')?.focus();
            }
            const exactOptions = filteredOptions.filter(option => !option.disabled && [option.label, ...(option.searchTerms ?? [])]
              .some(text => text.trim().toLowerCase() === normalizedQuery));
            const matched = exactOptions.length === 1 ? exactOptions[0] : undefined;
            if (!disabled && event.key === "Enter" && dropdownOpen && (canSuggest || matched)) {
              event.preventDefault();
              if (matched) selectExisting(matched);
              else selectSuggested();
            }
          }}
        />

        {shouldShowModerationBadge ? (
          <span className={styles.comboboxBadge}>{moderationLabel}</span>
        ) : null}

        {!suggestionsOnInput && <button
          type="button"
          className={styles.chevron}
          aria-label={open ? "Свернуть список" : "Раскрыть список"}
          disabled={disabled}
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (disabled) return;
            setOpen((current) => !current);
            setQuery("");
          }}
        >
          <Icon name="chevron-down" size={20} strokeWidth={1.5} />
        </button>}

        {(!suggestionsOnInput || dropdownOpen) && <div className={styles.menu} id={listboxId} role="listbox" inert={!dropdownOpen} aria-hidden={!dropdownOpen}>
          <div className={styles.options}>
            {placeholder && !suggestionsOnInput && showPlaceholderOption ? (
              <button
                type="button"
                className={`${styles.option} ${styles.optionMuted}`}
                role="option"
                aria-selected={false}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  suppressNextOpenRef.current = true;
                  setOpen(false);
                  setQuery("");
                  inputRef.current?.focus();
                  if (document.activeElement === inputRef.current) {
                    suppressNextOpenRef.current = false;
                  }
                }}
              >
                <span className={`${styles.optionLabel} ${styles.optionPlaceholder}`}>
                  {placeholder}
                </span>
              </button>
            ) : null}
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
                disabled={option.disabled}
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
              <div className={`${styles.empty} ${styles.optionPlaceholder}`}>
                {loading ? <Loader inline label="Поиск вариантов" /> : <span role="status">{emptyText}</span>}
              </div>
            ) : null}
          </div>
        </div>}
      </div>
    </div>
  );
}
