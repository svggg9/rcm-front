type ScrollToValidationErrorOptions = {
  root?: ParentNode | null;
  selector?: string;
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
};

const DEFAULT_ERROR_SELECTOR = [
  '[aria-invalid="true"]',
  '[data-validation-error="true"]',
].join(", ");

const FOCUSABLE_SELECTOR = [
  "input:not(:disabled)",
  "textarea:not(:disabled)",
  "select:not(:disabled)",
  "button:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Call immediately after rendering field-level validation errors.
 * The animation frame lets React commit aria-invalid/data attributes first.
 */
export function scrollToFirstValidationError({
  root,
  selector = DEFAULT_ERROR_SELECTOR,
  behavior = "smooth",
  block = "center",
}: ScrollToValidationErrorOptions = {}) {
  window.requestAnimationFrame(() => {
    const searchRoot = root ?? document;
    const errorNode = searchRoot.querySelector<HTMLElement>(selector);

    if (!errorNode) return;

    errorNode.scrollIntoView({ behavior, block });

    const focusTarget = errorNode.matches(FOCUSABLE_SELECTOR)
      ? errorNode
      : errorNode.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

    focusTarget?.focus({ preventScroll: true });
  });
}
