"use client";

import type { ReactNode, FormEvent } from "react";
import { scrollToFirstValidationError } from "../../lib/formValidation";

// A form's React validation commits before the helper's animation frame.
// Navigation, API calls and validation rules remain owned by each form.
export function FormValidationBoundary({ children }: { children: ReactNode }) {
  function submitted(event: FormEvent<HTMLElement>) {
    if (event.target instanceof HTMLFormElement) {
      scrollToFirstValidationError({ root: event.target });
    }
  }
  return <main className="appMain" onSubmitCapture={submitted}>{children}</main>;
}
