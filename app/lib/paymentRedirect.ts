/** A payment URL must never be resolved relative to the current cart/account route. */
export function paymentConfirmationUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !localHttp) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
