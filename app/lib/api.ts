export const API_URL = "http://localhost:9696";

import { getToken } from "./auth";

export async function apiFetch(
  url: string,
  options: RequestInit = {}
) {
  const token = getToken();

const headers: Record<string, string> = {
  "Content-Type": "application/json",
};

if (token) {
  headers["Authorization"] = `Bearer ${token}`;
}

  return fetch(url, {
    ...options,
    headers,
  });
}
