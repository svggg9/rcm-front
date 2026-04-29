import { getToken } from "./auth";
import { API_URL } from "./config";

export { API_URL };

export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // важно для будущих cookie/refresh
  });
}