"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "./Admin.module.css";

import { useClientAuth } from "../lib/useClientAuth";
import { useUserRole } from "../lib/useUserRole";

import { AdminSidebar } from "./components/AdminSidebar";
import { AdminProductsTab } from "./components/AdminProductsTab";
import { AdminProductDetails } from "./components/AdminProductDetails";
import { AdminSellersTab } from "./components/AdminSellersTab";

import {
  approveProduct,
  approveSeller,
  blockProduct,
  getAdminProduct,
  getAdminProducts,
  getAdminSellers,
  rejectSeller,
  unblockProduct,
} from "./lib/adminApi";

import type {
  AdminProduct,
  AdminSeller,
  AdminTab,
  ProductStatus,
  SellerFilter,
} from "./types";

function normalizeTab(raw: string | null): AdminTab {
  return raw === "sellers" ? "sellers" : "products";
}

function AdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isAuth = useClientAuth();
  const role = useUserRole();

  const currentTab = normalizeTab(searchParams.get("tab"));
  const selectedProductId = searchParams.get("productId");

  const statusParam = searchParams.get("status") as ProductStatus | "ALL" | null;
  const currentStatus: ProductStatus | "ALL" = statusParam || "MODERATION";

  const sellerFilterParam = searchParams.get("sellerFilter") as SellerFilter | null;
  const currentSellerFilter: SellerFilter = sellerFilterParam || "REQUESTS";

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);

  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [totalSellers, setTotalSellers] = useState(0);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [actionProductId, setActionProductId] = useState<number | null>(null);
  const [actionSellerId, setActionSellerId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuth === null) return;

    if (!isAuth) {
      router.push("/auth/login?next=/admin");
      return;
    }

    if (role && role !== "ADMIN") {
      router.push("/");
    }
  }, [isAuth, role, router]);

  async function loadProducts(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (silent) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const data = await getAdminProducts(currentStatus, 0, 50);
      setProducts(Array.isArray(data.content) ? data.content : []);
      setTotalProducts(data.totalElements ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить товары");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadSellers(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (silent) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const data = await getAdminSellers(currentSellerFilter, 0, 50);
      setSellers(Array.isArray(data.content) ? data.content : []);
      setTotalSellers(data.totalElements ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить продавцов");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadSelectedProduct(id: number) {
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
  }

  useEffect(() => {
    if (isAuth !== true || role !== "ADMIN") return;

    if (currentTab === "products") {
      void loadProducts();
    } else {
      void loadSellers();
    }
  }, [isAuth, role, currentTab, currentStatus, currentSellerFilter]);

  useEffect(() => {
    if (isAuth !== true || role !== "ADMIN") return;

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
  }, [isAuth, role, currentTab, selectedProductId]);

  function changeProductStatus(status: ProductStatus | "ALL") {
    router.push(`/admin?tab=products&status=${status}`);
  }

  function changeSellerFilter(filter: SellerFilter) {
    router.push(`/admin?tab=sellers&sellerFilter=${filter}`);
  }

  function openProduct(productId: number) {
    router.push(
      `/admin?tab=products&status=${currentStatus}&productId=${productId}`
    );
  }

  function closeProductDetails() {
    router.push(`/admin?tab=products&status=${currentStatus}`);
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

  async function runSellerAction(
    sellerId: number,
    action: (id: number) => Promise<void>
  ) {
    setActionSellerId(sellerId);
    setError(null);

    try {
      await action(sellerId);
      await loadSellers({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выполнить действие");
    } finally {
      setActionSellerId(null);
    }
  }

  if (isAuth === null || loading) {
    return (
      <div className="pageContainer">
        <div className={styles.page}>Загрузка…</div>
      </div>
    );
  }

  if (role && role !== "ADMIN") {
    return (
      <div className="pageContainer">
        <div className={styles.page}>Недостаточно прав.</div>
      </div>
    );
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.layout}>
          <AdminSidebar
            currentTab={currentTab}
            productsCount={totalProducts}
            sellersCount={totalSellers}
          />

          <main className={styles.content}>
            {error ? <div className={styles.error}>{error}</div> : null}

            {currentTab === "sellers" ? (
              <AdminSellersTab
                sellers={sellers}
                filter={currentSellerFilter}
                totalElements={totalSellers}
                refreshing={refreshing}
                actionSellerId={actionSellerId}
                onFilterChange={changeSellerFilter}
                onRefresh={() => void loadSellers({ silent: true })}
                onApprove={(id) => void runSellerAction(id, approveSeller)}
                onReject={(id) => void runSellerAction(id, rejectSeller)}
              />
            ) : detailsLoading ? (
              <div className={styles.sectionTitle}>Загрузка товара…</div>
            ) : selectedProduct ? (
              <AdminProductDetails
                product={selectedProduct}
                actionProductId={actionProductId}
                onBack={closeProductDetails}
                onApprove={() =>
                  void runProductAction(selectedProduct.id, approveProduct)
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

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminPageContent />
    </Suspense>
  );
}