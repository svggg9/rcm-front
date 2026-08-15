export function getRussianPhoneDigits(value: string | null | undefined): string {
  const rawValue = value ?? "";
  let digits = rawValue.replace(/\D/g, "");

  const hasExplicitCountryCode = /^\s*\+7/.test(rawValue);
  const hasElevenDigitCountryCode =
    digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"));

  if (hasExplicitCountryCode || hasElevenDigitCountryCode) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

export function normalizeRussianPhone(value: string | null | undefined): string {
  const digits = getRussianPhoneDigits(value);

  return digits ? `+7${digits}` : "";
}

export function formatRussianPhoneInput(value: string | null | undefined): string {
  const digits = getRussianPhoneDigits(value);

  if (!digits) return "";

  const areaCode = digits.slice(0, 3);
  let formatted = `(${areaCode}`;

  if (digits.length < 3) return formatted;

  formatted += ")";

  if (digits.length > 3) {
    formatted += ` ${digits.slice(3, 6)}`;
  }

  if (digits.length > 6) {
    formatted += ` ${digits.slice(6, 8)}`;
  }

  if (digits.length > 8) {
    formatted += `-${digits.slice(8, 10)}`;
  }

  return formatted;
}

export function formatRussianPhone(value: string | null | undefined): string {
  const formatted = formatRussianPhoneInput(value);

  return formatted ? `+7 ${formatted}` : "";
}
