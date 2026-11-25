import { safeReturnPath } from "./safeReturnPath";

export function partnerOrigin(): string | null {
  return configuredOrigin(process.env.NEXT_PUBLIC_PARTNER_ORIGIN);
}

export function storefrontOrigin(): string | null {
  return configuredOrigin(process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN);
}

function configuredOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const loopback = url.hostname === "localhost" || url.hostname.endsWith(".localhost");
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
      || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

export function partnerSellerHref(path = "/seller/home"): string {
  const safe = sellerReturnPath(path);
  const origin = partnerOrigin();
  return origin ? `${origin}/auth/sso/start?next=${encodeURIComponent(safe)}` : safe;
}

export function sellerReturnPath(value: string | null | undefined): string {
  const path = safeReturnPath(value, "/seller/home");
  const pathname = path.split(/[?#]/, 1)[0];
  return pathname === "/seller" || pathname.startsWith("/seller/") ? path : "/seller/home";
}

export function sellerLoginPath(next: string): string {
  const path = sellerReturnPath(next);
  return process.env.RCM_PARTNER_INSTANCE === "true"
    ? `/auth/sso/start?next=${encodeURIComponent(path)}`
    : `/auth/login?next=${encodeURIComponent(path)}`;
}

export function sellerDeniedPath(): string {
  return process.env.RCM_PARTNER_INSTANCE === "true" ? "/auth/sso/denied" : "/";
}
