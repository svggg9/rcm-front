import { redirect } from "next/navigation";

import { getServerSession } from "../lib/session";
import { SellerPageClient } from "./SellerPageClient";
import {
  getSellerBrandsServer,
  getSellerFinanceServer,
  getSellerOnboardingStatusServer,
  getSellerOrderServer,
  getSellerOrdersServer,
  getSellerProductsServer,
} from "./lib/sellerServerApi";
import type {
  SellerBrand,
  SellerFinanceSummary,
  SellerOrder,
  SellerOrderListItem,
  SellerProductListItem,
  SellerTab,
} from "./types";
import type { SellerOnboardingStatus } from "./lib/sellerOnboardingApi";

type Props = {
  searchParams?: Promise<{
    tab?: string;
    orderId?: string;
  }>;
};

export default async function SellerPage({ searchParams: _searchParams }: Props) {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/login?next=/seller");
  }

  if (session.role !== "SELLER" && session.role !== "ADMIN") {
    redirect("/");
  }

  const searchParams = await _searchParams;
  const initialTab = parseSellerTab(searchParams?.tab);
  const initialOrderId = searchParams?.orderId ?? null;
  const parsedOrderId = initialOrderId ? Number(initialOrderId) : NaN;

  const [
    initialProducts,
    initialOrders,
    initialBrands,
    initialFinance,
    initialOnboardingStatus,
    initialSelectedOrder,
  ]: [
    SellerProductListItem[],
    SellerOrderListItem[],
    SellerBrand[],
    SellerFinanceSummary | null,
    SellerOnboardingStatus | null,
    SellerOrder | null,
  ] = await Promise.all([
    getSellerProductsServer(),
    getSellerOrdersServer(),
    getSellerBrandsServer(),
    getSellerFinanceServer(),
    getSellerOnboardingStatusServer(),
    initialTab === "orders" && Number.isFinite(parsedOrderId)
      ? getSellerOrderServer(parsedOrderId)
      : Promise.resolve(null),
  ]);

  return (
    <SellerPageClient
      initialProducts={initialProducts}
      initialOrders={initialOrders}
      initialBrands={initialBrands}
      initialFinance={initialFinance}
      initialOnboardingStatus={initialOnboardingStatus}
      initialTab={initialTab}
      initialOrderId={initialOrderId}
      initialSelectedOrder={initialSelectedOrder}
    />
  );
}

function parseSellerTab(value: string | undefined): SellerTab {
  if (
    value === "orders" ||
    value === "returns" ||
    value === "products" ||
    value === "finance" ||
    value === "brand" ||
    value === "legal"
  ) {
    return value;
  }

  return "home";
}
