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
import { Field, getFieldDescriptionIds } from "./Field";
import { InputControl } from "./InputControl";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "size"
> & {
  label?: string;
  error?: string | null;
  hint?: string;
  fieldVariant?: "line" | "boxed" | "inline";
  hideLabel?: boolean;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  size?: "default" | "large";
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
  size = "default",
  ...props
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const generatedId = useId();
  const controlId = props.id ?? generatedId;
  const displayValue = formatRussianPhoneInput(value);
  const visibleError = error?.trim();
  const describedBy = getFieldDescriptionIds(controlId, { hint, error: visibleError, describedBy: props["aria-describedby"] });

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

    if (!props.readOnly && !props.disabled && !getRussianPhoneDigits(value)) {
      onChange(createChangeEvent(event, ""));
    }

    onBlur?.(event);
  }

  return (
    <Field
      label={label}
      controlId={controlId}
      required={required}
      hint={hint}
      variant={fieldVariant}
      hideLabel={hideLabel}
      error={visibleError}
      disabled={props.disabled}
      readOnly={props.readOnly}
      size={size}
    >
      <span
        className={`phoneInputShell ${visibleError ? "inputError" : ""}`.trim()}
      >
        <span className="phoneInputPrefix">+7</span>
        <InputControl
          {...props}
          id={controlId}
          spacePolicy="formatted"
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
          required={required}
          aria-required={required || undefined}
          aria-invalid={visibleError ? "true" : props["aria-invalid"]}
          aria-describedby={describedBy}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </span>
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
