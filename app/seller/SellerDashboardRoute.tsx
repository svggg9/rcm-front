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

export type SellerDashboardSearchParams = {
  orderId?: string | string[];
  returnId?: string | string[];
  [key: string]: string | string[] | undefined;
};

export async function SellerDashboardRoute({ initialTab, searchParams: _searchParams }: {
  initialTab: SellerTab;
  searchParams?: Promise<SellerDashboardSearchParams>;
}) {
  const searchParams = await _searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const orderId = first(searchParams?.orderId);
  const returnId = first(searchParams?.returnId);
  if (orderId && /^[1-9]\d*$/.test(orderId)) redirect(`/seller/orders/${orderId}`);
  if (returnId && /^[1-9]\d*$/.test(returnId)) redirect(`/seller/returns/${returnId}`);
  const initialOrderId = orderId ?? null;
  const shouldLoadInitialProducts = shouldLoadProducts(initialTab);
  const shouldLoadInitialOrders = shouldLoadOrders(initialTab);
  const shouldLoadInitialFinance = initialTab === "finance";

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
    initialTab === "home" ? getSellerDashboardSummaryServer() : Promise.resolve(null),
    getSellerOnboardingStatusServer(),
  ]);

  if (accessAndBrands.status === 401 || accessAndBrands.status === 403) {
    const session = await getServerSession();

    if (!session) {
      const paths: Record<SellerTab, string> = { home: "home", products: "products", orders: "orders",
        returns: "returns", finance: "finance", brand: "store", legal: "legal" };
      redirect(`/auth/login?next=/seller/${paths[initialTab]}`);
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
