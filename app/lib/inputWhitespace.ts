export type InputSpacePolicy = "auto" | "allow" | "remove" | "formatted";

export function stripInputWhitespace(value: string): string {
  return value.replace(/[\s\u200B]/g, "");
}

export function resolveInputSpacePolicy({ spacePolicy = "auto", type, inputMode, autoComplete }: {
  spacePolicy?: InputSpacePolicy; type?: string; inputMode?: string; autoComplete?: string;
}): Exclude<InputSpacePolicy, "auto"> {
  if (spacePolicy !== "auto") return spacePolicy;
  // Spaces may be significant in an existing password, including when shown.
  if (type === "password" || /(?:^|\s)(?:current|new)-password(?:\s|$)/.test(autoComplete ?? "")) return "allow";
  return ["email", "tel", "url", "number"].includes(type ?? "") ||
    ["email", "tel", "url", "numeric", "decimal"].includes(inputMode ?? "") ? "remove" : "allow";
}

export function removeInputWhitespace(input: HTMLInputElement) {
  const raw = input.value;
  const clean = stripInputWhitespace(raw);
  if (clean === raw) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const direction = input.selectionDirection ?? undefined;
  input.value = clean;
  if (start !== null && end !== null) {
    input.setSelectionRange(stripInputWhitespace(raw.slice(0, start)).length,
      stripInputWhitespace(raw.slice(0, end)).length, direction);
  }
}

/** Native insertion retains the caret/undo stack; the setter is a fallback. */
export function insertInputText(input: HTMLInputElement, text: string) {
  try { if (input.ownerDocument.execCommand("insertText", false, text)) return true; } catch { /* Use an explicit range below when available. */ }
  const start = input.selectionStart;
  const end = input.selectionEnd;
  if (start === null || end === null) {
    // Email/number inputs do not expose selection ranges. Native insertion
    // preserves their actual caret and undo history without guessing a range.
    return false;
  }
  const available = input.maxLength >= 0 ? Math.max(0, input.maxLength - (input.value.length - (end - start))) : Infinity;
  const inserted = text.slice(0, available);
  const next = input.value.slice(0, start) + inserted + input.value.slice(end);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) return false;
  setter.call(input, next);
  input.setSelectionRange(start + inserted.length, start + inserted.length);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}
