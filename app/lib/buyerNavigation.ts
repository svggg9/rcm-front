export type BuyerTab = "home" | "catalog" | "favorites" | "cart" | "account";

type SearchValues = { get: (name: string) => string | null };

export type BuyerMobilePage = {
  tab?: BuyerTab;
  title?: string;
  backHref?: string;
};

/** Buyer chrome follows the current route, never the user's seller/admin role. */
export function getBuyerMobilePage(
  pathname: string,
  search: SearchValues,
): BuyerMobilePage | null {
  if (pathname === "/") return { tab: "home" };
  if (pathname === "/catalog") return { tab: "catalog" };
  if (pathname === "/favorites") return { tab: "favorites" };
  if (pathname === "/cart") return { tab: "cart" };
  if (pathname === "/account") {
    if (search.get("orderId")) {
      return { title: "Заказ", backHref: "/account?tab=orders" };
    }
    return { tab: "account" };
  }
  if (pathname === "/checkout") {
    return { title: "Оформление", backHref: "/cart" };
  }
  if (pathname === "/checkout/result" || pathname.startsWith("/checkout/result/")) {
    return { title: "Заказ", backHref: "/account?tab=orders" };
  }
  if (pathname.startsWith("/product/") || pathname.startsWith("/p/")) {
    return { backHref: "/catalog" };
  }
  if (pathname.startsWith("/brand/")) {
    return { backHref: "/catalog" };
  }
  return null;
}
