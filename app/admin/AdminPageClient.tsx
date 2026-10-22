"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useSessionResourceCache } from "../lib/useSessionResourceCache";
import { emitCategoriesChanged } from "../lib/categoryEvents";
import { createCategoryReadCoordinator } from "./lib/categoryReadCoordinator";
import {
  CabinetPageSkeleton,
  CabinetSkeleton,
  type CabinetSkeletonVariant,
} from "../components/ui/CabinetSkeleton";

import styles from "./Admin.module.css";

import { AdminSidebar } from "./components/AdminSidebar";
import { AdminProductDetails } from "./components/AdminProductDetails";
import { assignProductColor } from "./lib/adminApi";
import { AdminDictionariesTab } from "./components/AdminDictionariesTab";

import {
  approveProduct,
  assignProductCategory,
  blockProduct,
  cancelAdminOrderDelivery,
  getAdminOrder,
  getAdminOrders,
  getAdminProductStatusCounts,
  getAdminProduct,
  getAdminProducts,
  refundAdminOrder,
  unblockProduct,
  returnProductToRevision,
  createAdminDictionaryItem,
  deleteAdminDictionaryItem,
  getAdminDictionary,
  getAdminSellerApplicationStatusCounts,
  updateAdminDictionaryItem,
  approveSellerApplication,
  getAdminSellerApplications,
  getAdminLedgerEntries,
  getAdminCdekWebhookEvents,
  rejectSellerApplication,
} from "./lib/adminApi";

import type {
  AdminProduct,
  AdminProductListItem,
  AdminOrder,
  AdminOrderListItem,
  AdminInitialData,
  AdminTab,
  ProductStatus,
  DictionaryItem,
  DictionaryKind,
  AdminSellerApplication,
  SellerApplicationStatus,
  AdminFinancialLedgerEntry,
  AdminCdekWebhookEvent,
  FinancialLedgerEntryType,
} from "./types";

const AdminProductsTab = dynamic(
  () => import("./components/AdminProductsTab").then((module) => module.AdminProductsTab),
  { loading: () => <CabinetSkeleton variant="list" compact /> }
);
const AdminOrdersTab = dynamic(
  () => import("./components/AdminOrdersTab").then((module) => module.AdminOrdersTab),
  { loading: () => <CabinetSkeleton variant="list" compact /> }
);
const AdminOrderDetails = dynamic(
  () =>
    import("./components/AdminOrderDetails").then(
      (module) => module.AdminOrderDetails
    ),
  { loading: () => <CabinetSkeleton variant="detail" /> }
);
const AdminSellersTab = dynamic(
  () => import("./components/AdminSellersTab").then((module) => module.AdminSellersTab),
  { loading: () => <CabinetSkeleton variant="form" /> }
);
const AdminFinanceTab = dynamic(
  () => import("./components/AdminFinanceTab").then((module) => module.AdminFinanceTab),
  { loading: () => <CabinetSkeleton variant="dashboard" /> }
);
const AdminCdekTab = dynamic(
  () => import("./components/AdminCdekTab").then((module) => module.AdminCdekTab),
  { loading: () => <CabinetSkeleton variant="list" compact /> }
);
const AdminStorefrontTab = dynamic(
  () =>
    import("./components/AdminStorefrontTab").then(
      (module) => module.AdminStorefrontTab
    ),
  { loading: () => <CabinetSkeleton variant="form" /> }
);
const AdminContactsTab = dynamic(
  () => import("./components/AdminContactsTab").then((module) => module.AdminContactsTab),
  { loading: () => <CabinetSkeleton variant="list" compact /> }
);

function normalizeTab(raw: string | null): AdminTab {
  if (raw === "storefront") return "storefront";
  if (raw === "orders") return "orders";
  if (raw === "sellers") return "sellers";
  if (raw === "dictionaries") return "dictionaries";
  if (raw === "finance") return "finance";
  if (raw === "contact-messages" || raw === "contacts") return "contact-messages";
  if (raw === "delivery") return "delivery";
  return "products";
}

function normalizeProductStatus(raw: string | null): ProductStatus | "ALL" {
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
  raw: string | null
): SellerApplicationStatus | "ALL" {
  if (raw === "NEW" || raw === "APPROVED" || raw === "REJECTED" || raw === "ALL") {
    return raw;
  }

  return "NEW";
}

function normalizeLedgerEntryType(
  raw: string | null
): FinancialLedgerEntryType | "ALL" {
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

function formatOrderStatus(status: AdminOrder["status"]): string {
  switch (status) {
    case "NEW":
      return "Новый";
    case "CONFIRMED":
      return "Подтвержден";
    case "COMPLETED":
      return "Завершен";
    case "CANCELED":
      return "Отменен";
    default:
      return status;
  }
}

function formatPaymentStatus(status: AdminOrder["paymentStatus"]): string {
  switch (status) {
    case "PENDING":
      return "Ожидает оплаты";
    case "PAID":
      return "Оплачен";
    case "FAILED":
      return "Ошибка оплаты";
    case "CANCELED":
      return "Оплата отменена";
    case "REFUNDED":
      return "Возвращен";
    default:
      return status;
  }
}

function formatDeliveryStatus(status: AdminOrder["deliveryStatus"]): string {
  switch (status) {
    case "PENDING":
      return "Ожидает обработки";
    case "READY_FOR_SHIPMENT":
      return "Готов к отправке";
    case "READY_FOR_PICKUP":
      return "Готов к выдаче";
    case "IN_TRANSIT":
      return "В пути";
    case "DELIVERED":
      return "Доставлен";
    case "RETURNED":
      return "Возвращен";
    case "CANCELLED":
      return "Отменен";
    default:
      return status;
  }
}

function buildAdminOrderStatusLabel(order: AdminOrder | AdminOrderListItem): string {
  if (order.paymentStatus === "PENDING") return "Ожидает оплаты";
  if (order.paymentStatus === "FAILED") return "Ошибка оплаты";
  if (order.paymentStatus === "REFUNDED") return "Возврат оформлен";
  if (order.deliveryStatus === "READY_FOR_SHIPMENT") return "Готов к отправке";
  if (order.deliveryStatus === "READY_FOR_PICKUP") return "Готов к выдаче";
  if (order.deliveryStatus === "IN_TRANSIT") return "В пути";
  if (order.deliveryStatus === "DELIVERED") return "Доставлен";
  if (order.deliveryStatus === "RETURNED") return "Возвращен";
  if (order.deliveryStatus === "CANCELLED") return "Отменен";

  return formatOrderStatus(order.status);
}

type Props = {
  initialData?: AdminInitialData;
};

function getAdminListKey(
  tab: AdminTab,
  productStatus: ProductStatus | "ALL",
  applicationStatus: SellerApplicationStatus | "ALL",
  ledgerEntryType: FinancialLedgerEntryType | "ALL",
  ledgerOrderGroupId: string
) {
  if (tab === "products") return `${tab}:${productStatus}`;
  if (tab === "sellers") return `${tab}:${applicationStatus}`;
  if (tab === "finance") {
    return `${tab}:${ledgerEntryType}:${ledgerOrderGroupId.trim()}`;
  }
  return tab;
}

function getInitialAdminListKey(initialData: AdminInitialData) {
  return getAdminListKey(
    initialData.tab,
    initialData.productStatus,
    initialData.applicationStatus,
    initialData.ledgerEntryType,
    initialData.ledgerOrderGroupId
  );
}

function AdminPageContent({ initialData }: Props) {
  const searchParams = useSearchParams();

  const currentTab = normalizeTab(searchParams.get("tab"));
  const selectedProductId = searchParams.get("productId");
  const selectedOrderId = searchParams.get("orderId");

  const currentStatus = normalizeProductStatus(searchParams.get("status"));
  const currentApplicationStatus = normalizeApplicationStatus(
    searchParams.get("applicationStatus")
  );
  const currentLedgerEntryType = normalizeLedgerEntryType(
    searchParams.get("entryType")
  );
  const currentLedgerOrderGroupId = searchParams.get("orderGroupId") ?? "";
  const currentListKey = getAdminListKey(
    currentTab,
    currentStatus,
    currentApplicationStatus,
    currentLedgerEntryType,
    currentLedgerOrderGroupId
  );
  const currentListKeyRef = useRef(currentListKey);
  const currentTabRef = useRef(currentTab);
  const selectedProductIdRef = useRef(selectedProductId);
  const selectedOrderIdRef = useRef(selectedOrderId);
  currentListKeyRef.current = currentListKey;
  currentTabRef.current = currentTab;
  selectedProductIdRef.current = selectedProductId;
  selectedOrderIdRef.current = selectedOrderId;
  const loadedListKeyByTabRef = useRef<Map<AdminTab, string>>(
    new Map(
      initialData?.tabDataLoaded
        ? [[initialData.tab, getInitialAdminListKey(initialData)]]
        : []
    )
  );

  const [products, setProducts] = useState<AdminProductListItem[]>(
    initialData?.products ?? []
  );
  const invalidatedListTabsRef = useRef<Set<AdminTab>>(new Set());
  const [totalProducts, setTotalProducts] = useState(
    initialData?.totalProducts ?? 0
  );
  const [productsNextPage, setProductsNextPage] = useState<number | null>(() =>
    hasAnotherPage(initialData?.products.length ?? 0, initialData?.totalProducts ?? 0)
      ? 1
      : null
  );
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(
    initialData?.selectedProduct ?? null
  );
  const [orders, setOrders] = useState<AdminOrderListItem[]>(
    initialData?.orders ?? []
  );
  const [totalOrders, setTotalOrders] = useState(initialData?.totalOrders ?? 0);
  const [ordersNextPage, setOrdersNextPage] = useState<number | null>(() =>
    hasAnotherPage(initialData?.orders.length ?? 0, initialData?.totalOrders ?? 0)
      ? 1
      : null
  );
  const [storefrontHome, setStorefrontHome] = useState(
    initialData?.storefrontHome ?? null
  );
  const invalidateStorefrontHome = useCallback(() => {
    setStorefrontHome(null);
  }, []);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(
    initialData?.selectedOrder ?? null
  );
  const {
    get: getCachedProduct,
    peek: peekCachedProduct,
    seed: seedProduct,
    prefetch: prefetchProduct,
    invalidate: invalidateProduct,
  } = useSessionResourceCache<number, AdminProduct>(getAdminProduct);
  const {
    get: getCachedOrder,
    peek: peekCachedOrder,
    seed: seedOrder,
    prefetch: prefetchOrder,
  } = useSessionResourceCache<number, AdminOrder>(getAdminOrder);
  const [productStatusCounts, setProductStatusCounts] = useState(
    initialData?.productStatusCounts ?? {
      MODERATION: 0,
      NEEDS_REVISION: 0,
      ACTIVE: 0,
      BLOCKED: 0,
      DRAFT: 0,
      ARCHIVED: 0,
      ALL: 0,
    }
  );
  const productCountsLoadedRef = useRef(
    initialData?.tab === "products" && initialData.tabDataLoaded
  );

  const [sellerApplications, setSellerApplications] = useState<
    AdminSellerApplication[]
  >(initialData?.sellerApplications ?? []);
  const [totalSellerApplications, setTotalSellerApplications] = useState(
    initialData?.totalSellerApplications ?? 0
  );
  const [sellerApplicationsNextPage, setSellerApplicationsNextPage] = useState<
    number | null
  >(() =>
    hasAnotherPage(
      initialData?.sellerApplications.length ?? 0,
      initialData?.totalSellerApplications ?? 0
    )
      ? 1
      : null
  );
  const [
    sellerApplicationStatusCounts,
    setSellerApplicationStatusCounts,
  ] = useState(
    initialData?.sellerApplicationStatusCounts ?? {
      NEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      ALL: 0,
    }
  );
  const sellerCountsLoadedRef = useRef(
    initialData?.tab === "sellers" && initialData.tabDataLoaded
  );
  const [ledgerEntries, setLedgerEntries] = useState<
    AdminFinancialLedgerEntry[]
  >(initialData?.ledgerEntries ?? []);
  const [totalLedgerEntries, setTotalLedgerEntries] = useState(
    initialData?.totalLedgerEntries ?? 0
  );
  const [ledgerNextPage, setLedgerNextPage] = useState<number | null>(() =>
    hasAnotherPage(
      initialData?.ledgerEntries.length ?? 0,
      initialData?.totalLedgerEntries ?? 0
    )
      ? 1
      : null
  );
  const productsLoadIdRef = useRef(0);
  const ordersLoadIdRef = useRef(0);
  const sellersLoadIdRef = useRef(0);
  const ledgerLoadIdRef = useRef(0);
  const dictionariesLoadIdRef = useRef(0);
  const cdekLoadIdRef = useRef(0);
  const productDetailsLoadIdRef = useRef(0);
  const orderDetailsLoadIdRef = useRef(0);
  const [ledgerLoaded, setLedgerLoaded] = useState(
    initialData?.ledgerLoaded ?? false
  );
  const ledgerLoadedRef = useRef(initialData?.ledgerLoaded ?? false);
  const [cdekWebhookEvents, setCdekWebhookEvents] = useState<
    AdminCdekWebhookEvent[]
  >(initialData?.cdekWebhookEvents ?? []);
  const [totalCdekWebhookEvents, setTotalCdekWebhookEvents] = useState(
    initialData?.totalCdekWebhookEvents ?? 0
  );
  const [cdekNextPage, setCdekNextPage] = useState<number | null>(() =>
    hasAnotherPage(
      initialData?.cdekWebhookEvents.length ?? 0,
      initialData?.totalCdekWebhookEvents ?? 0
    )
      ? 1
      : null
  );

  const [categories, setCategories] = useState<DictionaryItem[]>(
    initialData?.categories ?? []
  );
  const [sizes, setSizes] = useState<DictionaryItem[]>(
    initialData?.sizes ?? []
  );
  const categoriesLoadedRef = useRef(initialData?.categoriesLoaded ?? false);
  const categoryReadsRef = useRef<ReturnType<typeof createCategoryReadCoordinator<DictionaryItem[]>> | null>(null);
  const [categoryRefreshError, setCategoryRefreshError] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [dictionaryActionKey, setDictionaryActionKey] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(!initialData?.tabDataLoaded);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMoreList, setLoadingMoreList] = useState<AdminTab | null>(null);
  const [listInvalidationVersion, setListInvalidationVersion] = useState(0);

  const [actionProductId, setActionProductId] = useState<number | null>(null);
  const [actionOrderId, setActionOrderId] = useState<number | null>(null);
  const [deliveryActionOrderId, setDeliveryActionOrderId] = useState<number | null>(null);
  const [actionApplicationId, setActionApplicationId] = useState<number | null>(
    null
  );

  const [error, setError] = useState<string | null>(initialData?.error ?? null);

  if (!categoryReadsRef.current) {
    categoryReadsRef.current = createCategoryReadCoordinator(
      () => getAdminDictionary("categories"),
      (items) => {
        setCategories(items);
        categoriesLoadedRef.current = true;
        setCategoryRefreshError(null);
        setCategoryLoading(false);
      }
    );
  }

  const readCategories = useCallback((options?: { reusePending?: boolean; failureMessage?: string }) => {
    setCategoryLoading(true);
    return categoryReadsRef.current!.read({
      reusePending: options?.reusePending,
      onError: (reason) => {
        categoriesLoadedRef.current = false;
        setCategoryLoading(false);
        const message = options?.failureMessage ?? (reason instanceof Error ? reason.message : "Не удалось загрузить категории");
        setCategoryRefreshError(message);
      },
    });
  }, []);

  const invalidateCategoryReads = useCallback(() => {
    categoryReadsRef.current!.invalidate();
    categoriesLoadedRef.current = false;
    setCategoryLoading(false);
  }, []);

  useEffect(() => {
    setError(null);
  }, [currentListKey]);

  useEffect(() => {
    if (initialData?.selectedProduct) {
      seedProduct(initialData.selectedProduct.id, initialData.selectedProduct);
    }
    if (initialData?.selectedOrder) {
      seedOrder(initialData.selectedOrder.id, initialData.selectedOrder);
    }
  }, [initialData, seedOrder, seedProduct]);

  const ensureCategories = useCallback(async () => {
    if (categoriesLoadedRef.current) return true;
    return readCategories({ reusePending: true });
  }, [readCategories]);

  const ensureProductCategories = useCallback(() => {
    void ensureCategories();
  }, [ensureCategories]);

  const loadProducts = useCallback(
    async (options?: {
      silent?: boolean;
      refreshCounts?: boolean;
      page?: number;
      append?: boolean;
    }) => {
      const expectedKey = getAdminListKey(
        "products",
        currentStatus,
        "ALL",
        "ALL",
        ""
      );
      if (currentListKeyRef.current !== expectedKey) return;
      const silent = options?.silent ?? false;
      const page = options?.page ?? 0;
      const append = options?.append ?? false;
      const loadId = ++productsLoadIdRef.current;
      const shouldLoadCounts =
        options?.refreshCounts ?? !productCountsLoadedRef.current;

      if (append) setLoadingMoreList("products");
      else if (silent) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const [data, counts] = await Promise.all([
          getAdminProducts(currentStatus, page, 50),
          shouldLoadCounts
            ? getAdminProductStatusCounts()
            : Promise.resolve(null),
        ]);

        if (
          loadId === productsLoadIdRef.current &&
          currentListKeyRef.current === expectedKey
        ) {
          const nextProducts = Array.isArray(data.content) ? data.content : [];
          setProducts((current) =>
            append ? appendUniqueById(current, nextProducts) : nextProducts
          );
          setTotalProducts(data.totalElements ?? nextProducts.length);
          setProductsNextPage(getNextPage(data));
          loadedListKeyByTabRef.current.set("products", expectedKey);
          if (counts) {
            setProductStatusCounts(counts);
            productCountsLoadedRef.current = true;
          }
        }
      } catch (e) {
        if (
          loadId === productsLoadIdRef.current &&
          currentListKeyRef.current === expectedKey
        ) {
          if (!append) {
            setProducts([]);
            setTotalProducts(0);
            setProductsNextPage(null);
            loadedListKeyByTabRef.current.delete("products");
          }
          setError(e instanceof Error ? e.message : "Не удалось загрузить товары");
        }
      } finally {
        if (loadId === productsLoadIdRef.current) {
          if (currentListKeyRef.current === expectedKey) {
            setLoading(false);
            setRefreshing(false);
          }
          setLoadingMoreList((current) =>
            current === "products" ? null : current
          );
        }
      }
    },
    [currentStatus]
  );

  const loadOrders = useCallback(async (options?: {
    silent?: boolean;
    page?: number;
    append?: boolean;
  }) => {
    const expectedKey = "orders";
    if (currentListKeyRef.current !== expectedKey) return;
    const silent = options?.silent ?? false;
    const page = options?.page ?? 0;
    const append = options?.append ?? false;
    const loadId = ++ordersLoadIdRef.current;

    if (append) setLoadingMoreList("orders");
    else if (silent) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const data = await getAdminOrders(page, 50);

      if (
        loadId === ordersLoadIdRef.current &&
        currentListKeyRef.current === expectedKey
      ) {
        const nextOrders = Array.isArray(data.content) ? data.content : [];
        setOrders((current) =>
          append ? appendUniqueById(current, nextOrders) : nextOrders
        );
        setTotalOrders(data.totalElements ?? nextOrders.length);
        setOrdersNextPage(getNextPage(data));
        loadedListKeyByTabRef.current.set("orders", expectedKey);
      }
    } catch (e) {
      if (
        loadId === ordersLoadIdRef.current &&
        currentListKeyRef.current === expectedKey
      ) {
        if (!append) {
          setOrders([]);
          setTotalOrders(0);
          setOrdersNextPage(null);
          loadedListKeyByTabRef.current.delete("orders");
        }
        setError(e instanceof Error ? e.message : "Не удалось загрузить заказы");
      }
    } finally {
      if (loadId === ordersLoadIdRef.current) {
        if (currentListKeyRef.current === expectedKey) {
          setLoading(false);
          setRefreshing(false);
        }
        setLoadingMoreList((current) =>
          current === "orders" ? null : current
        );
      }
    }
  }, []);

  const loadSellerApplications = useCallback(
    async (options?: {
      silent?: boolean;
      refreshCounts?: boolean;
      page?: number;
      append?: boolean;
    }) => {
      const expectedKey = getAdminListKey(
        "sellers",
        "ALL",
        currentApplicationStatus,
        "ALL",
        ""
      );
      if (currentListKeyRef.current !== expectedKey) return;
      const silent = options?.silent ?? false;
      const page = options?.page ?? 0;
      const append = options?.append ?? false;
      const loadId = ++sellersLoadIdRef.current;
      const shouldLoadCounts =
        options?.refreshCounts ?? !sellerCountsLoadedRef.current;

      if (append) setLoadingMoreList("sellers");
      else if (silent) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const [data, counts] = await Promise.all([
          getAdminSellerApplications(currentApplicationStatus, page, 50),
          shouldLoadCounts
            ? getAdminSellerApplicationStatusCounts()
            : Promise.resolve(null),
        ]);

        if (
          loadId === sellersLoadIdRef.current &&
          currentListKeyRef.current === expectedKey
        ) {
          const nextApplications = Array.isArray(data.content)
            ? data.content
            : [];
          setSellerApplications((current) =>
            append
              ? appendUniqueById(current, nextApplications)
              : nextApplications
          );
          setTotalSellerApplications(
            data.totalElements ?? nextApplications.length
          );
          setSellerApplicationsNextPage(getNextPage(data));
          loadedListKeyByTabRef.current.set("sellers", expectedKey);
          if (counts) {
            setSellerApplicationStatusCounts(counts);
            sellerCountsLoadedRef.current = true;
          }
        }
      } catch (e) {
        if (
          loadId === sellersLoadIdRef.current &&
          currentListKeyRef.current === expectedKey
        ) {
          if (!append) {
            setSellerApplications([]);
            setTotalSellerApplications(0);
            setSellerApplicationsNextPage(null);
            loadedListKeyByTabRef.current.delete("sellers");
          }
          setError(e instanceof Error ? e.message : "Не удалось загрузить заявки");
        }
      } finally {
        if (loadId === sellersLoadIdRef.current) {
          if (currentListKeyRef.current === expectedKey) {
            setLoading(false);
            setRefreshing(false);
          }
          setLoadingMoreList((current) =>
            current === "sellers" ? null : current
          );
        }
      }
    },
    [currentApplicationStatus]
  );

  const loadDictionaries = useCallback(async (options?: { silent?: boolean }) => {
    const expectedKey = "dictionaries";
    if (currentListKeyRef.current !== expectedKey) return;
    const loadId = ++dictionariesLoadIdRef.current;
    const silent = options?.silent ?? false;

    if (silent) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const [, sizesData] = await Promise.all([
        readCategories(),
        getAdminDictionary("sizes"),
      ]);

      if (
        loadId === dictionariesLoadIdRef.current &&
        currentListKeyRef.current === expectedKey
      ) {
        setSizes(sizesData);
        if (categoriesLoadedRef.current) loadedListKeyByTabRef.current.set("dictionaries", expectedKey);
        else loadedListKeyByTabRef.current.delete("dictionaries");
      }
    } catch (e) {
      if (
        loadId === dictionariesLoadIdRef.current &&
        currentListKeyRef.current === expectedKey
      ) {
        loadedListKeyByTabRef.current.delete("dictionaries");
        setError(e instanceof Error ? e.message : "Не удалось загрузить справочники");
      }
    } finally {
      if (
        loadId === dictionariesLoadIdRef.current &&
        currentListKeyRef.current === expectedKey
      ) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [readCategories]);

  const loadLedger = useCallback(
    async (options?: {
      silent?: boolean;
      page?: number;
      append?: boolean;
    }) => {
      const expectedKey = getAdminListKey(
        "finance",
        "ALL",
        "ALL",
        currentLedgerEntryType,
        currentLedgerOrderGroupId
      );
      if (currentListKeyRef.current !== expectedKey) return;
      const silent = options?.silent ?? false;
      const page = options?.page ?? 0;
      const append = options?.append ?? false;
      const loadId = ++ledgerLoadIdRef.current;

      if (append) setLoadingMoreList("finance");
      else if (silent) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const data = await getAdminLedgerEntries({
          entryType: currentLedgerEntryType,
          orderGroupId: currentLedgerOrderGroupId,
          page,
          size: 50,
        });

        if (
          loadId === ledgerLoadIdRef.current &&
          currentListKeyRef.current === expectedKey
        ) {
          const nextEntries = Array.isArray(data.content) ? data.content : [];
          setLedgerEntries((current) =>
            append ? appendUniqueById(current, nextEntries) : nextEntries
          );
          setTotalLedgerEntries(data.totalElements ?? 0);
          setLedgerNextPage(getNextPage(data));
          setLedgerLoaded(true);
          ledgerLoadedRef.current = true;
          loadedListKeyByTabRef.current.set("finance", expectedKey);
        }
      } catch (e) {
        if (
          loadId === ledgerLoadIdRef.current &&
          currentListKeyRef.current === expectedKey
        ) {
          if (!append) {
            setLedgerEntries([]);
            setTotalLedgerEntries(0);
            setLedgerNextPage(null);
            setLedgerLoaded(false);
            ledgerLoadedRef.current = false;
            loadedListKeyByTabRef.current.delete("finance");
          }
          setError(e instanceof Error ? e.message : "Не удалось загрузить финансы");
        }
      } finally {
        if (loadId === ledgerLoadIdRef.current) {
          if (currentListKeyRef.current === expectedKey) {
            setLoading(false);
            setRefreshing(false);
          }
          setLoadingMoreList((current) =>
            current === "finance" ? null : current
          );
        }
      }
    },
    [currentLedgerEntryType, currentLedgerOrderGroupId]
  );

  const refreshDictionary = useCallback(async (kind: DictionaryKind, failureMessage?: string) => {
    if (kind === "categories") {
      return readCategories({ failureMessage });
    } else if (kind === "sizes") {
      setSizes(await getAdminDictionary(kind));
    }
    return true;
  }, [readCategories]);

  const loadCdekWebhookEvents = useCallback(
    async (options?: {
      silent?: boolean;
      page?: number;
      append?: boolean;
    }) => {
      const expectedKey = "delivery";
      if (currentListKeyRef.current !== expectedKey) return;
      const loadId = ++cdekLoadIdRef.current;
      const silent = options?.silent ?? false;
      const page = options?.page ?? 0;
      const append = options?.append ?? false;

      if (append) setLoadingMoreList("delivery");
      else if (silent) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const data = await getAdminCdekWebhookEvents({
          page,
          size: 50,
        });

        if (
          loadId === cdekLoadIdRef.current &&
          currentListKeyRef.current === expectedKey
        ) {
          const nextEvents = Array.isArray(data.content) ? data.content : [];
          setCdekWebhookEvents((current) =>
            append ? appendUniqueById(current, nextEvents) : nextEvents
          );
          setTotalCdekWebhookEvents(data.totalElements ?? 0);
          setCdekNextPage(getNextPage(data));
          loadedListKeyByTabRef.current.set("delivery", expectedKey);
        }
      } catch (e) {
        if (
          loadId === cdekLoadIdRef.current &&
          currentListKeyRef.current === expectedKey
        ) {
          if (!append) {
            setCdekWebhookEvents([]);
            setTotalCdekWebhookEvents(0);
            setCdekNextPage(null);
            loadedListKeyByTabRef.current.delete("delivery");
          }
          setError(e instanceof Error ? e.message : "Не удалось загрузить события СДЭК");
        }
      } finally {
        if (loadId === cdekLoadIdRef.current) {
          if (currentListKeyRef.current === expectedKey) {
            setLoading(false);
            setRefreshing(false);
          }
          setLoadingMoreList((current) =>
            current === "delivery" ? null : current
          );
        }
      }
    },
    []
  );

  const loadSelectedProduct = useCallback(
    async (id: number, force = false) => {
      if (
        currentTabRef.current !== "products" ||
        Number(selectedProductIdRef.current) !== id
      ) {
        return;
      }
      const loadId = ++productDetailsLoadIdRef.current;
      setDetailsLoading(true);
      setError(null);

      try {
        ensureProductCategories();
        const data = await getCachedProduct(id, { force });
        if (
          loadId === productDetailsLoadIdRef.current &&
          currentTabRef.current === "products" &&
          Number(selectedProductIdRef.current) === id
        ) {
          setSelectedProduct(data);
        }
      } catch (e) {
        if (
          loadId === productDetailsLoadIdRef.current &&
          currentTabRef.current === "products" &&
          Number(selectedProductIdRef.current) === id
        ) {
          setError(e instanceof Error ? e.message : "Не удалось загрузить товар");
        }
      } finally {
        if (
          loadId === productDetailsLoadIdRef.current &&
          currentTabRef.current === "products" &&
          Number(selectedProductIdRef.current) === id
        ) {
          setDetailsLoading(false);
        }
      }
    },
    [ensureProductCategories, getCachedProduct]
  );

  const loadSelectedOrder = useCallback(async (id: number, force = false) => {
    if (
      currentTabRef.current !== "orders" ||
      Number(selectedOrderIdRef.current) !== id
    ) {
      return;
    }
    const loadId = ++orderDetailsLoadIdRef.current;
    setDetailsLoading(true);
    setError(null);

    try {
      const data = await getCachedOrder(id, { force });
      if (
        loadId === orderDetailsLoadIdRef.current &&
        currentTabRef.current === "orders" &&
        Number(selectedOrderIdRef.current) === id
      ) {
        setSelectedOrder(data);
      }
    } catch (e) {
      if (
        loadId === orderDetailsLoadIdRef.current &&
        currentTabRef.current === "orders" &&
        Number(selectedOrderIdRef.current) === id
      ) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить заказ");
      }
    } finally {
      if (
        loadId === orderDetailsLoadIdRef.current &&
        currentTabRef.current === "orders" &&
        Number(selectedOrderIdRef.current) === id
      ) {
        setDetailsLoading(false);
      }
    }
  }, [getCachedOrder]);

  useEffect(() => {
    productDetailsLoadIdRef.current += 1;
    orderDetailsLoadIdRef.current += 1;
    setDetailsLoading(false);
  }, [currentTab]);

  useEffect(() => {
    const listKey = getAdminListKey(
      currentTab,
      currentStatus,
      currentApplicationStatus,
      currentLedgerEntryType,
      currentLedgerOrderGroupId
    );
    const invalidated = invalidatedListTabsRef.current.delete(currentTab);

    if (
      !invalidated &&
      loadedListKeyByTabRef.current.get(currentTab) === listKey
    ) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (currentTab === "storefront" || currentTab === "contact-messages") {
      loadedListKeyByTabRef.current.set(currentTab, listKey);
      setLoading(false);
      return;
    }

    if (currentTab === "products") {
      void loadProducts(
        invalidated ? { silent: true, refreshCounts: true } : undefined
      );
      return;
    }

    if (currentTab === "orders") {
      void loadOrders(invalidated ? { silent: true } : undefined);
      return;
    }

    if (currentTab === "sellers") {
      void loadSellerApplications(
        invalidated ? { silent: true, refreshCounts: true } : undefined
      );
      return;
    }

    if (currentTab === "finance") {
      if (
        ledgerLoadedRef.current ||
        currentLedgerEntryType !== "ALL" ||
        currentLedgerOrderGroupId.trim()
      ) {
        void loadLedger({ silent: true });
      } else {
        setLoading(false);
      }
      return;
    }

    if (currentTab === "delivery") {
      void loadCdekWebhookEvents();
      return;
    }

    void loadDictionaries();
  }, [
    currentTab,
    currentStatus,
    currentApplicationStatus,
    currentLedgerEntryType,
    currentLedgerOrderGroupId,
    listInvalidationVersion,
    initialData,
    loadProducts,
    loadOrders,
    loadSellerApplications,
    loadLedger,
    loadCdekWebhookEvents,
    loadDictionaries,
  ]);

  useEffect(() => {
    if (currentTab !== "products" || !selectedProductId) {
      if (currentTab === "products") {
        productDetailsLoadIdRef.current += 1;
        setDetailsLoading(false);
      }
      setSelectedProduct(null);
      return;
    }

    const id = Number(selectedProductId);

    if (!Number.isFinite(id)) {
      productDetailsLoadIdRef.current += 1;
      setDetailsLoading(false);
      setSelectedProduct(null);
      return;
    }

    const cached = peekCachedProduct(id);
    if (cached) {
      setSelectedProduct(cached);
      setDetailsLoading(false);
      ensureProductCategories();
      return;
    }

    setSelectedProduct(null);
    void loadSelectedProduct(id);
  }, [
    currentTab,
    ensureProductCategories,
    loadSelectedProduct,
    peekCachedProduct,
    selectedProductId,
  ]);

  useEffect(() => {
    if (currentTab !== "orders" || !selectedOrderId) {
      if (currentTab === "orders") {
        orderDetailsLoadIdRef.current += 1;
        setDetailsLoading(false);
      }
      setSelectedOrder(null);
      return;
    }

    const id = Number(selectedOrderId);

    if (!Number.isFinite(id)) {
      orderDetailsLoadIdRef.current += 1;
      setDetailsLoading(false);
      setSelectedOrder(null);
      return;
    }

    const cached = peekCachedOrder(id);
    if (cached) {
      setSelectedOrder(cached);
      setDetailsLoading(false);
      return;
    }

    setSelectedOrder(null);
    void loadSelectedOrder(id);
  }, [currentTab, loadSelectedOrder, peekCachedOrder, selectedOrderId]);

  function changeProductStatus(status: ProductStatus | "ALL") {
    navigateAdmin(`/admin?tab=products&status=${status}`);
  }

  function changeApplicationStatus(status: SellerApplicationStatus | "ALL") {
    navigateAdmin(`/admin?tab=sellers&applicationStatus=${status}`);
  }

  function changeLedgerEntryType(status: FinancialLedgerEntryType | "ALL") {
    const query = new URLSearchParams();
    query.set("tab", "finance");
    if (status !== "ALL") query.set("entryType", status);
    if (currentLedgerOrderGroupId.trim()) {
      query.set("orderGroupId", currentLedgerOrderGroupId.trim());
    }
    navigateAdmin(`/admin?${query.toString()}`);
  }

  function changeLedgerOrderGroupId(value: string) {
    const query = new URLSearchParams();
    query.set("tab", "finance");
    if (currentLedgerEntryType !== "ALL") {
      query.set("entryType", currentLedgerEntryType);
    }
    if (value.trim()) {
      query.set("orderGroupId", value.trim());
    }
    navigateAdmin(`/admin?${query.toString()}`);
  }

  function openProduct(productId: number) {
    prefetchProduct(productId);
    ensureProductCategories();
    navigateAdmin(
      `/admin?tab=products&status=${currentStatus}&productId=${productId}`
    );
  }

  function openOrder(orderId: number) {
    prefetchOrder(orderId);
    navigateAdmin(`/admin?tab=orders&orderId=${orderId}`);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  function closeProductDetails() {
    navigateAdmin(`/admin?tab=products&status=${currentStatus}`);
  }

  function navigateAdmin(href: string) {
    window.history.pushState(null, "", href);
  }

  async function refundSelectedOrder() {
    if (!selectedOrder) return;

    setActionOrderId(selectedOrder.id);
    setError(null);

    try {
      await refundAdminOrder(selectedOrder.id);
      loadedListKeyByTabRef.current.delete("orders");
      invalidatedListTabsRef.current.add("orders");
      setListInvalidationVersion((current) => current + 1);
      if (
        currentTabRef.current === "orders" &&
        Number(selectedOrderIdRef.current) === selectedOrder.id
      ) {
        await loadSelectedOrder(selectedOrder.id, true);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось вернуть оплату";
      if (
        currentTabRef.current === "orders" &&
        Number(selectedOrderIdRef.current) === selectedOrder.id
      ) {
        setError(message);
      }
      throw new Error(message);
    } finally {
      setActionOrderId(null);
    }
  }

  async function cancelSelectedOrderDelivery() {
    if (!selectedOrder) return;

    setDeliveryActionOrderId(selectedOrder.id);
    setError(null);

    try {
      await cancelAdminOrderDelivery(selectedOrder.id);
      loadedListKeyByTabRef.current.delete("orders");
      invalidatedListTabsRef.current.add("orders");
      setListInvalidationVersion((current) => current + 1);
      if (
        currentTabRef.current === "orders" &&
        Number(selectedOrderIdRef.current) === selectedOrder.id
      ) {
        await loadSelectedOrder(selectedOrder.id, true);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось отменить доставку";
      if (
        currentTabRef.current === "orders" &&
        Number(selectedOrderIdRef.current) === selectedOrder.id
      ) {
        setError(message);
      }
      throw new Error(message);
    } finally {
      setDeliveryActionOrderId(null);
    }
  }

  async function createDictionaryItem(
    kind: DictionaryKind,
    item: Partial<DictionaryItem>
  ) {
    setDictionaryActionKey(`${kind}:create`);
    setError(null);

    try {
      const created = await createAdminDictionaryItem(kind, item);
      if (kind === "categories") invalidateCategoryReads();
      if (kind === "categories") emitCategoriesChanged();
      if (kind === "categories") setCategories((current) => [...current.filter((category) => category.id !== created.id), created]);
      await refreshDictionary(kind, "Категория создана, но список не обновился — обновите его перед следующими изменениями");
    } catch (e) {
      if (kind !== "categories") setError(e instanceof Error ? e.message : "Не удалось создать значение");
      throw e;
    } finally {
      setDictionaryActionKey(null);
    }
  }

  async function updateDictionaryItem(
    kind: DictionaryKind,
    id: number,
    item: Partial<DictionaryItem>
  ) {
    setDictionaryActionKey(`${kind}:${id}`);
    setError(null);

    try {
      const updated = await updateAdminDictionaryItem(kind, id, item);
      if (kind === "categories") invalidateCategoryReads();
      if (kind === "categories") emitCategoriesChanged();
      if (kind === "categories") setCategories((current) => current.map((category) => category.id === id ? updated : category));
      await refreshDictionary(kind, "Категория сохранена, но список не обновился — обновите его перед следующими изменениями");
    } catch (e) {
      if (kind !== "categories") setError(e instanceof Error ? e.message : "Не удалось обновить значение");
      throw e;
    } finally {
      setDictionaryActionKey(null);
    }
  }

  async function deleteDictionaryItem(kind: DictionaryKind, id: number) {
    setDictionaryActionKey(`${kind}:${id}`);
    setError(null);

    try {
      await deleteAdminDictionaryItem(kind, id);
      if (kind === "categories") invalidateCategoryReads();
      if (kind === "categories") emitCategoriesChanged();
      if (kind === "categories") setCategories((current) => current.map((category) => category.id === id ? { ...category, isActive: false, effectiveActive: false } : category));
      await refreshDictionary(kind, "Категория отключена, но список не обновился — обновите его перед следующими изменениями");
    } catch (e) {
      if (kind !== "categories") setError(e instanceof Error ? e.message : "Не удалось выключить значение");
      throw e;
    } finally {
      setDictionaryActionKey(null);
    }
  }

  async function runProductAction(
    productId: number,
    action: (id: number) => Promise<void>
  ) {
    const expectedSelectedProductId = selectedProductIdRef.current;
    const revisionSourceId = selectedProduct?.id === productId ? selectedProduct.revisionSourceId : null;
    setActionProductId(productId);
    setError(null);

    try {
      await action(productId);
      invalidateProduct(productId);
      if (revisionSourceId) invalidateProduct(revisionSourceId);
      loadedListKeyByTabRef.current.delete("products");
      invalidatedListTabsRef.current.add("products");
      productCountsLoadedRef.current = false;
      setListInvalidationVersion((current) => current + 1);
      if (
        currentTabRef.current === "products" &&
        Number(selectedProductIdRef.current) === productId
      ) {
        if (revisionSourceId && action === approveProduct) openProduct(revisionSourceId);
        else await loadSelectedProduct(productId, true);
      }
    } catch (e) {
      if (
        currentTabRef.current === "products" &&
        selectedProductIdRef.current === expectedSelectedProductId
      ) {
        setError(e instanceof Error ? e.message : "Не удалось выполнить действие");
      }
    } finally {
      setActionProductId(null);
    }
  }

  async function assignSelectedProductCategory(params: {
    categoryId?: number;
    categoryName?: string;
    parentId?: number | null;
  }) {
    if (!selectedProduct) return;

    const cleanName = params.categoryName?.trim();

    setActionProductId(selectedProduct.id);
    setError(null);

    try {
      let categoryId = params.categoryId;

      if (!categoryId && cleanName) {
        if (params.parentId === undefined) throw new Error("Выберите раздел для новой категории");
        const created = await createAdminDictionaryItem("categories", {
          name: cleanName,
          parentId: params.parentId,
          isActive: true,
        });

        categoryId = created.id;
        invalidateCategoryReads();
        emitCategoriesChanged();
        setCategories((current) => [...current, created]);
      }

      if (!categoryId) {
        throw new Error("Выберите или создайте категорию");
      }

      await assignProductCategory(selectedProduct.id, categoryId);
      invalidateCategoryReads();
      void refreshDictionary("categories", "Категория назначена, но список не обновился — обновите его перед следующими изменениями");
      invalidateProduct(selectedProduct.id);
      loadedListKeyByTabRef.current.delete("products");
      invalidatedListTabsRef.current.add("products");
      productCountsLoadedRef.current = false;
      setListInvalidationVersion((current) => current + 1);
      if (
        currentTabRef.current === "products" &&
        Number(selectedProductIdRef.current) === selectedProduct.id
      ) {
        await loadSelectedProduct(selectedProduct.id, true);
      }
    } finally {
      setActionProductId(null);
    }
  }

  async function returnSelectedProductToRevision(comment: string) {
    if (!selectedProduct) return;

    setActionProductId(selectedProduct.id);
    setError(null);

    try {
      await returnProductToRevision(selectedProduct.id, comment);
      invalidateProduct(selectedProduct.id);
      loadedListKeyByTabRef.current.delete("products");
      invalidatedListTabsRef.current.add("products");
      productCountsLoadedRef.current = false;
      setListInvalidationVersion((current) => current + 1);
      if (
        currentTabRef.current === "products" &&
        Number(selectedProductIdRef.current) === selectedProduct.id
      ) {
        await loadSelectedProduct(selectedProduct.id, true);
      }
    } catch (e) {
      if (
        currentTabRef.current === "products" &&
        Number(selectedProductIdRef.current) === selectedProduct.id
      ) {
        setError(
          e instanceof Error ? e.message : "Не удалось вернуть товар на доработку"
        );
      }
    } finally {
      setActionProductId(null);
    }
  }

  async function runSellerApplicationAction(
    applicationId: number,
    action: (id: number) => Promise<void>
  ) {
    setActionApplicationId(applicationId);
    setError(null);

    try {
      await action(applicationId);
      loadedListKeyByTabRef.current.delete("sellers");
      invalidatedListTabsRef.current.add("sellers");
      sellerCountsLoadedRef.current = false;
      setListInvalidationVersion((current) => current + 1);
    } finally {
      setActionApplicationId(null);
    }
  }

  if (loading && !initialData) {
    return <CabinetPageSkeleton variant="list" />;
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.layout}>
          <AdminSidebar
            currentTab={currentTab}
            onNavigate={navigateAdmin}
          />

          <main className={styles.content} aria-busy={loading || detailsLoading}>
            {error ? <div className={styles.error}>{error}</div> : null}

            {loading ? (
              <CabinetSkeleton variant={getAdminSkeletonVariant(currentTab)} />
            ) : currentTab === "contact-messages" ? (
              <AdminContactsTab />
            ) : currentTab === "storefront" ? (
              <AdminStorefrontTab
                initialHome={storefrontHome}
                onHomeChange={setStorefrontHome}
                onInvalidate={invalidateStorefrontHome}
              />
            ) : currentTab === "dictionaries" ? (
              <AdminDictionariesTab
                categories={categories}
                sizes={sizes}
                actionKey={dictionaryActionKey}
                categoryError={categoryRefreshError}
                onRetryCategories={() => {
                  if (dictionaryActionKey !== null) return;
                  setDictionaryActionKey("categories:refresh");
                  void refreshDictionary("categories", "Не удалось обновить категории — попробуйте ещё раз")
                    .finally(() => setDictionaryActionKey(null));
                }}
                onCreate={(kind, item) => createDictionaryItem(kind, item)}
                onUpdate={(kind, id, item) =>
                  updateDictionaryItem(kind, id, item)
                }
                onDelete={(kind, id) => deleteDictionaryItem(kind, id)}
              />
            ) : currentTab === "finance" ? (
              <AdminFinanceTab
                entries={ledgerEntries}
                totalElements={totalLedgerEntries}
                refreshing={refreshing}
                ledgerLoaded={ledgerLoaded}
                ledgerLoadingMore={loadingMoreList === "finance"}
                entryType={currentLedgerEntryType}
                orderGroupId={currentLedgerOrderGroupId}
                onEntryTypeChange={changeLedgerEntryType}
                onOrderGroupIdChange={changeLedgerOrderGroupId}
                onLoadMoreLedger={
                  ledgerNextPage === null
                    ? undefined
                    : () =>
                        void loadLedger({
                          page: ledgerNextPage,
                          append: true,
                        })
                }
                onRefresh={() => void loadLedger({ silent: true })}
              />
            ) : currentTab === "delivery" ? (
              <AdminCdekTab
                events={cdekWebhookEvents}
                totalElements={totalCdekWebhookEvents}
                refreshing={refreshing}
                loadingMore={loadingMoreList === "delivery"}
                onRefresh={() => void loadCdekWebhookEvents({ silent: true })}
                onLoadMore={
                  cdekNextPage === null
                    ? undefined
                    : () =>
                        void loadCdekWebhookEvents({
                          page: cdekNextPage,
                          append: true,
                        })
                }
              />
            ) : currentTab === "orders" ? (
              selectedOrder ? (
                <AdminOrderDetails
                  order={selectedOrder}
                  refunding={actionOrderId === selectedOrder.id}
                  deliveryCancelling={deliveryActionOrderId === selectedOrder.id}
                  onRefund={() => refundSelectedOrder()}
                  onCancelDelivery={() => cancelSelectedOrderDelivery()}
                  formatOrderStatus={formatOrderStatus}
                  formatPaymentStatus={formatPaymentStatus}
                  formatDeliveryStatus={formatDeliveryStatus}
                  buildStatusLabel={buildAdminOrderStatusLabel}
                />
              ) : selectedOrderId && detailsLoading ? (
                <CabinetSkeleton variant="detail" />
              ) : (
                <AdminOrdersTab
                  orders={orders}
                  totalElements={totalOrders}
                  loadingMore={loadingMoreList === "orders"}
                  onLoadMore={
                    ordersNextPage === null
                      ? undefined
                      : () =>
                          void loadOrders({
                            page: ordersNextPage,
                            append: true,
                          })
                  }
                  buildStatusLabel={buildAdminOrderStatusLabel}
                  onOpenOrder={openOrder}
                  onLoadOrder={getCachedOrder}
                  onPrefetchOrder={prefetchOrder}
                />
              )
            ) : currentTab === "sellers" ? (
              <AdminSellersTab
                applications={sellerApplications}
                totalElements={totalSellerApplications}
                status={currentApplicationStatus}
                refreshing={refreshing}
                loadingMore={loadingMoreList === "sellers"}
                actionApplicationId={actionApplicationId}
                statusCounts={sellerApplicationStatusCounts}
                onStatusChange={changeApplicationStatus}
                onRefresh={() =>
                  void loadSellerApplications({ silent: true, refreshCounts: true })
                }
                onLoadMore={
                  sellerApplicationsNextPage === null
                    ? undefined
                    : () =>
                        void loadSellerApplications({
                          page: sellerApplicationsNextPage,
                          append: true,
                        })
                }
                onApprove={(id) =>
                  runSellerApplicationAction(id, approveSellerApplication)
                }
                onReject={(id, comment) =>
                  runSellerApplicationAction(id, (applicationId) =>
                    rejectSellerApplication(applicationId, comment)
                  )
                }
              />
            ) : selectedProduct ? (
              <AdminProductDetails
                key={selectedProduct.id}
                product={selectedProduct}
                categories={categories}
                categoryError={categoryRefreshError}
                categoryLoading={categoryLoading}
                onRetryCategories={() => {
                  if (!categoryLoading) void readCategories();
                }}
                actionProductId={actionProductId}
                onBack={closeProductDetails}
                onAssignCategory={assignSelectedProductCategory}
                onAssignColor={async (groupId, colorId, expectedName) => {
                  setActionProductId(selectedProduct.id);
                  try {
                    const updated = await assignProductColor(selectedProduct.id, groupId, colorId, expectedName);
                    invalidateProduct(selectedProduct.id);
                    setSelectedProduct(current => current?.id === updated.id ? updated : current);
                  } finally { setActionProductId(null); }
                }}
                onApprove={() =>
                  void runProductAction(selectedProduct.id, approveProduct)
                }
                onReturnToRevision={(comment) =>
                  void returnSelectedProductToRevision(comment)
                }
                onBlock={() =>
                  void runProductAction(selectedProduct.id, blockProduct)
                }
                onUnblock={() =>
                  void runProductAction(selectedProduct.id, unblockProduct)
                }
              />
            ) : selectedProductId && detailsLoading ? (
              <CabinetSkeleton variant="detail" />
            ) : (
              <AdminProductsTab
                products={products}
                totalElements={totalProducts}
                status={currentStatus}
                refreshing={refreshing}
                loadingMore={loadingMoreList === "products"}
                actionProductId={actionProductId}
                statusCounts={productStatusCounts}
                onStatusChange={changeProductStatus}
                onRefresh={() =>
                  void loadProducts({ silent: true, refreshCounts: true })
                }
                onLoadMore={
                  productsNextPage === null
                    ? undefined
                    : () =>
                        void loadProducts({
                          page: productsNextPage,
                          append: true,
                        })
                }
                onOpenProduct={openProduct}
                onPrefetchProduct={(productId) => {
                  prefetchProduct(productId);
                  ensureProductCategories();
                }}
                onApprove={(id) => runProductAction(id, approveProduct)}
                onBlock={(id) => runProductAction(id, blockProduct)}
                onUnblock={(id) => runProductAction(id, unblockProduct)}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export function AdminPageClient({ initialData }: Props) {
  return <AdminPageContent initialData={initialData} />;
}

function getAdminSkeletonVariant(tab: AdminTab): CabinetSkeletonVariant {
  if (tab === "storefront" || tab === "dictionaries" || tab === "sellers") {
    return "form";
  }
  return "list";
}

function getNextPage(page: { number: number; totalPages: number }) {
  return page.number + 1 < page.totalPages ? page.number + 1 : null;
}

function hasAnotherPage(loaded: number, total: number) {
  return total > loaded;
}

function appendUniqueById<T extends { id: number }>(current: T[], next: T[]) {
  if (next.length === 0) return current;

  const byId = new Map(current.map((item) => [item.id, item]));
  next.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values());
}
