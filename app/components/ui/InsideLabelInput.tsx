"use client";

import { useId } from "react";
import { Field, getFieldDescriptionIds } from "./Field";
import { InputControl, type InputControlProps } from "./InputControl";
import { InsideLabelFrame } from "./InsideLabelFrame";
import styles from "./InsideLabelInput.module.css";

type Props = Omit<InputControlProps, "size"> & {
  label: string;
  mode: "fixed" | "floating";
  appearance?: "default" | "warm";
  hint?: string;
  error?: string | null;
};

/** Text field with a persistent label inside its outline. */
export function InsideLabelInput({ label, mode, appearance = "default", hint, error, required, id, className = "", placeholder, ...props }: Props) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const visibleError = error?.trim();

  return <Field controlId={controlId} hint={hint} error={visibleError} disabled={props.disabled} readOnly={props.readOnly}>
    <InsideLabelFrame controlId={controlId} label={label} required={required} invalid={Boolean(visibleError)} mode={mode} appearance={appearance}>
      <InputControl {...props} id={controlId} required={required} aria-required={required || undefined}
        aria-invalid={visibleError ? "true" : props["aria-invalid"]}
        aria-describedby={getFieldDescriptionIds(controlId, { hint, error: visibleError, describedBy: props["aria-describedby"] })}
        className={`${styles.control} ${className}`.trim()} placeholder={placeholder || " "} />
    </InsideLabelFrame>
  </Field>;
}
