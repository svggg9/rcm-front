"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";

import { Field, getFieldDescriptionIds } from "./Field";
import { Icon } from "./Icon";
import { Loader } from "./Loader";
import { useDropdown } from "./useDropdown";
import styles from "./FormControl.module.css";

type Option = {
  value: number;
  label: string;
  disabled?: boolean;
  searchTerms?: string[];
};

type Props = {
  id?: string;
  label: string;
  value: number | "";
  customValue: string;
  options: Option[];
  placeholder?: string;
  showPlaceholderOption?: boolean;
  invalid?: boolean;
  errorId?: string;
  error?: string | null;
  hint?: string;
  "aria-describedby"?: string;
  required?: boolean;
  full?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
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
  id,
  label,
  value,
  customValue,
  options,
  placeholder,
  showPlaceholderOption = true,
  invalid = false,
  errorId,
  error,
  hint,
  "aria-describedby": describedBy,
  required = false,
  full = false,
  disabled = false,
  readOnly = false,
  moderationLabel = "На модерации",
  showModerationBadge = true,
  emptyOptionLabel,
  suggestionsOnInput = false,
  onQueryChange,
  allowCustomValue = true,
  loading = false,
  emptyText = "Нет подходящих вариантов",
  onChange,
}: Props) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listboxId = `${controlId}-listbox`;
  const labelId = `${controlId}-label`;
  const [query, setQuery] = useState("");
  const resetQuery = useCallback(() => setQuery(""), []);
  const { open, setOpen, rootRef, controlRef, menuRef, closeMenu, handleKeyDown, handleBlur, menuStyle, side } =
    useDropdown<HTMLInputElement>({ disabled, readOnly, onClose: resetQuery });
  const suppressNextOpenRef = useRef(false);
  const inactive = disabled || readOnly;
  const selectedOption = options.find(option => option.value === value) ?? null;
  const inputValue = open && !inactive ? query : selectedOption?.label ?? customValue;
  const normalizedQuery = query.trim().toLowerCase();
  const dropdownOpen = open && !inactive && (!suggestionsOnInput || normalizedQuery.length > 0);
  const hasValue = Boolean(selectedOption || customValue.trim());
  const visibleError = error?.trim();
  const isInvalid = invalid || Boolean(visibleError);
  const shouldShowModerationBadge = showModerationBadge && !open && Boolean(customValue.trim());
  const descriptionIds = getFieldDescriptionIds(controlId, {
    hint,
    error: visibleError,
    describedBy: [describedBy, isInvalid ? errorId : undefined].filter(Boolean).join(" "),
  });

  const filteredOptions = useMemo(() => {
    if (loading) return [];
    if (!normalizedQuery) return options;
    return options.filter(option => [option.label, ...(option.searchTerms ?? [])]
      .some(text => text.toLowerCase().includes(normalizedQuery)));
  }, [loading, normalizedQuery, options]);
  const exactOptions = filteredOptions.filter(option => !option.disabled && [option.label, ...(option.searchTerms ?? [])]
    .some(text => text.trim().toLowerCase() === normalizedQuery));
  const exactMatch = options.some(option => [option.label, ...(option.searchTerms ?? [])]
    .some(text => text.trim().toLowerCase() === normalizedQuery));
  const canSuggest = !loading && allowCustomValue && normalizedQuery.length > 1 && !exactMatch;
  const newValueLabel = `Предложить новый вариант: «${query.trim()}»`;

  function closeAndFocus() {
    suppressNextOpenRef.current = true;
    closeMenu(true);
    suppressNextOpenRef.current = false;
  }

  function openMenu() {
    if (inactive || open || suggestionsOnInput) return;
    setQuery("");
    setOpen(true);
    onQueryChange?.("");
  }

  function selectExisting(option: Option) {
    if (inactive || option.disabled) return;
    onChange(option.value, "");
    closeAndFocus();
  }

  function selectEmpty() {
    if (inactive) return;
    onChange("", "");
    closeAndFocus();
  }

  function selectSuggested() {
    if (inactive || !canSuggest) return;
    const nextValue = query.trim();
    if (!nextValue) return;
    onChange("", nextValue);
    closeAndFocus();
  }

  return <Field label={label} controlId={controlId} required={required} hint={hint} error={visibleError}
    disabled={disabled} readOnly={readOnly} className={full ? styles.fieldFull : styles.field}
    ref={rootRef} data-validation-error={isInvalid ? "true" : undefined}
    onBlur={handleBlur} onKeyDown={event => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        event.stopPropagation();
        closeAndFocus();
        return;
      }
      if (event.target === controlRef.current) {
        // Home/End retain native text-editing semantics inside the search input.
        if (event.key === "Home" || event.key === "End") return;
        if (suggestionsOnInput && !normalizedQuery && ["ArrowDown", "ArrowUp"].includes(event.key)) return;
      }
      if (event.key === "Tab") suppressNextOpenRef.current = true;
      handleKeyDown(event);
      if (event.key === "Tab") suppressNextOpenRef.current = false;
    }}>
    <div ref={menuRef} style={menuStyle} data-side={side}
      className={`${styles.select} ${dropdownOpen ? styles.selectOpen : ""} ${isInvalid ? styles.invalid : ""} ${
        required && !hasValue ? styles.requiredEmpty : ""} ${inactive ? styles.selectDisabled : ""}`}>
      <input id={controlId} ref={controlRef} role="combobox" aria-autocomplete="list" aria-labelledby={labelId}
        aria-invalid={isInvalid || undefined} aria-describedby={descriptionIds} aria-required={required || undefined}
        aria-expanded={dropdownOpen} aria-controls={dropdownOpen ? listboxId : undefined} aria-readonly={readOnly || undefined}
        value={inputValue} title={inputValue || undefined} disabled={disabled} readOnly={readOnly}
        className={`${styles.comboboxInput} ${shouldShowModerationBadge ? styles.comboboxInputWithBadge : ""} ${hasValue ? "" : styles.placeholder}`}
        placeholder={suggestionsOnInput || open ? placeholder : undefined}
        onFocus={() => {
          if (suppressNextOpenRef.current) return;
          openMenu();
        }}
        onMouseDown={() => {
          if (document.activeElement === controlRef.current) openMenu();
        }}
        onChange={event => {
          if (inactive) return;
          setQuery(event.target.value);
          setOpen(true);
          onQueryChange?.(event.target.value);
        }}
        onKeyDown={event => {
          if (inactive || event.key !== "Enter" || !dropdownOpen) return;
          event.preventDefault();
          // Creation is an explicit option, never an implicit Enter on a partial match.
          if (exactOptions.length === 1) selectExisting(exactOptions[0]);
          else rootRef.current?.querySelector<HTMLButtonElement>('[data-existing-option]:not(:disabled), [data-create-option]:not(:disabled)')?.focus();
        }} />

      {shouldShowModerationBadge ? <span className={styles.comboboxBadge}>{moderationLabel}</span> : null}
      {!suggestionsOnInput && <button type="button" className={styles.chevron}
        aria-label={open ? "Свернуть список" : "Раскрыть список"} disabled={inactive} tabIndex={-1}
        onMouseDown={event => event.preventDefault()} onClick={() => {
          if (inactive) return;
          if (open) closeAndFocus();
          else {
            openMenu();
            suppressNextOpenRef.current = true;
            controlRef.current?.focus({ preventScroll: true });
            suppressNextOpenRef.current = false;
          }
        }}><Icon name="chevron-down" size={20} strokeWidth={1.5} /></button>}

      {(!suggestionsOnInput || dropdownOpen) && <div className={styles.menu} id={listboxId} role="listbox"
        aria-labelledby={labelId} aria-busy={loading || undefined} inert={!dropdownOpen} aria-hidden={!dropdownOpen}>
        <div className={styles.options}>
          {placeholder && !suggestionsOnInput && showPlaceholderOption ? <button type="button"
            className={`${styles.option} ${styles.optionMuted}`} role="option" aria-selected={false} tabIndex={-1}
            disabled={inactive} onMouseDown={event => event.preventDefault()} onClick={closeAndFocus}>
            <span className={`${styles.optionLabel} ${styles.optionPlaceholder}`} title={placeholder}>{placeholder}</span>
          </button> : null}
          {emptyOptionLabel ? <button type="button" className={`${styles.option} ${styles.optionMuted}`}
            role="option" aria-selected={!hasValue} tabIndex={-1} disabled={inactive} onClick={selectEmpty}>
            <span className={`${styles.optionLabel} ${styles.optionPlaceholder}`} title={emptyOptionLabel}>{emptyOptionLabel}</span>
            <span className={styles.optionCheck} aria-hidden="true">{!hasValue ? <Icon name="check" size={18} /> : null}</span>
          </button> : null}
          {filteredOptions.map(option => <button key={option.value} type="button" className={styles.option}
            role="option" data-existing-option aria-selected={option.value === value} tabIndex={-1}
            disabled={inactive || option.disabled} onClick={() => selectExisting(option)}>
            <span className={`${styles.optionLabel} ${styles.optionValue}`} title={option.label}>{option.label}</span>
            <span className={styles.optionCheck} aria-hidden="true">{option.value === value ? <Icon name="check" size={18} /> : null}</span>
          </button>)}
          {canSuggest ? <button type="button" className={styles.option} role="option" data-create-option
            aria-selected={false} tabIndex={-1} disabled={inactive} onClick={selectSuggested}>
            <span className={`${styles.optionLabel} ${styles.optionValue}`} title={newValueLabel}>{newValueLabel}</span>
          </button> : null}
          {!filteredOptions.length && !canSuggest ? <div className={`${styles.empty} ${styles.optionPlaceholder}`}>
            {loading ? <Loader inline label="Поиск вариантов" /> : <span role="status">{emptyText}</span>}
          </div> : null}
        </div>
      </div>}
    </div>
  </Field>;
}
