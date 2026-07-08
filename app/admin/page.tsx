import { redirect } from "next/navigation";

import { getServerSession } from "../lib/session";
import { AdminPageClient } from "./AdminPageClient";
import {
  getAdminDictionaryServer,
  getAdminProductServer,
  getAdminProductStatusCountsServer,
  getAdminProductsServer,
  getAdminLedgerEntriesServer,
  getAdminSellerApplicationStatusCountsServer,
  getAdminSellerApplicationsServer,
} from "./lib/adminServerApi";
import type {
  AdminInitialData,
  AdminTab,
  ProductStatus,
  SellerApplicationStatus,
} from "./types";

type Props = {
  searchParams?: Promise<{
    tab?: string;
    status?: string;
    applicationStatus?: string;
    productId?: string;
  }>;
};

function normalizeTab(raw?: string): AdminTab {
  if (raw === "sellers") return "sellers";
  if (raw === "dictionaries") return "dictionaries";
  if (raw === "finance") return "finance";
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

async function getInitialData(params: Awaited<Props["searchParams"]>) {
  const tab = normalizeTab(params?.tab);
  const productStatus = normalizeProductStatus(params?.status);
  const applicationStatus = normalizeApplicationStatus(params?.applicationStatus);
  const selectedProductId = params?.productId ?? null;

  const initialData: AdminInitialData = {
    tab,
    productStatus,
    applicationStatus,
    selectedProductId,
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
    categories: [],
    brands: [],
    sizes: [],
    error: null,
  };

  try {
    if (tab === "products") {
      const [productsData, categories, productStatusCounts] = await Promise.all([
        getAdminProductsServer(productStatus, 0, 50),
        getAdminDictionaryServer("categories"),
        getAdminProductStatusCountsServer(),
      ]);

      initialData.products = Array.isArray(productsData?.content)
        ? productsData.content
        : [];
      initialData.totalProducts = productsData?.totalElements ?? 0;
      initialData.productStatusCounts = productStatusCounts;
      initialData.categories = categories;

      const id = selectedProductId ? Number(selectedProductId) : NaN;
      if (Number.isFinite(id)) {
        initialData.selectedProduct = await getAdminProductServer(id);
      }
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
      initialData.sellerApplicationStatusCounts =
        sellerApplicationStatusCounts;
    }

    if (tab === "dictionaries") {
      const [categories, sizes] = await Promise.all([
        getAdminDictionaryServer("categories"),
        getAdminDictionaryServer("sizes"),
      ]);

      initialData.categories = categories;
      initialData.sizes = sizes;
    }

    if (tab === "finance") {
      const ledgerData = await getAdminLedgerEntriesServer(0, 50);

      initialData.ledgerEntries = Array.isArray(ledgerData?.content)
        ? ledgerData.content
        : [];
      initialData.totalLedgerEntries = ledgerData?.totalElements ?? 0;
    }
  } catch {
    initialData.error = "Не удалось загрузить данные админки";
  }

  return initialData;
}

export default async function AdminPage({ searchParams }: Props) {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/login?next=/admin");
  }

  if (session.role !== "ADMIN") {
    redirect("/");
  }

  const params = searchParams ? await searchParams : undefined;
  const initialData = await getInitialData(params);

  return <AdminPageClient initialData={initialData} />;
}
