"use client";

import { useCallback, useState } from "react";

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** Reveal on blur/submit, then recompute from current values, including dependent fields. */
export function useFieldValidation<T extends object>(values: T, validate: (values: T) => FieldErrors<T>) {
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors<T>>({});
  const touch = useCallback((key: keyof T) => { setTouched(previous => previous[key] ? previous : { ...previous, [key]: true }); }, []);
  const changed = useCallback((key: keyof T) => {
    setServerErrors(previous => {
      if (!previous[key]) return previous;
      const next = { ...previous }; delete next[key]; return next;
    });
  }, []);
  const reset = useCallback(() => { setSubmitted(false); setTouched({}); setServerErrors({}); }, []);
  const current = validate(values);
  const errors: FieldErrors<T> = { ...serverErrors };
  for (const key of Object.keys(current) as (keyof T)[]) {
    if ((submitted || touched[key]) && current[key] && !errors[key]) errors[key] = current[key];
  }
  return {
    errors,
    touch,
    changed,
    validate() { setSubmitted(true); setServerErrors({}); return current; },
    setErrors: setServerErrors,
    reset,
  };
}
