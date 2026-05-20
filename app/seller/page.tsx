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

export default async function SellerPage({ searchParams }: Props) {
  console.time("seller session");
  const session = await getServerSession();
  console.timeEnd("seller session");

  if (!session) {
    redirect("/auth/login?next=/seller");
  }

  if (session.role !== "SELLER" && session.role !== "ADMIN") {
    redirect("/");
  }

  const params = await searchParams;
  const currentTab = params?.tab === "products" ? "products" : "orders";

  const dataLabel = `seller data ${currentTab}`;
  console.time(dataLabel);

  let initialProducts: SellerProductListItem[] = [];
  let initialOrders: SellerOrderListItem[] = [];

  if (currentTab === "products") {
    initialProducts = await getSellerProductsServer();
  } else {
    initialOrders = await getSellerOrdersServer();
  }

  console.timeEnd(dataLabel);

  return (
    <SellerPageClient
      initialProducts={initialProducts}
      initialOrders={initialOrders}
    />
  );
}