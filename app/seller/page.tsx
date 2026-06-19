import { redirect } from "next/navigation";

import { getServerSession } from "../lib/session";
import { SellerPageClient } from "./SellerPageClient";
import {
  getSellerOrdersServer,
  getSellerProductsServer,
} from "./lib/sellerServerApi";
import type { SellerOrderListItem, SellerProductListItem } from "./types";

type Props = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

export default async function SellerPage({ searchParams: _searchParams }: Props) {
  console.time("seller session");
  const session = await getServerSession();
  console.timeEnd("seller session");

  if (!session) {
    redirect("/auth/login?next=/seller");
  }

  if (session.role !== "SELLER" && session.role !== "ADMIN") {
    redirect("/");
  }

  await _searchParams;

  console.time("seller data");
  const [initialProducts, initialOrders]: [
    SellerProductListItem[],
    SellerOrderListItem[],
  ] = await Promise.all([
    getSellerProductsServer(),
    getSellerOrdersServer(),
  ]);
  console.timeEnd("seller data");

  return (
    <SellerPageClient
      initialProducts={initialProducts}
      initialOrders={initialOrders}
    />
  );
}
