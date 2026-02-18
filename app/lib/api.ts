export const API_URL = "http://localhost:9696";

import { getToken } from "./auth";

export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getToken();

  const headers = new Headers(options.headers);

  // Content-Type ставим только если есть body
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
