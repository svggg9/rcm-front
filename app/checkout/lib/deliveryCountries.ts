export type DeliveryCountry = { code: string; name: string };

// The fallback must never expose routes that the backend has not enabled.
export const DEFAULT_DELIVERY_COUNTRIES: DeliveryCountry[] = [{ code: "RU", name: "Россия" }];

export function parseDeliveryCountries(value: unknown): DeliveryCountry[] {
  if (!Array.isArray(value)) return DEFAULT_DELIVERY_COUNTRIES;
  const countries = value.filter((item): item is DeliveryCountry =>
    Boolean(item && typeof item === "object" && typeof item.code === "string" &&
      /^[A-Z]{2}$/.test(item.code) && typeof item.name === "string" && item.name.trim()));
  return countries.length ? countries : DEFAULT_DELIVERY_COUNTRIES;
}
