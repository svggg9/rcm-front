import { stripInputWhitespace } from "./inputWhitespace";

export type NumericRules = { fractionDigits?: number; min?: number; max?: number };
export const MONEY_RULES = { fractionDigits: 2, min: 0 } as const;
export const INTEGER_RULES = { fractionDigits: 0, min: 0, max: 2_147_483_647 } as const;
export const WEIGHT_RULES = { fractionDigits: 3, min: 0.001 } as const;

/** Editing grammar also permits an unfinished decimal separator. Never drops letters/signs. */
export function isNumericDraft(text: string, fractionDigits = 2): boolean {
  return fractionDigits === 0 ? /^\d*$/.test(text)
    : new RegExp(`^\\d*(?:[.,]\\d{0,${fractionDigits}})?$`).test(text);
}

/** Empty is null; malformed, out-of-range or unsafe values are NaN, never a different number. */
export function parseNumericInput(raw: string, { fractionDigits = 2, min = 0, max }: NumericRules = {}): number | null {
  const text = stripInputWhitespace(raw);
  if (!text) return null;
  if (!isNumericDraft(text, fractionDigits) || !/\d/.test(text)) return NaN;
  const value = Number(text.replace(",", "."));
  const safeMax = Number.MAX_SAFE_INTEGER / 10 ** fractionDigits;
  return Number.isFinite(value) && value >= min && value <= Math.min(max ?? safeMax, safeMax) ? value : NaN;
}

export function formatNumericInput(value: string | number | null | undefined): string {
  return value == null || (typeof value === "number" && !Number.isFinite(value)) ? "" : String(value).replace(".", ",");
}

export function numericInputError(raw: string, rules: NumericRules): string {
  const value = parseNumericInput(raw, rules);
  if (value === null || Number.isFinite(value)) return "";
  if (!isNumericDraft(stripInputWhitespace(raw), rules.fractionDigits)) return "Введите число в допустимом формате";
  const number = Number(stripInputWhitespace(raw).replace(",", "."));
  if (Number.isFinite(number) && rules.min !== undefined && number < rules.min) return `Минимальное значение — ${formatNumericInput(rules.min)}`;
  if (Number.isFinite(number) && rules.max !== undefined && number > rules.max) return `Максимальное значение — ${formatNumericInput(rules.max)}`;
  return "Укажите корректное число";
}
