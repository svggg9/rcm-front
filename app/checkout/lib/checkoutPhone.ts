import { isValidPhone } from "../../lib/validation";

export function isValidCheckoutPhone(value: string, countryCode: string): boolean {
  if (countryCode === "RU") return isValidPhone(value);
  const trimmed = value.trim();
  if (!/^\+[\d\s()-]+$/.test(trimmed)) return false;
  return /^\+[1-9]\d{7,14}$/.test(trimmed.replace(/[\s()-]/g, ""));
}

export function normalizeCheckoutPhone(value: string, countryCode: string): string {
  return countryCode === "RU" ? value.trim() : value.trim().replace(/[\s()-]/g, "");
}

export function checkoutPhoneError(countryCode: string): string {
  return countryCode === "RU" ? "Укажите корректный российский номер телефона" :
    "Введите номер с кодом страны, например +77001234567";
}
