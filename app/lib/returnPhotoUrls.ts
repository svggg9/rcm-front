const photoPath = /^\/api\/returns\/[1-9]\d*\/photos\/[1-9]\d*$/;

// New responses use the authenticated API; old deployments still return public S3 URLs.
export function resolveReturnPhotoUrl(value: string, apiUrl: string): string | null {
  const apiBase = apiUrl.replace(/\/+$/, "");
  if (photoPath.test(value)) return `${apiBase}${value}`;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const decodedPath = decodeURIComponent(url.pathname);
    if (decodedPath.startsWith("/api/returns/")) {
      if (!photoPath.test(url.pathname) || url.search || url.hash || !apiBase) return null;
      const api = new URL(apiBase);
      if (url.origin !== api.origin || api.pathname !== "/") return null;
      return `${apiBase}${url.pathname}`;
    }
    return value;
  } catch {
    return null;
  }
}
