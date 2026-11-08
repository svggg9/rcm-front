export const DEFAULT_NEW_ARRIVALS_COUNT = 8;
export const MAX_NEW_ARRIVALS_COUNT = 100;

export function normalizeNewArrivalsCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_NEW_ARRIVALS_COUNT
    ? value : DEFAULT_NEW_ARRIVALS_COUNT;
}
