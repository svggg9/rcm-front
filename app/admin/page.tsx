import { redirect } from "next/navigation";

import { getServerSession } from "../lib/session";
import { AdminPageClient } from "./AdminPageClient";
import {
  getAdminDictionaryServer,
  getAdminLedgerEntriesServer,
  getAdminOrderServer,
  getAdminOrdersServer,
  getAdminProductServer,
  getAdminProductStatusCountsServer,
  getAdminProductsServer,
  getAdminSellerPayoutsServer,
  getAdminSellerPayoutStatsServer,
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
    status?: string;
    applicationStatus?: string;
    productId?: string;
    orderId?: string;
    entryType?: string;
    orderGroupId?: string;
  }>;
};

function normalizeTab(raw?: string): AdminTab {
  if (raw === "storefront") return "storefront";
  if (raw === "orders") return "orders";
  if (raw === "sellers") return "sellers";
  if (raw === "dictionaries") return "dictionaries";
  if (raw === "finance") return "finance";
  if (raw === "delivery") return "delivery";
  return "products";
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
    tab,
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
    sellerPayouts: [],
    sellerPayoutStats: {
      totalCount: 0,
      readyAmount: 0,
      sentAmount: 0,
    },
    sellerPayoutsLoaded: false,
    cdekWebhookEvents: [],
    totalCdekWebhookEvents: 0,
    categories: [],
    sizes: [],
    error: null,
  };

  try {
    if (tab === "storefront") {
      initialData.storefrontHome = await getAdminStorefrontHomeServer();
      initialData.tabDataLoaded = initialData.storefrontHome !== null;
    }

    if (tab === "products") {
      const productId = selectedProductId ? Number(selectedProductId) : NaN;
      const hasSelectedProduct = Number.isFinite(productId);
      const [productsData, productStatusCounts, selectedProduct, categories] = await Promise.all([
        getAdminProductsServer(productStatus, 0, 50),
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
        getAdminOrdersServer(0, 50),
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

    if (tab === "sellers") {
      const [applicationsData, sellerApplicationStatusCounts] =
        await Promise.all([
          getAdminSellerApplicationsServer(applicationStatus, 0, 50),
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

    if (tab === "finance") {
      const opensLedger = ledgerEntryType !== "ALL" || Boolean(ledgerOrderGroupId);
      if (opensLedger) {
        const ledgerData = await getAdminLedgerEntriesServer(
          0,
          50,
          ledgerEntryType,
          ledgerOrderGroupId
        );
        initialData.ledgerEntries = Array.isArray(ledgerData?.content)
          ? ledgerData.content
          : [];
        initialData.totalLedgerEntries = ledgerData?.totalElements ?? 0;
        initialData.ledgerLoaded = ledgerData !== null;
        initialData.tabDataLoaded = initialData.ledgerLoaded;
      } else {
        const [payoutsData, payoutStats] = await Promise.all([
          getAdminSellerPayoutsServer(0, 50),
          getAdminSellerPayoutStatsServer(),
        ]);
        initialData.sellerPayouts = Array.isArray(payoutsData?.content)
          ? payoutsData.content
          : [];
        initialData.sellerPayoutStats = payoutStats ?? {
          totalCount: payoutsData?.totalElements ?? 0,
          readyAmount: 0,
          sentAmount: 0,
        };
        initialData.sellerPayoutsLoaded =
          payoutsData !== null && payoutStats !== null;
        initialData.tabDataLoaded = initialData.sellerPayoutsLoaded;
      }
    }

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

export default async function AdminPage({ searchParams }: Props) {
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
