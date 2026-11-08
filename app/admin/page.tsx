import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CabinetPageSkeleton } from "../components/ui/CabinetSkeleton";

import { getServerSession } from "../lib/session";
import { AdminPageClient } from "./AdminPageClient";
import {
  getAdminDictionaryServer,
  getAdminOrderServer,
  getAdminOrdersServer,
  getAdminProductServer,
  getAdminProductStatusCountsServer,
  getAdminProductsServer,
  getAdminCdekWebhookEventsServer,
  getAdminSellerApplicationStatusCountsServer,
  getAdminSellerApplicationsServer,
  getAdminStorefrontHomeServer,
} from "./lib/adminServerApi";
import type {
  AdminInitialData,
  AdminTab,
  ProductStatus,
  SellerApplicationStatus,
  FinancialLedgerEntryType,
} from "./types";

type Props = {
  searchParams?: Promise<{
    tab?: string;
    q?: string;
    seller?: string;
    sellerView?: string;
    from?: string;
    to?: string;
    paymentStatus?: string;
    deliveryStatus?: string;
    status?: string;
    applicationStatus?: string;
    productId?: string;
    orderId?: string;
    entryType?: string;
    orderGroupId?: string;
  }>;
};

function normalizeTab(raw?: string): AdminTab {
  if (raw === "overview" || raw === "returns" || raw === "activity") return raw;
  if (raw === "storefront") return "storefront";
  if (raw === "orders") return "orders";
  if (raw === "sellers") return "sellers";
  if (raw === "dictionaries") return "dictionaries";
  if (raw === "finance") return "finance";
  if (raw === "contact-messages" || raw === "contacts") return "contact-messages";
  if (raw === "delivery") return "delivery";
  return raw ? "products" : "overview";
}

function normalizeProductStatus(raw?: string): ProductStatus | "ALL" {
  if (
    raw === "DRAFT" ||
    raw === "MODERATION" ||
    raw === "NEEDS_REVISION" ||
    raw === "ACTIVE" ||
    raw === "ARCHIVED" ||
    raw === "BLOCKED" ||
    raw === "ALL"
  ) {
    return raw;
  }

  return "MODERATION";
}

function normalizeApplicationStatus(
  raw?: string
): SellerApplicationStatus | "ALL" {
  if (raw === "NEW" || raw === "APPROVED" || raw === "REJECTED" || raw === "ALL") {
    return raw;
  }

  return "NEW";
}

function normalizeLedgerEntryType(raw?: string): FinancialLedgerEntryType | "ALL" {
  if (
    raw === "COMMISSION_ACCRUED" ||
    raw === "COMMISSION_REVERSED" ||
    raw === "BUYER_DELIVERY_FEE" ||
    raw === "DELIVERY_COST_FORWARD" ||
    raw === "DELIVERY_SUBSIDY" ||
    raw === "DELIVERY_COST_RETURN" ||
    raw === "BUYER_RETURN_DELIVERY_FEE" ||
    raw === "REFUND_ITEM" ||
    raw === "REFUND_DELIVERY" ||
    raw === "SELLER_DEBIT" ||
    raw === "SELLER_PAYOUT" ||
    raw === "ACQUIRING_FEE"
  ) {
    return raw;
  }
  return "ALL";
}

async function getInitialData(params: Awaited<Props["searchParams"]>) {
  const tab = normalizeTab(params?.tab);
  const productStatus = normalizeProductStatus(params?.status);
  const applicationStatus = normalizeApplicationStatus(params?.applicationStatus);
  const ledgerEntryType = normalizeLedgerEntryType(params?.entryType);
  const ledgerOrderGroupId = params?.orderGroupId?.trim() ?? "";
  const selectedProductId = params?.productId ?? null;
  const selectedOrderId = params?.orderId ?? null;

  const initialData: AdminInitialData = {
    tab, from:params?.from??"",to:params?.to??"",owner:params?.seller??"",sellerView:params?.sellerView??"directory",query: params?.q ?? "", paymentFilter: params?.paymentStatus ?? "", deliveryFilter: params?.deliveryStatus ?? "",
    tabDataLoaded: false,
    categoriesLoaded: false,
    productStatus,
    applicationStatus,
    ledgerEntryType,
    ledgerOrderGroupId,
    selectedProductId,
    selectedOrderId,
    products: [],
    totalProducts: 0,
    productStatusCounts: {
      MODERATION: 0,
      NEEDS_REVISION: 0,
      ACTIVE: 0,
      BLOCKED: 0,
      DRAFT: 0,
      ARCHIVED: 0,
      ALL: 0,
    },
    selectedProduct: null,
    orders: [],
    totalOrders: 0,
    selectedOrder: null,
    storefrontHome: null,
    sellerApplications: [],
    totalSellerApplications: 0,
    sellerApplicationStatusCounts: {
      NEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      ALL: 0,
    },
    ledgerEntries: [],
    totalLedgerEntries: 0,
    ledgerLoaded: false,
    cdekWebhookEvents: [],
    totalCdekWebhookEvents: 0,
    categories: [],
    sizes: [],
    error: null,
  };

  try {
    if (tab === "contact-messages" || tab === "overview" || tab === "returns" || tab === "activity") {
      initialData.tabDataLoaded = true;
    }

    if (tab === "storefront") {
      initialData.storefrontHome = await getAdminStorefrontHomeServer();
      initialData.tabDataLoaded = initialData.storefrontHome !== null;
    }

    if (tab === "products") {
      const productId = selectedProductId ? Number(selectedProductId) : NaN;
      const hasSelectedProduct = Number.isFinite(productId);
      const [productsData, productStatusCounts, selectedProduct, categories] = await Promise.all([
        getAdminProductsServer(productStatus, 0, 50, params?.q,params?.seller),
        getAdminProductStatusCountsServer(),
        hasSelectedProduct ? getAdminProductServer(productId) : Promise.resolve(null),
        hasSelectedProduct
          ? getAdminDictionaryServer("categories")
          : Promise.resolve(null),
      ]);

      initialData.products = Array.isArray(productsData?.content)
        ? productsData.content
        : [];
      initialData.totalProducts = productsData?.totalElements ?? 0;
      if (productStatusCounts) {
        initialData.productStatusCounts = productStatusCounts;
      }
      initialData.categories = categories ?? [];
      initialData.categoriesLoaded = categories !== null;
      initialData.selectedProduct = selectedProduct;
      initialData.tabDataLoaded =
        productsData !== null && productStatusCounts !== null;
    }

    if (tab === "orders") {
      const orderId = selectedOrderId ? Number(selectedOrderId) : NaN;
      const [ordersData, selectedOrder] = await Promise.all([
        getAdminOrdersServer(0, 50, params?.q, params?.paymentStatus, params?.deliveryStatus,params?.seller,params?.from,params?.to),
        Number.isFinite(orderId)
          ? getAdminOrderServer(orderId)
          : Promise.resolve(null),
      ]);

      initialData.orders = Array.isArray(ordersData?.content)
        ? ordersData.content
        : [];
      initialData.totalOrders = ordersData?.totalElements ?? 0;
      initialData.selectedOrder = selectedOrder;
      initialData.tabDataLoaded = ordersData !== null;
    }

    if (tab === "sellers" && params?.sellerView==="applications") {
      const [applicationsData, sellerApplicationStatusCounts] =
        await Promise.all([
          getAdminSellerApplicationsServer(applicationStatus, 0, 50, params?.q),
          getAdminSellerApplicationStatusCountsServer(),
        ]);

      initialData.sellerApplications = Array.isArray(applicationsData?.content)
        ? applicationsData.content
        : [];
      initialData.totalSellerApplications =
        applicationsData?.totalElements ?? 0;
      if (sellerApplicationStatusCounts) {
        initialData.sellerApplicationStatusCounts =
          sellerApplicationStatusCounts;
      }
      initialData.tabDataLoaded =
        applicationsData !== null && sellerApplicationStatusCounts !== null;
    }

    if (tab === "dictionaries") {
      const [categories, sizes] = await Promise.all([
        getAdminDictionaryServer("categories"),
        getAdminDictionaryServer("sizes"),
      ]);

      initialData.categories = categories ?? [];
      initialData.sizes = sizes ?? [];
      initialData.categoriesLoaded = categories !== null;
      initialData.tabDataLoaded = categories !== null && sizes !== null;
    }

    if(tab === "finance") initialData.tabDataLoaded=true;

    if (tab === "delivery") {
      const webhookEventsData = await getAdminCdekWebhookEventsServer(0, 50);

      initialData.cdekWebhookEvents = Array.isArray(webhookEventsData?.content)
        ? webhookEventsData.content
        : [];
      initialData.totalCdekWebhookEvents =
        webhookEventsData?.totalElements ?? 0;
      initialData.tabDataLoaded = webhookEventsData !== null;
    }
  } catch {
    initialData.error = "Не удалось загрузить данные админки";
  }

  return initialData;
}

export default function AdminPage(props: Props) {
  return (
    <Suspense fallback={<CabinetPageSkeleton variant="list" />}>
      <AdminPageData {...props} />
    </Suspense>
  );
}

async function AdminPageData({ searchParams }: Props) {
  const sessionPromise = getServerSession();
  const params = searchParams ? await searchParams : undefined;
  const initialDataPromise = getInitialData(params);
  const session = await sessionPromise;

  if (!session) {
    redirect("/auth/login?next=/admin");
  }

  if (session.role !== "ADMIN") {
    redirect("/");
  }

  const initialData = await initialDataPromise;

  return <AdminPageClient initialData={initialData} />;
}
