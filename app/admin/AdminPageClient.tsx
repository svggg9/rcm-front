"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "./Admin.module.css";

import { AdminSidebar } from "./components/AdminSidebar";
import { AdminProductsTab } from "./components/AdminProductsTab";
import { AdminProductDetails } from "./components/AdminProductDetails";
import { AdminSellersTab } from "./components/AdminSellersTab";
import { AdminDictionariesTab } from "./components/AdminDictionariesTab";

import {
  approveProduct,
  assignProductCategory,
  blockProduct,
  getAdminProduct,
  getAdminProducts,
  unblockProduct,
  returnProductToRevision,
  createAdminDictionaryItem,
  deleteAdminDictionaryItem,
  getAdminDictionary,
  updateAdminDictionaryItem,
  approveSellerApplication,
  getAdminSellerApplications,
  rejectSellerApplication,
} from "./lib/adminApi";

import type {
  AdminProduct,
  AdminTab,
  ProductStatus,
  DictionaryItem,
  DictionaryKind,
  AdminSellerApplication,
  SellerApplicationStatus,
} from "./types";

function normalizeTab(raw: string | null): AdminTab {
  if (raw === "sellers") return "sellers";
  if (raw === "dictionaries") return "dictionaries";
  return "products";
}

function AdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTab = normalizeTab(searchParams.get("tab"));
  const selectedProductId = searchParams.get("productId");

  const statusParam = searchParams.get("status") as ProductStatus | "ALL" | null;
  const currentStatus: ProductStatus | "ALL" = statusParam || "MODERATION";

  const applicationStatusParam = searchParams.get("applicationStatus") as
    | SellerApplicationStatus
    | "ALL"
    | null;

  const currentApplicationStatus: SellerApplicationStatus | "ALL" =
    applicationStatusParam || "NEW";

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(
    null
  );
  const [totalProducts, setTotalProducts] = useState(0);

  const [sellerApplications, setSellerApplications] = useState<
    AdminSellerApplication[]
  >([]);
  const [totalSellerApplications, setTotalSellerApplications] = useState(0);

  const [categories, setCategories] = useState<DictionaryItem[]>([]);
  const [brands, setBrands] = useState<DictionaryItem[]>([]);
  const [sizes, setSizes] = useState<DictionaryItem[]>([]);
  const [dictionaryActionKey, setDictionaryActionKey] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [actionProductId, setActionProductId] = useState<number | null>(null);
  const [actionApplicationId, setActionApplicationId] = useState<number | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (silent) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const [data, categoriesData] = await Promise.all([
          getAdminProducts(currentStatus, 0, 50),
          getAdminDictionary("categories"),
        ]);

        setProducts(Array.isArray(data.content) ? data.content : []);
        setTotalProducts(data.totalElements ?? 0);
        setCategories(categoriesData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить товары");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentStatus]
  );

  const loadSellerApplications = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (silent) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const data = await getAdminSellerApplications(
          currentApplicationStatus,
          0,
          50
        );

        setSellerApplications(Array.isArray(data.content) ? data.content : []);
        setTotalSellerApplications(data.totalElements ?? 0);
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

  useEffect(() => {
    if (currentTab === "products") {
      void loadProducts();
      return;
    }

    if (currentTab === "sellers") {
      void loadSellerApplications();
      return;
    }

    void loadDictionaries();
  }, [currentTab, loadProducts, loadSellerApplications, loadDictionaries]);

  useEffect(() => {
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
  }, [currentTab, selectedProductId, loadSelectedProduct]);

  function changeProductStatus(status: ProductStatus | "ALL") {
    router.push(`/admin?tab=products&status=${status}`);
  }

  function changeApplicationStatus(status: SellerApplicationStatus | "ALL") {
    router.push(`/admin?tab=sellers&applicationStatus=${status}`);
  }

  function openProduct(productId: number) {
    router.push(
      `/admin?tab=products&status=${currentStatus}&productId=${productId}`
    );
  }

  function closeProductDetails() {
    router.push(`/admin?tab=products&status=${currentStatus}`);
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
            ) : currentTab === "sellers" ? (
              <AdminSellersTab
                applications={sellerApplications}
                status={currentApplicationStatus}
                totalElements={totalSellerApplications}
                refreshing={refreshing}
                actionApplicationId={actionApplicationId}
                onStatusChange={changeApplicationStatus}
                onRefresh={() => void loadSellerApplications({ silent: true })}
                onApprove={(id) =>
                  void runSellerApplicationAction(id, approveSellerApplication)
                }
                onReject={(id) =>
                  void runSellerApplicationAction(id, rejectSellerApplication)
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

export function AdminPageClient() {
  return <AdminPageContent />;
}
