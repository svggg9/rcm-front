import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
} from "react";

import {
  formatRussianPhoneInput,
  getRussianPhoneDigits,
  normalizeRussianPhone,
} from "../../lib/phone";
import { Field } from "./Field";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  label?: string;
  error?: string | null;
  hint?: string;
  fieldVariant?: "line" | "boxed";
  hideLabel?: boolean;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

function createChangeEvent(
  event:
    | React.ChangeEvent<HTMLInputElement>
    | React.FocusEvent<HTMLInputElement>,
  value: string
): React.ChangeEvent<HTMLInputElement> {
  return {
    ...event,
    target: {
      ...event.target,
      value,
    },
    currentTarget: {
      ...event.currentTarget,
      value,
    },
  } as React.ChangeEvent<HTMLInputElement>;
}

export function PhoneInput({
  label = "Телефон",
  placeholder = "",
  inputMode = "tel",
  autoComplete = "tel",
  title = "Введите 10 цифр номера телефона после +7",
  fieldVariant = "line",
  hideLabel = false,
  hint,
  value,
  onChange,
  onFocus,
  onBlur,
  className = "",
  error,
  required,
  ...props
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const errorId = useId();
  const displayValue = formatRussianPhoneInput(value);
  const visibleError = error?.trim();
  const describedBy = [
    props["aria-describedby"],
    visibleError ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const restorePendingCaret = useCallback(() => {
    const caret = pendingCaretRef.current;
    const input = inputRef.current;

    if (caret === null || !input || document.activeElement !== input) return;

    input.setSelectionRange(caret, caret);
    pendingCaretRef.current = null;
  }, []);

  useLayoutEffect(() => {
    restorePendingCaret();
  }, [displayValue, restorePendingCaret]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const rawValue = event.currentTarget.value;
    const rawCaret = event.currentTarget.selectionStart ?? rawValue.length;
    const formatted = normalizeRussianPhone(rawValue);
    const digitsBeforeCaret = getRussianPhoneDigits(
      rawValue.slice(0, rawCaret)
    ).length;
    const nextDisplayValue = formatRussianPhoneInput(formatted);

    pendingCaretRef.current = getCaretAfterDigits(
      nextDisplayValue,
      digitsBeforeCaret
    );
    onChange(createChangeEvent(event, formatted));

    // A formatting-only edit may not change the controlled value, so React may
    // not render again. Restore the caret in that case as well.
    queueMicrotask(restorePendingCaret);
    window.requestAnimationFrame(restorePendingCaret);
  }

  function handleFocus(event: React.FocusEvent<HTMLInputElement>) {
    onFocus?.(event);
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    pendingCaretRef.current = null;

    if (!getRussianPhoneDigits(value)) {
      onChange(createChangeEvent(event, ""));
    }

    onBlur?.(event);
  }

  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      variant={fieldVariant}
      hideLabel={hideLabel}
    >
      <span
        className={`phoneInputShell ${error ? "inputError" : ""}`.trim()}
      >
        <span className="phoneInputPrefix">+7</span>
        <input
          {...props}
          ref={inputRef}
          type="tel"
          className={`phoneInput ${className}`.trim()}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={displayValue}
          pattern="[(][0-9]{3}[)] [0-9]{3} [0-9]{2}-[0-9]{2}"
          minLength={15}
          maxLength={32}
          title={title}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </span>
      {visibleError ? (
        <div id={errorId} className="fieldError">
          {visibleError}
        </div>
      ) : null}
    </Field>
  );
}

function getCaretAfterDigits(value: string, digitCount: number) {
  if (digitCount <= 0) return 0;

  let seenDigits = 0;

  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) {
      seenDigits += 1;

      if (seenDigits === digitCount) {
        return index + 1;
      }
    }
  }

  return value.length;
}
