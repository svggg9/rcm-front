"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiFetch, API_URL } from "../lib/api";
import { useClientAuth } from "../lib/useClientAuth";

import { SellerSidebar } from "./components/SellerSidebar";
import { SellerOrdersTab } from "./components/SellerOrdersTab";
import { SellerOrderDetails } from "./components/SellerOrderDetails";
import { SellerProductCreateTab } from "./components/SellerProductCreateTab";

import type {
  Audience,
  CreateProductReq,
  Option,
  PageResponse,
  SellerDeliveryStatus,
  SellerOrder,
  SellerOrderStatus,
  SellerPaymentStatus,
  SellerTab,
} from "./types";

import styles from "./Seller.module.css";

function formatOrderStatus(status: SellerOrderStatus): string {
  switch (status) {
    case "NEW":
      return "Новый";
    case "CONFIRMED":
      return "Подтверждён";
    case "COMPLETED":
      return "Завершён";
    case "CANCELED":
      return "Отменён";
    default:
      return status;
  }
}

function formatPaymentStatus(status: SellerPaymentStatus): string {
  switch (status) {
    case "PENDING":
      return "Ожидает оплаты";
    case "PAID":
      return "Оплачен";
    case "FAILED":
      return "Ошибка оплаты";
    case "CANCELED":
      return "Оплата отменена";
    default:
      return status;
  }
}

function formatDeliveryStatus(status: SellerDeliveryStatus): string {
  switch (status) {
    case "PENDING":
      return "Ожидает обработки";
    case "READY_FOR_SHIPMENT":
      return "Готов к отправке";
    case "IN_TRANSIT":
      return "В пути";
    case "DELIVERED":
      return "Доставлен";
    default:
      return status;
  }
}

function buildSellerStatusLabel(order: SellerOrder): string {
  if (order.paymentStatus === "PENDING") {
    return "Ожидает оплаты";
  }

  if (order.paymentStatus === "FAILED") {
    return "Ошибка оплаты";
  }

  if (order.deliveryStatus === "READY_FOR_SHIPMENT") {
    return "Готов к отправке";
  }

  if (order.deliveryStatus === "IN_TRANSIT") {
    return "В пути";
  }

  if (order.deliveryStatus === "DELIVERED") {
    return "Доставлен";
  }

  return formatOrderStatus(order.status);
}

function canShipOrder(order: SellerOrder): boolean {
  return (
    order.paymentStatus === "PAID" &&
    (order.deliveryStatus === "PENDING" ||
      order.deliveryStatus === "READY_FOR_SHIPMENT")
  );
}

function SellerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuth = useClientAuth();

  const currentTab: SellerTab =
    searchParams.get("tab") === "products" ? "products" : "orders";
  const selectedOrderId = searchParams.get("orderId");

  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);

  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [shippingId, setShippingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [brandId, setBrandId] = useState<number | "">("");
  const [audience, setAudience] = useState<Audience>("UNISEX");
  const [size, setSize] = useState("Стандарт");
  const [color, setColor] = useState("Black");
  const [price, setPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [sku, setSku] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [createdProductId, setCreatedProductId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isAuth === null) return;
    if (!isAuth) {
      router.push("/auth/login?next=/seller?tab=orders");
    }
  }, [isAuth, router]);

  async function loadOrders(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/orders?page=0&size=20`);

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка загрузки (${response.status})`);
      }

      const data: PageResponse<SellerOrder> = await response.json();
      setOrders(Array.isArray(data.content) ? data.content : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isAuth !== true) return;
    void loadOrders();
  }, [isAuth]);

  useEffect(() => {
    if (currentTab !== "orders" || !selectedOrderId) {
      setSelectedOrder(null);
      return;
    }

    setDetailsLoading(true);
    setError(null);

    apiFetch(`${API_URL}/api/seller/orders/${selectedOrderId}`)
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || `Ошибка загрузки (${response.status})`);
        }

        return response.json() as Promise<SellerOrder>;
      })
      .then((data) => {
        setSelectedOrder(data);
        setDetailsLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setDetailsLoading(false);
      });
  }, [currentTab, selectedOrderId]);

  useEffect(() => {
    if (currentTab !== "products" || isAuth !== true) return;

    let cancelled = false;

    async function loadLists() {
      setLoadingLists(true);
      setError(null);

      try {
        const [categoriesResponse, brandsResponse] = await Promise.all([
          apiFetch(`${API_URL}/api/categories`),
          apiFetch(`${API_URL}/api/brands`),
        ]);

        if (!categoriesResponse.ok) {
          throw new Error("Не удалось загрузить категории");
        }

        if (!brandsResponse.ok) {
          throw new Error("Не удалось загрузить бренды");
        }

        const categoriesData: Option[] = await categoriesResponse.json();
        const brandsData: Option[] = await brandsResponse.json();

        if (cancelled) return;

        const safeCategories = Array.isArray(categoriesData) ? categoriesData : [];
        const safeBrands = Array.isArray(brandsData) ? brandsData : [];

        setCategories(safeCategories);
        setBrands(safeBrands);

        if (safeCategories.length && categoryId === "") {
          setCategoryId(safeCategories[0].id);
        }

        if (safeBrands.length && brandId === "") {
          setBrandId(safeBrands[0].id);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка загрузки справочников");
        }
      } finally {
        if (!cancelled) {
          setLoadingLists(false);
        }
      }
    }

    void loadLists();

    return () => {
      cancelled = true;
    };
  }, [currentTab, isAuth, categoryId, brandId]);

  async function ship(orderId: number) {
    setShippingId(orderId);
    setError(null);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/orders/${orderId}/ship`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка отправки (${response.status})`);
      }

      if (selectedOrder?.id === orderId) {
        const updated: SellerOrder = await response.json();
        setSelectedOrder(updated);
        await loadOrders({ silent: true });
      } else {
        await loadOrders({ silent: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отметить отправку");
    } finally {
      setShippingId(null);
    }
  }

  async function createProduct() {
    if (submitting) return;

    setError(null);

    if (!title.trim()) return setError("Введите название");
    if (!description.trim()) return setError("Введите описание");
    if (categoryId === "") return setError("Выберите категорию");
    if (brandId === "") return setError("Выберите бренд");
    if (!sku.trim()) return setError("Введите SKU");
    if (price <= 0) return setError("Цена должна быть > 0");
    if (quantity <= 0) return setError("Кол-во должно быть > 0");

    const payload: CreateProductReq = {
      title: title.trim(),
      description: description.trim(),
      categoryId: Number(categoryId),
      brandId: Number(brandId),
      audience,
      variants: [
        {
          size: size.trim(),
          color: color.trim(),
          price: Number(price),
          quantity: Number(quantity),
          sku: sku.trim(),
        },
      ],
    };

    setSubmitting(true);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        setError(text || `Ошибка создания товара (${response.status})`);
        return;
      }

      const id: number = await response.json();
      setCreatedProductId(id);
    } catch {
      setError("Ошибка создания товара (network)");
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadImage() {
    if (!createdProductId) return setError("Сначала создай товар");
    if (!file) return setError("Выбери файл");

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiFetch(
        `${API_URL}/api/seller/products/${createdProductId}/images`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        setError(text || `Ошибка загрузки фото (${response.status})`);
        return;
      }

      const url = await response.text();
      setImageUrl(url);
    } catch {
      setError("Ошибка загрузки фото (network)");
    } finally {
      setUploading(false);
    }
  }

  function openOrder(orderId: number) {
    router.push(`/seller?tab=orders&orderId=${orderId}`);
  }

  function closeOrderDetails() {
    router.push("/seller?tab=orders");
  }

  if (isAuth === null || loading) {
    return (
      <div className="pageContainer">
        <div className={styles.page}>Загрузка…</div>
      </div>
    );
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.layout}>
          <SellerSidebar currentTab={currentTab} ordersCount={orders.length} />

          <div className={styles.content}>
            {error ? <div className={styles.error}>{error}</div> : null}

            {currentTab === "products" ? (
              <SellerProductCreateTab
                categories={categories}
                brands={brands}
                loadingLists={loadingLists}
                title={title}
                description={description}
                categoryId={categoryId}
                brandId={brandId}
                audience={audience}
                size={size}
                color={color}
                price={price}
                quantity={quantity}
                sku={sku}
                submitting={submitting}
                createdProductId={createdProductId}
                file={file}
                uploading={uploading}
                imageUrl={imageUrl}
                onTitleChange={setTitle}
                onDescriptionChange={setDescription}
                onCategoryIdChange={setCategoryId}
                onBrandIdChange={setBrandId}
                onAudienceChange={setAudience}
                onSizeChange={setSize}
                onColorChange={setColor}
                onPriceChange={setPrice}
                onQuantityChange={setQuantity}
                onSkuChange={setSku}
                onFileChange={setFile}
                onCreateProduct={createProduct}
                onUploadImage={uploadImage}
              />
            ) : detailsLoading ? (
              <div className={styles.sectionTitle}>Загрузка заказа…</div>
            ) : selectedOrder ? (
              <SellerOrderDetails
                order={selectedOrder}
                shipping={shippingId === selectedOrder.id}
                canShip={canShipOrder(selectedOrder)}
                onBack={closeOrderDetails}
                onShip={() => void ship(selectedOrder.id)}
                formatOrderStatus={formatOrderStatus}
                formatPaymentStatus={formatPaymentStatus}
                formatDeliveryStatus={formatDeliveryStatus}
                buildSellerStatusLabel={buildSellerStatusLabel}
              />
            ) : (
              <SellerOrdersTab
                orders={orders}
                refreshing={refreshing}
                shippingId={shippingId}
                buildSellerStatusLabel={buildSellerStatusLabel}
                canShipOrder={canShipOrder}
                onRefresh={() => void loadOrders({ silent: true })}
                onShip={(orderId) => void ship(orderId)}
                onOpenOrder={openOrder}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SellerPage() {
  return (
    <Suspense fallback={null}>
      <SellerPageContent />
    </Suspense>
  );
}