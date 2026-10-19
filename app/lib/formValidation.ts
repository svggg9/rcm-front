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
  'input:not(:disabled):not([type="hidden"]):not([readonly])',
  "textarea:not(:disabled):not([readonly])",
  "select:not(:disabled)",
  "button:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const pendingFrames = new WeakMap<ParentNode, number>();

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
  const searchRoot = root ?? document;
  const pending = pendingFrames.get(searchRoot);
  if (pending !== undefined) window.cancelAnimationFrame(pending);
  pendingFrames.set(searchRoot, window.requestAnimationFrame(() => {
    pendingFrames.delete(searchRoot);
    const errorNode = Array.from(searchRoot.querySelectorAll<HTMLElement>(selector)).find(node =>
      node.getClientRects().length > 0 && !node.closest('[hidden], [inert], [aria-hidden="true"]') &&
      !node.matches(':disabled, [readonly], input[type="hidden"]'));

    if (!errorNode) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    errorNode.scrollIntoView({ behavior: reducedMotion ? "auto" : behavior, block });

    const focusTarget = errorNode.matches(FOCUSABLE_SELECTOR)
      ? errorNode
      : Array.from(errorNode.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).find(node => node.getClientRects().length > 0);

    focusTarget?.focus({ preventScroll: true });
  }));
}
