"use client";

import { useEffect, useRef, useState } from "react";
import { InputControl, type InputControlProps } from "./InputControl";
import { stripInputWhitespace } from "../../lib/inputWhitespace";
import { formatNumericInput, isNumericDraft, numericInputError, parseNumericInput, type NumericRules } from "../../lib/numericInput";

export type NumericInputProps = Omit<InputControlProps, "type" | "inputMode" | "value" | "defaultValue" | "min" | "max" | "step" | "ref"> & NumericRules & {
  value?: string | number | null;
  defaultValue?: string | number;
  /** Legacy required price models use zero for an empty draft. */
  emptyZero?: boolean;
  onValueChange?: (value: number | null) => void;
};

/** Shared raw/numeric input. The named form value is canonical, with a dot separator. */
export function NumericInput({ value, defaultValue, emptyZero = false, fractionDigits = 2, min = 0, max, onValueChange,
  onChange, onBlur, onBeforeInput, onPaste, name, form, disabled, ...props }: NumericInputProps) {
  const initialValue = value === undefined ? defaultValue : value;
  const [state, setState] = useState({ value, text: emptyZero && initialValue === 0 ? "" : formatNumericInput(initialValue) });
  const inputRef = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState(false);
  let text = state.text;
  if (!Object.is(state.value, value)) {
    text = emptyZero && value === 0 ? "" : formatNumericInput(value);
    setState({ value, text });
  }
  const rules = { fractionDigits, min, max };
  const parsed = parseNumericInput(text, rules);
  const error = numericInputError(text, rules);
  useEffect(() => { inputRef.current?.setCustomValidity(error); }, [error]);

  function canInsert(input: HTMLInputElement, raw: string) {
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? start;
    return isNumericDraft(text.slice(0, start) + stripInputWhitespace(raw) + text.slice(end), fractionDigits);
  }

  return <>
    <InputControl {...props} ref={inputRef} name={undefined} form={form} disabled={disabled} type="text"
      inputMode={fractionDigits ? "decimal" : "numeric"} value={text} aria-invalid={props["aria-invalid"] || (touched && !!error) || undefined}
      onBeforeInput={event => {
        onBeforeInput?.(event);
        const native = event.nativeEvent as InputEvent;
        if (!props.readOnly && !disabled && !event.defaultPrevented && !native.isComposing && native.data && !canInsert(event.currentTarget, native.data)) event.preventDefault();
      }}
      onPaste={event => {
        onPaste?.(event);
        if (!props.readOnly && !disabled && !event.defaultPrevented && !canInsert(event.currentTarget, event.clipboardData.getData("text"))) event.preventDefault();
      }}
      onChange={event => {
        const input = event.currentTarget;
        const next = stripInputWhitespace(input.value);
        if (!isNumericDraft(next, fractionDigits)) {
          const position = Math.max(0, (input.selectionStart ?? text.length) - (input.value.length - text.length));
          input.value = text;
          input.setSelectionRange(position, position);
          return;
        }
        const nextValue = parseNumericInput(next, rules);
        if (props["aria-invalid"]) setTouched(true);
        setState({ value: value === undefined ? undefined : typeof value === "string" ? next : emptyZero && nextValue === null ? 0 : nextValue, text: next });
        onChange?.(event);
        onValueChange?.(nextValue);
      }}
      onBlur={event => {
        setTouched(true);
        if (parsed !== null && Number.isFinite(parsed)) setState(current => ({ ...current, text: formatNumericInput(parsed) }));
        onBlur?.(event);
      }} />
    {name ? <input type="hidden" name={name} form={form} disabled={disabled} value={parsed === null || !Number.isFinite(parsed) ? "" : String(parsed)} /> : null}
  </>;
}
