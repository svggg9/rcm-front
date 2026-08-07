const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function safeReturnPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (value.includes("\\") || CONTROL_CHARACTERS.test(value)) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      CONTROL_CHARACTERS.test(decoded)
    ) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return value;
}
