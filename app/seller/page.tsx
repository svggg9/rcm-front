import { redirect } from "next/navigation";

import { getServerSession } from "../lib/session";
import { SellerPageClient } from "./SellerPageClient";
import {
  getSellerAccessAndBrandsServer,
  getSellerDashboardSummaryServer,
  getSellerFinanceServer,
  getSellerOnboardingStatusServer,
  getSellerOrdersServer,
  getSellerProductsServer,
} from "./lib/sellerServerApi";
import type { SellerTab } from "./types";

type Props = {
  searchParams?: Promise<{
    tab?: string;
    orderId?: string;
  }>;
};

export default async function SellerPage({ searchParams: _searchParams }: Props) {
  const searchParams = await _searchParams;
  const initialTab = parseSellerTab(searchParams?.tab);
  const initialOrderId = searchParams?.orderId ?? null;
  const shouldLoadInitialProducts = shouldLoadProducts(initialTab);
  const shouldLoadInitialOrders = shouldLoadOrders(initialTab);
  const shouldLoadInitialFinance = initialTab === "finance";
  const shouldLoadInitialDashboard = initialTab === "home";

  const [
    productResult,
    orderResult,
    accessAndBrands,
    initialFinance,
    initialDashboard,
    initialOnboardingStatus,
  ] = await Promise.all([
    shouldLoadInitialProducts
      ? getSellerProductsServer()
      : Promise.resolve({
          items: [],
          totalElements: 0,
          nextPage: null,
          loaded: false,
        }),
    shouldLoadInitialOrders
      ? getSellerOrdersServer()
      : Promise.resolve({
          items: [],
          totalElements: 0,
          nextPage: null,
          loaded: false,
        }),
    getSellerAccessAndBrandsServer(),
    shouldLoadInitialFinance ? getSellerFinanceServer() : Promise.resolve(null),
    shouldLoadInitialDashboard
      ? getSellerDashboardSummaryServer()
      : Promise.resolve(null),
    getSellerOnboardingStatusServer(),
  ]);

  if (accessAndBrands.status === 401 || accessAndBrands.status === 403) {
    const session = await getServerSession();

    if (!session) {
      redirect("/auth/login?next=/seller");
    }

    redirect("/");
  }

  if (accessAndBrands.status >= 400) {
    throw new Error("Не удалось загрузить данные магазина");
  }

  return (
    <SellerPageClient
      initialProducts={productResult.items}
      initialProductsTotal={productResult.totalElements}
      initialProductsNextPage={productResult.nextPage}
      initialOrders={orderResult.items}
      initialOrdersTotal={orderResult.totalElements}
      initialOrdersNextPage={orderResult.nextPage}
      initialBrands={accessAndBrands.brands}
      initialFinance={initialFinance}
      initialDashboard={initialDashboard}
      initialOnboardingStatus={initialOnboardingStatus}
      initialProductsLoaded={productResult.loaded}
      initialOrdersLoaded={orderResult.loaded}
      initialFinanceLoaded={initialFinance !== null}
      initialDashboardLoaded={initialDashboard !== null}
      initialTab={initialTab}
      initialOrderId={initialOrderId}
    />
  );
}

function shouldLoadProducts(tab: SellerTab) {
  return tab === "products";
}

function shouldLoadOrders(tab: SellerTab) {
  return tab === "orders";
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
