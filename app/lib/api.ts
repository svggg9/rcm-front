export const API_URL = "http://localhost:9696";

// app/lib/api.ts
import { getToken } from "./auth";

export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getToken();

  const headers = new Headers(options.headers);

  // JWT
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Content-Type ставим ТОЛЬКО если это не FormData и если его еще нет
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers });
}
