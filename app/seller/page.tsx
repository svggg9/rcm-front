import { redirect } from "next/navigation";
import type { SellerTab } from "./types";

const paths: Record<SellerTab, string> = {
  home: "/seller/home", products: "/seller/products", orders: "/seller/orders",
  returns: "/seller/returns", finance: "/seller/finance", brand: "/seller/store", legal: "/seller/legal",
};

export default async function LegacySellerPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const source = await searchParams;
  const first = (key: string) => {
    const value = source[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const orderId = first("orderId");
  const returnId = first("returnId");
  if (orderId && /^[1-9]\d*$/.test(orderId)) redirect(`/seller/orders/${orderId}`);
  if (returnId && /^[1-9]\d*$/.test(returnId)) redirect(`/seller/returns/${returnId}`);
  const rawTab = first("tab");
  const tab: SellerTab = rawTab && Object.hasOwn(paths, rawTab) ? rawTab as SellerTab : "home";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(source)) {
    if (["tab", "orderId", "returnId"].includes(key)) continue;
    if (typeof value === "string") query.set(key, value);
    else value?.forEach(item => query.append(key, item));
  }
  redirect(`${paths[tab]}${query.size ? `?${query}` : ""}`);
}
