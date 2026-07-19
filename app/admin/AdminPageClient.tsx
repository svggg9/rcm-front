"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "./Admin.module.css";

import { AdminSidebar } from "./components/AdminSidebar";
import { AdminOrdersTab } from "./components/AdminOrdersTab";
import { AdminOrderDetails } from "./components/AdminOrderDetails";
import { AdminProductsTab } from "./components/AdminProductsTab";
import { AdminProductDetails } from "./components/AdminProductDetails";
import { AdminSellersTab } from "./components/AdminSellersTab";
import { AdminDictionariesTab } from "./components/AdminDictionariesTab";
import { AdminFinanceTab } from "./components/AdminFinanceTab";
import { AdminCdekTab } from "./components/AdminCdekTab";

import {
  approveProduct,
  assignProductCategory,
  blockProduct,
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

function normalizeTab(raw: string | null): AdminTab {
  if (raw === "orders") return "orders";
  if (raw === "sellers") return "sellers";
  if (raw === "dictionaries") return "dictionaries";
  if (raw === "finance") return "finance";
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
    raw === "BUYER_DELIVERY_FEE" ||
    raw === "DELIVERY_COST_FORWARD" ||
    raw === "DELIVERY_SUBSIDY" ||
    raw === "DELIVERY_COST_RETURN" ||
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

function AdminPageContent({ initialData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skippedInitialListLoadRef = useRef(false);
  const skippedInitialDetailsLoadRef = useRef(false);
  const skippedInitialOrderDetailsLoadRef = useRef(false);

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

  const [products, setProducts] = useState<AdminProduct[]>(
    initialData?.products ?? []
  );
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(
    initialData?.selectedProduct ?? null
  );
  const [orders, setOrders] = useState<AdminOrderListItem[]>(
    initialData?.orders ?? []
  );
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(
    initialData?.selectedOrder ?? null
  );
  const [totalProducts, setTotalProducts] = useState(
    initialData?.totalProducts ?? 0
  );
  const [totalOrders, setTotalOrders] = useState(
    initialData?.totalOrders ?? 0
  );
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

  const [sellerApplications, setSellerApplications] = useState<
    AdminSellerApplication[]
  >(initialData?.sellerApplications ?? []);
  const [totalSellerApplications, setTotalSellerApplications] = useState(
    initialData?.totalSellerApplications ?? 0
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
  const [ledgerEntries, setLedgerEntries] = useState<
    AdminFinancialLedgerEntry[]
  >(initialData?.ledgerEntries ?? []);
  const [totalLedgerEntries, setTotalLedgerEntries] = useState(
    initialData?.totalLedgerEntries ?? 0
  );
  const [cdekWebhookEvents, setCdekWebhookEvents] = useState<
    AdminCdekWebhookEvent[]
  >(initialData?.cdekWebhookEvents ?? []);
  const [totalCdekWebhookEvents, setTotalCdekWebhookEvents] = useState(
    initialData?.totalCdekWebhookEvents ?? 0
  );

  const [categories, setCategories] = useState<DictionaryItem[]>(
    initialData?.categories ?? []
  );
  const [brands, setBrands] = useState<DictionaryItem[]>(
    initialData?.brands ?? []
  );
  const [sizes, setSizes] = useState<DictionaryItem[]>(
    initialData?.sizes ?? []
  );
  const [dictionaryActionKey, setDictionaryActionKey] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(!initialData);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [actionProductId, setActionProductId] = useState<number | null>(null);
  const [actionOrderId, setActionOrderId] = useState<number | null>(null);
  const [actionApplicationId, setActionApplicationId] = useState<number | null>(
    null
  );

  const [error, setError] = useState<string | null>(initialData?.error ?? null);

  const loadProducts = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (silent) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const [data, categoriesData, counts] = await Promise.all([
          getAdminProducts(currentStatus, 0, 50),
          getAdminDictionary("categories"),
          getAdminProductStatusCounts(),
        ]);

        setProducts(Array.isArray(data.content) ? data.content : []);
        setTotalProducts(data.totalElements ?? 0);
        setCategories(categoriesData);
        setProductStatusCounts(counts);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить товары");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentStatus]
  );

  const loadOrders = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (silent) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const data = await getAdminOrders(0, 50);

      setOrders(Array.isArray(data.content) ? data.content : []);
      setTotalOrders(data.totalElements ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadSellerApplications = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (silent) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const [data, counts] = await Promise.all([
          getAdminSellerApplications(currentApplicationStatus, 0, 50),
          getAdminSellerApplicationStatusCounts(),
        ]);

        setSellerApplications(Array.isArray(data.content) ? data.content : []);
        setTotalSellerApplications(data.totalElements ?? 0);
        setSellerApplicationStatusCounts(counts);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить заявки");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentApplicationStatus]
  );

  const loadDictionaries = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (silent) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const [categoriesData, brandsData, sizesData] =
        await Promise.all([
          getAdminDictionary("categories"),
          getAdminDictionary("brands"),
          getAdminDictionary("sizes"),
        ]);

      setCategories(categoriesData);
      setBrands(brandsData);
      setSizes(sizesData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить справочники");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadLedger = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (silent) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const data = await getAdminLedgerEntries({
          entryType: currentLedgerEntryType,
          orderGroupId: currentLedgerOrderGroupId,
          page: 0,
          size: 50,
        });

        setLedgerEntries(Array.isArray(data.content) ? data.content : []);
        setTotalLedgerEntries(data.totalElements ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить финансы");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentLedgerEntryType, currentLedgerOrderGroupId]
  );

  const loadCdekWebhookEvents = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (silent) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const data = await getAdminCdekWebhookEvents({
          page: 0,
          size: 50,
        });

        setCdekWebhookEvents(Array.isArray(data.content) ? data.content : []);
        setTotalCdekWebhookEvents(data.totalElements ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить события СДЭК");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const loadSelectedProduct = useCallback(async (id: number) => {
    setDetailsLoading(true);
    setError(null);

    try {
      const data = await getAdminProduct(id);
      setSelectedProduct(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить товар");
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const loadSelectedOrder = useCallback(async (id: number) => {
    setDetailsLoading(true);
    setError(null);

    try {
      const data = await getAdminOrder(id);
      setSelectedOrder(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить заказ");
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      !skippedInitialListLoadRef.current &&
      initialData?.tab === currentTab &&
      (
        (currentTab === "products" &&
          initialData.productStatus === currentStatus) ||
        currentTab === "orders" ||
        (currentTab === "sellers" &&
          initialData.applicationStatus === currentApplicationStatus) ||
        (currentTab === "finance" &&
          currentLedgerEntryType === "ALL" &&
          !currentLedgerOrderGroupId.trim()) ||
        currentTab === "delivery" ||
        currentTab === "dictionaries"
      )
    ) {
      skippedInitialListLoadRef.current = true;
      return;
    }

    if (currentTab === "products") {
      void loadProducts();
      return;
    }

    if (currentTab === "orders") {
      void loadOrders();
      return;
    }

    if (currentTab === "sellers") {
      void loadSellerApplications();
      return;
    }

    if (currentTab === "finance") {
      void loadLedger();
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
    initialData,
    loadProducts,
    loadOrders,
    loadSellerApplications,
    loadLedger,
    loadCdekWebhookEvents,
    loadDictionaries,
  ]);

  useEffect(() => {
    if (
      !skippedInitialDetailsLoadRef.current &&
      initialData?.tab === "products" &&
      initialData.selectedProductId === selectedProductId
    ) {
      skippedInitialDetailsLoadRef.current = true;
      return;
    }

    if (currentTab !== "products" || !selectedProductId) {
      setSelectedProduct(null);
      return;
    }

    const id = Number(selectedProductId);

    if (!Number.isFinite(id)) {
      setSelectedProduct(null);
      return;
    }

    void loadSelectedProduct(id);
  }, [currentTab, selectedProductId, initialData, loadSelectedProduct]);

  useEffect(() => {
    if (
      !skippedInitialOrderDetailsLoadRef.current &&
      initialData?.tab === "orders" &&
      initialData.selectedOrderId === selectedOrderId
    ) {
      skippedInitialOrderDetailsLoadRef.current = true;
      return;
    }

    if (currentTab !== "orders" || !selectedOrderId) {
      setSelectedOrder(null);
      return;
    }

    const id = Number(selectedOrderId);

    if (!Number.isFinite(id)) {
      setSelectedOrder(null);
      return;
    }

    void loadSelectedOrder(id);
  }, [currentTab, selectedOrderId, initialData, loadSelectedOrder]);

  function changeProductStatus(status: ProductStatus | "ALL") {
    router.push(`/admin?tab=products&status=${status}`);
  }

  function changeApplicationStatus(status: SellerApplicationStatus | "ALL") {
    router.push(`/admin?tab=sellers&applicationStatus=${status}`);
  }

  function changeLedgerEntryType(status: FinancialLedgerEntryType | "ALL") {
    const query = new URLSearchParams();
    query.set("tab", "finance");
    if (status !== "ALL") query.set("entryType", status);
    if (currentLedgerOrderGroupId.trim()) {
      query.set("orderGroupId", currentLedgerOrderGroupId.trim());
    }
    router.push(`/admin?${query.toString()}`);
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
    router.push(`/admin?${query.toString()}`);
  }

  function openProduct(productId: number) {
    router.push(
      `/admin?tab=products&status=${currentStatus}&productId=${productId}`
    );
  }

  function openOrder(orderId: number) {
    router.push(`/admin?tab=orders&orderId=${orderId}`);
  }

  function closeProductDetails() {
    router.push(`/admin?tab=products&status=${currentStatus}`);
  }

  async function refundSelectedOrder() {
    if (!selectedOrder) return;

    setActionOrderId(selectedOrder.id);
    setError(null);

    try {
      await refundAdminOrder(selectedOrder.id);
      await loadOrders({ silent: true });
      await loadSelectedOrder(selectedOrder.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось вернуть оплату";
      setError(message);
      throw new Error(message);
    } finally {
      setActionOrderId(null);
    }
  }

  async function createDictionaryItem(
    kind: DictionaryKind,
    item: Partial<DictionaryItem>
  ) {
    setDictionaryActionKey(`${kind}:create`);
    setError(null);

    try {
      await createAdminDictionaryItem(kind, item);
      await loadDictionaries({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать значение");
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
      await updateAdminDictionaryItem(kind, id, item);
      await loadDictionaries({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить значение");
    } finally {
      setDictionaryActionKey(null);
    }
  }

  async function deleteDictionaryItem(kind: DictionaryKind, id: number) {
    setDictionaryActionKey(`${kind}:${id}`);
    setError(null);

    try {
      await deleteAdminDictionaryItem(kind, id);
      await loadDictionaries({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выключить значение");
    } finally {
      setDictionaryActionKey(null);
    }
  }

  async function runProductAction(
    productId: number,
    action: (id: number) => Promise<void>
  ) {
    setActionProductId(productId);
    setError(null);

    try {
      await action(productId);
      await loadProducts({ silent: true });

      if (selectedProduct?.id === productId) {
        await loadSelectedProduct(productId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выполнить действие");
    } finally {
      setActionProductId(null);
    }
  }

  async function assignSelectedProductCategory(params: {
    categoryId?: number;
    categoryName?: string;
  }) {
    if (!selectedProduct) return;

    const cleanName = params.categoryName?.trim();

    setActionProductId(selectedProduct.id);
    setError(null);

    try {
      let categoryId = params.categoryId;

      if (!categoryId && cleanName) {
        const created = await createAdminDictionaryItem("categories", {
          name: cleanName,
          isActive: true,
        });

        categoryId = created.id;
        await loadDictionaries({ silent: true });
      }

      if (!categoryId) {
        throw new Error("Выберите или создайте категорию");
      }

      await assignProductCategory(selectedProduct.id, categoryId);
      await loadProducts({ silent: true });
      await loadSelectedProduct(selectedProduct.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось назначить категорию");
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
      await loadProducts({ silent: true });
      await loadSelectedProduct(selectedProduct.id);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось вернуть товар на доработку"
      );
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
      await loadSellerApplications({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выполнить действие");
    } finally {
      setActionApplicationId(null);
    }
  }

  if (loading) {
    return null;
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.layout}>
          <AdminSidebar
            currentTab={currentTab}
            productsCount={totalProducts}
            ordersCount={totalOrders}
            sellersCount={totalSellerApplications}
          />

          <main className={styles.content}>
            {error ? <div className={styles.error}>{error}</div> : null}

            {currentTab === "dictionaries" ? (
              <AdminDictionariesTab
                categories={categories}
                brands={brands}
                sizes={sizes}
                actionKey={dictionaryActionKey}
                onCreate={(kind, item) => void createDictionaryItem(kind, item)}
                onUpdate={(kind, id, item) =>
                  void updateDictionaryItem(kind, id, item)
                }
                onDelete={(kind, id) => void deleteDictionaryItem(kind, id)}
              />
            ) : currentTab === "finance" ? (
              <AdminFinanceTab
                entries={ledgerEntries}
                totalElements={totalLedgerEntries}
                refreshing={refreshing}
                entryType={currentLedgerEntryType}
                orderGroupId={currentLedgerOrderGroupId}
                onEntryTypeChange={changeLedgerEntryType}
                onOrderGroupIdChange={changeLedgerOrderGroupId}
                onRefresh={() => void loadLedger({ silent: true })}
              />
            ) : currentTab === "delivery" ? (
              <AdminCdekTab
                events={cdekWebhookEvents}
                totalElements={totalCdekWebhookEvents}
                refreshing={refreshing}
                onRefresh={() => void loadCdekWebhookEvents({ silent: true })}
              />
            ) : currentTab === "orders" ? (
              detailsLoading ? (
                null
              ) : selectedOrder ? (
                <AdminOrderDetails
                  order={selectedOrder}
                  refunding={actionOrderId === selectedOrder.id}
                  onRefund={() => refundSelectedOrder()}
                  formatOrderStatus={formatOrderStatus}
                  formatPaymentStatus={formatPaymentStatus}
                  formatDeliveryStatus={formatDeliveryStatus}
                  buildStatusLabel={buildAdminOrderStatusLabel}
                />
              ) : (
                <AdminOrdersTab
                  orders={orders}
                  buildStatusLabel={buildAdminOrderStatusLabel}
                  onOpenOrder={openOrder}
                />
              )
            ) : currentTab === "sellers" ? (
              <AdminSellersTab
                applications={sellerApplications}
                status={currentApplicationStatus}
                totalElements={totalSellerApplications}
                refreshing={refreshing}
                actionApplicationId={actionApplicationId}
                statusCounts={sellerApplicationStatusCounts}
                onStatusChange={changeApplicationStatus}
                onRefresh={() => void loadSellerApplications({ silent: true })}
                onApprove={(id) =>
                  runSellerApplicationAction(id, approveSellerApplication)
                }
                onReject={(id, comment) =>
                  runSellerApplicationAction(id, (applicationId) =>
                    rejectSellerApplication(applicationId, comment)
                  )
                }
              />
            ) : detailsLoading ? (
              null
            ) : selectedProduct ? (
              <AdminProductDetails
                key={selectedProduct.id}
                product={selectedProduct}
                categories={categories}
                actionProductId={actionProductId}
                onBack={closeProductDetails}
                onAssignCategory={(params) =>
                  void assignSelectedProductCategory(params)
                }
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
            ) : (
              <AdminProductsTab
                products={products}
                status={currentStatus}
                refreshing={refreshing}
                actionProductId={actionProductId}
                totalElements={totalProducts}
                statusCounts={productStatusCounts}
                onStatusChange={changeProductStatus}
                onRefresh={() => void loadProducts({ silent: true })}
                onOpenProduct={openProduct}
                onApprove={(id) => void runProductAction(id, approveProduct)}
                onBlock={(id) => void runProductAction(id, blockProduct)}
                onUnblock={(id) => void runProductAction(id, unblockProduct)}
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
