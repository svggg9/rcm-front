const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9696";
const SERVER_API_URL = process.env.SERVER_API_URL ?? PUBLIC_API_URL;

export const API_URL =
  typeof window === "undefined" ? SERVER_API_URL : PUBLIC_API_URL;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://rcmarket.io";
