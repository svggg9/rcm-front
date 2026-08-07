"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { apiFetch, API_URL } from "../../../../lib/api";
import { Button } from "../../../../components/ui/Button";

import { ProductGeneralCard } from "./components/ProductGeneralCard";
import { ProductVariantsCard } from "./components/ProductVariantsCard";
import { ProductShippingCard } from "./components/ProductShippingCard";
import { ProductPreviewAside } from "./components/ProductPreviewAside";
import { SellerSidebar } from "../../../components/SellerSidebar";
import {
  getSellerOnboardingStatus,
  type SellerOnboardingStatus,
} from "../../../lib/sellerOnboardingApi";
import { toast } from "sonner";

import type {
  Audience,
  Option,
  ProductImageItem,
  ProductVariant,
  SellerProduct,
} from "./types";
import { numberOrNull } from "./utils";

import styles from "./ProductEditPage.module.css";

type Props = {
  productId: number;
  initialStoreName: string | null;
  initialProduct: SellerProduct;
  initialCategories: Option[];
  initialBrands: Option[];
};

type ValidationErrors = {
  title?: boolean;
  description?: boolean;
  categoryId?: boolean;
  brandId?: boolean;
  images?: boolean;
  packageWidthCm?: boolean;
  packageHeightCm?: boolean;
  packageLengthCm?: boolean;
  packageWeightKg?: boolean;
  variants?: Record<
    number,
    {
      sku?: boolean;
      sizeId?: boolean;
      colorId?: boolean;
      price?: boolean;
      availableQuantity?: boolean;
    }
  >;
};

function createVariantClientKey() {
  return `variant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyVariant(): ProductVariant {
  const clientKey = createVariantClientKey();

  return {
    id: null,
    clientKey,
    groupKey: clientKey,
    size: "",
    sizeId: "",
    colorId: "",
    color: "",
    colorHex: null,
    price: 0,
    availableQuantity: null,
    sku: "",
    sellerArticle: "",
    stockTrackingEnabled: true,
  };
}

function mapProductVariants(productData: SellerProduct): ProductVariant[] {
  return Array.isArray(productData.variants) && productData.variants.length
    ? productData.variants.map((variant) => ({
        id: variant.id,
        clientKey: variant.id ? `saved-${variant.id}` : createVariantClientKey(),
        colorwayId: variant.colorwayId ?? null,
        sizeId: variant.sizeId ?? "",
        size: variant.size ?? "",
        colorId: variant.colorId ?? "",
        color: variant.color ?? "",
        colorHex: variant.colorHex ?? null,
        price: Number(variant.price ?? 0),
        availableQuantity: variant.availableQuantity,
        sku: variant.sku ?? "",
        sellerArticle: variant.sellerArticle ?? "",
        stockTrackingEnabled: true,
      }))
    : [createEmptyVariant()];
}

function getInitialTitle(product: SellerProduct) {
  const title = product.title?.trim() ?? "";

  if (product.status === "DRAFT" && (title === "" || title === "Новый товар")) {
    return "";
  }

  return product.title ?? "";
}

export function ProductEditPageClient({
  productId,
  initialStoreName,
  initialProduct,
  initialCategories,
  initialBrands,
}: Props) {
  const [dirty, setDirty] = useState(false);
  const [moderationChangesPending, setModerationChangesPending] = useState(false);

  const [product, setProduct] = useState<SellerProduct | null>(initialProduct);
  const [categories, setCategories] = useState<Option[]>(initialCategories);
  const [brands] = useState<Option[]>(initialBrands);

  const [title, setTitle] = useState(() => getInitialTitle(initialProduct));
  const [description, setDescription] = useState(initialProduct.description ?? "");
  const [composition, setComposition] = useState(initialProduct.composition ?? "");
  const [categoryId, setCategoryId] = useState<number | "">(
    initialProduct.categoryId ?? ""
  );
  const [suggestedCategoryName, setSuggestedCategoryName] = useState(
    initialProduct.suggestedCategoryName ?? ""
  );
  const [brandId] = useState<number | "">(
    initialProduct.brandId ?? initialBrands[0]?.id ?? ""
  );
  const [audience, setAudience] = useState<Audience>(
    initialProduct.audience ?? "UNISEX"
  );

  const [packageWidthCm, setPackageWidthCm] = useState<number | "">(
    initialProduct.packageWidthCm ?? ""
  );
  const [packageHeightCm, setPackageHeightCm] = useState<number | "">(
    initialProduct.packageHeightCm ?? ""
  );
  const [packageLengthCm, setPackageLengthCm] = useState<number | "">(
    initialProduct.packageLengthCm ?? ""
  );
  const [packageWeightKg, setPackageWeightKg] = useState<number | "">(
    initialProduct.packageWeightKg ?? ""
  );

  const [variants, setVariants] = useState<ProductVariant[]>(() =>
    mapProductVariants(initialProduct)
  );
  const [images, setImages] = useState<ProductImageItem[]>(() =>
    Array.isArray(initialProduct.imageItems) ? initialProduct.imageItems : []
  );

  const [dragImageId, setDragImageId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSucceeded, setPublishSucceeded] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [onboardingStatus, setOnboardingStatus] =
    useState<SellerOnboardingStatus | null>(null);
  const [onboardingError, setOnboardingError] = useState(false);
  const [onboardingRetry, setOnboardingRetry] = useState(0);

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const pageContentRef = useRef<HTMLDivElement | null>(null);
  const editRevisionRef = useRef(0);

  const [uploadProgress, setUploadProgress] = useState({
      done: 0,
      total: 0,
    });

  useEffect(() => {
    let cancelled = false;

    setOnboardingError(false);

    void getSellerOnboardingStatus()
      .then((status) => {
        if (!cancelled) setOnboardingStatus(status);
      })
      .catch(() => {
        if (!cancelled) setOnboardingError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [onboardingRetry]);

  useEffect(() => {
    if (initialCategories.length > 0) return;

    let cancelled = false;

    void apiFetch(`${API_URL}/api/catalog/categories`)
      .then(async (response) => {
        if (!response.ok) return [];
        const data: unknown = await response.json();
        return Array.isArray(data) ? (data as Option[]) : [];
      })
      .then((nextCategories) => {
        if (!cancelled) setCategories(nextCategories);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [initialCategories.length]);

  useEffect(() => {
    if (!dirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);

  function markDirty(options: { moderation?: boolean } = {}) {
    editRevisionRef.current += 1;
    setDirty(true);

    if (options.moderation) {
      setModerationChangesPending(true);
    }
  }

  function clearValidationError(key: keyof ValidationErrors) {
    setValidationErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
  }

  function clearVariantValidationError(
    index: number,
    field: "sku" | "sizeId" | "colorId" | "price" | "availableQuantity"
  ) {
    setValidationErrors((current) => {
      if (!current.variants?.[index]) {
        return current;
      }

      const nextVariants = {
        ...current.variants,
        [index]: {
          ...current.variants[index],
          [field]: undefined,
        },
      };

      return {
        ...current,
        variants: nextVariants,
      };
    });
  }

  function scrollToFirstValidationError() {
    requestAnimationFrame(() => {
      const root = pageContentRef.current ?? document;
      const firstError = root.querySelector<HTMLElement>(
        `[data-validation-error="true"], .${styles.fieldInvalid}, .${styles.requiredEmpty}, .${styles.dropZoneInvalid}`
      );

      firstError?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function validateProduct() {
  const nextErrors: ValidationErrors = {};
  const messages: string[] = [];

  if (!title.trim()) {
    nextErrors.title = true;
    messages.push("Заполните название товара");
  }

  if (!description.trim()) {
    nextErrors.description = true;
    messages.push("Заполните описание");
  }

  if (categoryId === "" && !suggestedCategoryName.trim()) {
    nextErrors.categoryId = true;
  }

  if (brandId === "") {
    nextErrors.brandId = true;
    messages.push("Выберите бренд или производителя");
  }

  if (images.length === 0) {
    nextErrors.images = true;
    messages.push("Добавьте хотя бы одно фото");
  }

  if (!packageWidthCm) nextErrors.packageWidthCm = true;
  if (!packageHeightCm) nextErrors.packageHeightCm = true;
  if (!packageLengthCm) nextErrors.packageLengthCm = true;
  if (!packageWeightKg) nextErrors.packageWeightKg = true;

  if (!packageWidthCm || !packageHeightCm || !packageLengthCm || !packageWeightKg) {
    messages.push("Заполните вес и габариты с упаковкой");
  }

  if (variants.length === 0) {
    messages.push("Добавьте хотя бы один вариант товара");
  }

  const variantErrors: ValidationErrors["variants"] = {};
  const sizeKeysByGroup = new Map<string, Map<string, number>>();
  const colorKeysByGroup = new Map<string, number>();
  const checkedColorGroups = new Set<string>();

  variants.forEach((variant, index) => {
    const current: NonNullable<ValidationErrors["variants"]>[number] = {};
    if (variant.price <= 0) current.price = true;

    const groupKey =
      variant.groupKey ||
      (variant.colorwayId
        ? `colorway-${variant.colorwayId}`
        : variant.colorId
          ? `color-${variant.colorId}`
          : variant.color.trim()
            ? `color-name-${variant.color.trim().toLowerCase()}`
            : "no-color");
    const colorKey = variant.colorId
      ? `id-${variant.colorId}`
      : variant.color.trim()
        ? `name-${variant.color.trim().toLowerCase()}`
        : "no-color";

    if (!checkedColorGroups.has(groupKey)) {
      const duplicateColorIndex = colorKeysByGroup.get(colorKey);

      if (duplicateColorIndex !== undefined) {
        current.colorId = true;
        variantErrors[duplicateColorIndex] = {
          ...variantErrors[duplicateColorIndex],
          colorId: true,
        };
      } else {
        colorKeysByGroup.set(colorKey, index);
      }

      checkedColorGroups.add(groupKey);
    }

    const sizeKey = variant.sizeId
      ? `id-${variant.sizeId}`
      : variant.size.trim()
        ? `name-${variant.size.trim().toLowerCase()}`
        : "no-size";
    const groupSizeKeys = sizeKeysByGroup.get(groupKey) ?? new Map<string, number>();
    const duplicateIndex = groupSizeKeys.get(sizeKey);

    if (duplicateIndex !== undefined) {
      current.sizeId = true;
      variantErrors[duplicateIndex] = {
        ...variantErrors[duplicateIndex],
        sizeId: true,
      };
    } else {
      groupSizeKeys.set(sizeKey, index);
      sizeKeysByGroup.set(groupKey, groupSizeKeys);
    }

    if (variant.availableQuantity !== null && variant.availableQuantity < 0) {
      current.availableQuantity = true;
    }

    if (Object.keys(current).length > 0) {
      variantErrors[index] = current;
    }
  });

  if (Object.keys(variantErrors).length > 0) {
    nextErrors.variants = variantErrors;
    messages.push("Проверьте варианты товара: вариант, размер, цену и остатки");
  }

  setValidationErrors(nextErrors);

  return {
    valid: messages.length === 0,
    message: messages[0] ?? null,
    messages,
  };
  }

  async function saveProduct() {
    if (saving || !dirty) return;

    const validation = validateProduct();

    if (!validation.valid) {
      scrollToFirstValidationError();
      return failValidation(validation.message ?? "Заполните обязательные поля");
    }

    if (!variants.length) {
      return failValidation("Добавьте хотя бы один размер");
    }

    for (const variant of variants) {
      if (variant.price <= 0) return failValidation("Цена варианта должна быть больше 0");

      if (variant.availableQuantity !== null && variant.availableQuantity < 0) {
        return failValidation("Количество не может быть меньше 0");
      }
    }

    setSaveSucceeded(false);
    setSaving(true);
    const saveRevision = editRevisionRef.current;

    try {
      const variantsToSave = await resolveVariantsForSave();
      if (editRevisionRef.current !== saveRevision) return;

      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          composition: composition.trim(),
          categoryId: categoryId ? Number(categoryId) : null,
          suggestedCategoryName: suggestedCategoryName.trim() || null,
          brandId: Number(brandId),
          audience,
          packageWidthCm: numberOrNull(packageWidthCm),
          packageHeightCm: numberOrNull(packageHeightCm),
          packageLengthCm: numberOrNull(packageLengthCm),
          packageWeightKg: numberOrNull(packageWeightKg),
          variants: variantsToSave.map((variant) => ({
            id: variant.id,
            colorwayId: variant.colorwayId ?? null,
            sizeId: variant.sizeId ? Number(variant.sizeId) : null,
            suggestedSizeName: variant.sizeId ? null : variant.size.trim() || null,
            colorId: variant.colorId ? Number(variant.colorId) : null,
            suggestedColorName: variant.colorId ? null : variant.color.trim() || null,
            price: Number(variant.price),
            stockQuantity: variant.availableQuantity,
            sku: variant.sku.trim() || null,
            sellerArticle: variant.sellerArticle?.trim() || null,
            stockTrackingEnabled: variant.availableQuantity !== null,
          })),
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка сохранения (${response.status})`);
      }

      const stateReloaded = await reloadProductState(saveRevision);
      if (stateReloaded && editRevisionRef.current === saveRevision) {
        setDirty(false);
        setSaveSucceeded(true);
        window.setTimeout(() => setSaveSucceeded(false), 1200);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить товар");
    } finally {
      setSaving(false);
    }
  }

  async function resolveVariantsForSave() {
    if (variants.every((variant) => variant.id !== null)) {
      return variants;
    }

    const response = await apiFetch(`${API_URL}/api/seller/products/${productId}`);

    if (!response.ok) {
      return variants;
    }

    const productData: SellerProduct = await response.json();
    const savedVariantsBySku = new Map(
      mapProductVariants(productData)
        .filter((variant) => variant.id !== null && variant.sku.trim())
        .map((variant) => [variant.sku.trim(), variant])
    );

    const resolvedVariants = variants.map((variant) => {
      if (variant.id !== null) {
        return variant;
      }

      const savedVariant = savedVariantsBySku.get(variant.sku.trim());

      return savedVariant ? { ...variant, id: savedVariant.id } : variant;
    });

    setVariants(resolvedVariants);

    return resolvedVariants;
  }

  async function reloadProductState(expectedRevision?: number) {
    const response = await apiFetch(`${API_URL}/api/seller/products/${productId}`);

    if (!response.ok) return false;

    const productData: SellerProduct = await response.json();
    if (
      expectedRevision !== undefined &&
      editRevisionRef.current !== expectedRevision
    ) {
      return false;
    }

    setProduct(productData);
    setVariants(mapProductVariants(productData));
    setImages(Array.isArray(productData.imageItems) ? productData.imageItems : []);
    return true;
  }

  async function uploadImages(filesToUpload = selectedFiles, colorwayId?: number | null) {
    if (!filesToUpload.length || uploading) return;

    setUploading(true);
    setUploadProgress({ done: 0, total: filesToUpload.length });

    try {
      const formData = new FormData();
      filesToUpload.forEach((file) => formData.append("files", file));
      if (colorwayId) {
        formData.append("colorwayId", String(colorwayId));
      }

      const response = await apiFetch(
        `${API_URL}/api/seller/products/${productId}/images/batch`,
        { method: "POST", body: formData }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось загрузить фотографии");
      }

      setUploadProgress({
        done: filesToUpload.length,
        total: filesToUpload.length,
      });

      setSelectedFiles([]);
      toast.success("Фото загружены");
      await reloadProductImages();
      clearValidationError("images");
      setModerationChangesPending(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
      setUploadProgress({ done: 0, total: 0 });
    }
  }

  async function reloadProductImages() {
    const response = await apiFetch(`${API_URL}/api/seller/products/${productId}`);

    if (!response.ok) return;

    const data: SellerProduct = await response.json();
    setImages(Array.isArray(data.imageItems) ? data.imageItems : []);
  }

  async function deleteImage(imageId: number) {
    const previous = images;

    setImages((current) => current.filter((image) => image.id !== imageId));
    try {
      const response = await apiFetch(
        `${API_URL}/api/seller/products/${productId}/images/${imageId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка удаления (${response.status})`);
      }

      toast.success("Фото удалено");
      await reloadProductImages();
      setModerationChangesPending(true);
    } catch (e) {
      setImages(previous);
      toast.error(e instanceof Error ? e.message : "Не удалось удалить фото");
    }
  }

  async function saveImageOrder(nextImages: ProductImageItem[]) {
    if (nextImages.length === 0) return;

    setReordering(true);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}/images/reorder`, {
        method: "POST",
        body: JSON.stringify({
          imageIds: nextImages.map((image) => image.id),
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка сортировки (${response.status})`);
      }

    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить порядок фото");
      await reloadProductImages();
    } finally {
      setReordering(false);
    }
  }

  function moveImage(targetImageId: number) {
    if (dragImageId === null || dragImageId === targetImageId) return;

    const fromIndex = images.findIndex((image) => image.id === dragImageId);
    const toIndex = images.findIndex((image) => image.id === targetImageId);

    if (fromIndex < 0 || toIndex < 0) return;

    moveImageByIndex(fromIndex, toIndex);
  }

  function moveImageByIndex(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= images.length || toIndex >= images.length) return;
    if (fromIndex === toIndex) return;

    const nextImages = [...images];
    const [moved] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, moved);

    setImages(nextImages);
    setModerationChangesPending(true);
    void saveImageOrder(nextImages);
  }

  async function publishProduct() {
    if (publishing) return;

    if (dirty) {
      toast.error("Сначала сохрани изменения");
      return;
    }

    if (!isSellerReadyForPublish()) {
      toast.error(
        onboardingError
          ? "Не удалось проверить готовность магазина"
          : onboardingStatus === null
            ? "Проверяем готовность магазина"
            : "Заполните реквизиты и примите оферту продавца"
      );
      return;
    }

    setPublishSucceeded(false);
    setPublishing(true);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}/publish`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка публикации (${response.status})`);
      }

      setProduct((current) =>
        current
          ? {
              ...current,
              status: "MODERATION",
              moderationComment: null,
            }
          : current
      );
      setModerationChangesPending(false);
      setPublishSucceeded(true);
      window.setTimeout(() => setPublishSucceeded(false), 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось опубликовать товар");
    } finally {
      setPublishing(false);
    }
  }

  function isSellerReadyForPublish() {
    return (
      onboardingStatus !== null &&
      onboardingStatus.legalCompleted &&
      onboardingStatus.agreementAccepted
    );
  }

  function updateVariant(index: number, patch: Partial<ProductVariant>) {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant
      )
    );

    if (patch.sku !== undefined) {
      clearVariantValidationError(index, "sku");
    }

    if (patch.sizeId !== undefined) {
      clearVariantValidationError(index, "sizeId");
    }

    if (patch.colorId !== undefined) {
      clearVariantValidationError(index, "colorId");
    }

    if (patch.price !== undefined) {
      clearVariantValidationError(index, "price");
    }

    if (patch.availableQuantity !== undefined) {
      clearVariantValidationError(index, "availableQuantity");
    }

    const operationalOnly = Object.keys(patch).every((key) =>
      ["price", "availableQuantity", "stockTrackingEnabled", "sellerArticle"].includes(key)
    );

    markDirty({ moderation: !operationalOnly });
  }

  function addVariant(base: Partial<ProductVariant> = {}) {
    const variant = {
      ...createEmptyVariant(),
      ...base,
    };

    setVariants((current) => [
      ...current,
      variant,
    ]);

    markDirty({ moderation: true });
  }

  function removeVariant(index: number) {
    setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index));
    markDirty({ moderation: true });
  }

  async function archiveProduct() {
    if (archiving || product?.status === "ARCHIVED") return;

    if (dirty) {
      const confirmed = window.confirm(
        "Есть несохраненные изменения. Переместить товар в архив без сохранения правок?"
      );

      if (!confirmed) return;
    }

    setArchiving(true);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}/archive`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка архивации (${response.status})`);
      }

      setProduct((current) =>
        current
          ? {
              ...current,
              status: "ARCHIVED",
            }
          : current
      );
      toast.success("Товар перемещён в архив");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось переместить товар в архив");
    } finally {
      setArchiving(false);
    }
  }

  async function moveProductToDraft() {
    if (archiving || product?.status === "DRAFT") return;
    setArchiving(true);
    try {
      const response = await apiFetch(
        `${API_URL}/api/seller/products/${productId}/draft`,
        { method: "POST" }
      );
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка изменения статуса (${response.status})`);
      }
      setProduct((current) =>
        current ? { ...current, status: "DRAFT" } : current
      );
      toast.success("Товар возвращён в черновики");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось изменить статус"
      );
    } finally {
      setArchiving(false);
    }
  }

  function failValidation(message: string) {
    void message;
  }

  const activeProductWithoutModerationChanges =
    product?.status === "ACTIVE" && !moderationChangesPending;
  const canPublish =
    isSellerReadyForPublish() && !activeProductWithoutModerationChanges;
  const onboardingRequirementsPending =
    onboardingStatus !== null &&
    (!onboardingStatus.legalCompleted || !onboardingStatus.agreementAccepted);
  const onboardingStatusPending = onboardingStatus === null;

  const publishBlockedReason =
    onboardingError
      ? "Не удалось проверить готовность магазина"
      : onboardingStatusPending
        ? "Проверяем готовность магазина"
        : onboardingRequirementsPending
      ? "Заполните реквизиты и примите оферту продавца"
      : activeProductWithoutModerationChanges
        ? "Для цены, остатков и артикула продавца модерация не нужна"
      : undefined;
  const storeName =
    initialStoreName ||
    brands[0]?.name?.trim() ||
    product?.brand?.trim() ||
    null;

  return (
    <div className="pageContainer">
      <div className={styles.sellerLayout}>
        <SellerSidebar
          currentTab="products"
          storeName={storeName}
          storeNotReady={!isSellerReadyForPublish()}
        />

        <div className={styles.editorContent}>
      <div className={styles.page}>
        <div className={styles.pageContent} ref={pageContentRef}>
          <nav className={`${styles.breadcrumbs} textCaption`} aria-label="Навигация">
            <Link href="/seller">Кабинет продавца</Link>
            <span>/</span>
            <Link href="/seller?tab=products">Товары</Link>
            <span>/</span>
            <span>Редактирование товара</span>
          </nav>
        {onboardingError ? (
          <div className={styles.onboardingWarning}>
            <strong>Не удалось проверить готовность магазина</strong>
            <p>Повторите проверку перед отправкой товара на модерацию.</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOnboardingStatus(null);
                setOnboardingRetry((current) => current + 1);
              }}
            >
              Повторить
            </Button>
          </div>
        ) : onboardingRequirementsPending ? (
          <div className={styles.onboardingWarning}>
            <strong>Магазин не готов к публикации</strong>
            <p>
              Заполните юридические данные и примите оферту продавца, чтобы отправлять
              товары на модерацию.
            </p>
            <a href="/seller?tab=legal">Перейти к реквизитам</a>
          </div>
        ) : null}

        {product?.status === "NEEDS_REVISION" && product.moderationComment ? (
          <div className={styles.revisionBox}>
            <strong>Товар вернули на доработку</strong>
            <p>{product.moderationComment}</p>
          </div>
        ) : null}

        <div className={styles.layout}>
          <main className={styles.main}>
            <ProductGeneralCard
              validationErrors={validationErrors}
              title={title}
              description={description}
              composition={composition}
              categoryId={categoryId}
              suggestedCategoryName={suggestedCategoryName}
            audience={audience}
            status={
              product && product.title?.trim() !== "Новый товар"
                ? product.status
                : null
            }
            statusChanging={archiving}
              categories={categories}
              onTitleChange={(value) => {
                setTitle(value);
                clearValidationError("title");
                markDirty({ moderation: true });
              }}
              onDescriptionChange={(value) => {
                setDescription(value);
                clearValidationError("description");
                markDirty({ moderation: true });
              }}
              onCompositionChange={(value) => {
                setComposition(value);
                markDirty({ moderation: true });
              }}
              onCategoryIdChange={(value) => {
                setCategoryId(value);
                if (value) {
                  setSuggestedCategoryName("");
                }
                clearValidationError("categoryId");
                markDirty({ moderation: true });
              }}
              onSuggestedCategoryNameChange={(value) => {
                setSuggestedCategoryName(value);
                if (value.trim()) {
                  setCategoryId("");
                }
                clearValidationError("categoryId");
                markDirty({ moderation: true });
              }}
            onAudienceChange={(value) => {
                setAudience(value);
                markDirty({ moderation: true });
              }}
            onStatusChange={(value) => {
              if (value === "ARCHIVED") {
                void archiveProduct();
              } else {
                void moveProductToDraft();
              }
            }}
            />

            <ProductVariantsCard
            variants={variants}
            invalidImages={validationErrors.images}
            uploadProgress={uploadProgress}
            images={images}
            uploading={uploading}
            reordering={reordering}
            dragImageId={dragImageId}
            validationErrors={validationErrors.variants ?? {}}
            onUpdateVariant={updateVariant}
            onAddVariant={addVariant}
            onRemoveVariant={removeVariant}
            onFilesChange={setSelectedFiles}
            onUploadImages={(files, colorwayId) => void uploadImages(files, colorwayId)}
            onDragImageStart={setDragImageId}
            onDragImageEnd={() => setDragImageId(null)}
            onMoveImage={(imageId) => moveImage(imageId)}
            onDeleteImage={(imageId) => void deleteImage(imageId)}
            />

            <ProductShippingCard
            validationErrors={validationErrors}
            packageWidthCm={packageWidthCm}
            packageHeightCm={packageHeightCm}
            packageLengthCm={packageLengthCm}
            packageWeightKg={packageWeightKg}
            onPackageWidthCmChange={(value) => {
                setPackageWidthCm(value);
                clearValidationError("packageWidthCm");
                markDirty({ moderation: true });
            }}
            onPackageHeightCmChange={(value) => {
                setPackageHeightCm(value);
                clearValidationError("packageHeightCm");
                markDirty({ moderation: true });
            }}
            onPackageLengthCmChange={(value) => {
                setPackageLengthCm(value);
                clearValidationError("packageLengthCm");
                markDirty({ moderation: true });
            }}
            onPackageWeightKgChange={(value) => {
                setPackageWeightKg(value);
                clearValidationError("packageWeightKg");
                markDirty({ moderation: true });
            }}
            />

            <div className={styles.formActions}>
              <Button
                type="button"
                onClick={() => void saveProduct()}
                disabled={saving || saveSucceeded || !dirty}
                loading={saving}
                success={saveSucceeded}
                variant="primary"
                className={`${styles.primaryBtn} buttonPrimary textButton`}
              >
                Сохранить
              </Button>

              <Button
                type="button"
                onClick={() => void publishProduct()}
                disabled={publishing || publishSucceeded || dirty || !canPublish}
                loading={publishing}
                success={publishSucceeded}
                variant="primary"
                className={`${styles.primaryBtn} buttonPrimary textButton`}
                title={
                  dirty
                    ? "Сначала сохраните изменения"
                    : !canPublish
                      ? publishBlockedReason
                      : undefined
                }
              >
                Отправить на публикацию
              </Button>

            </div>
          </main>

            <ProductPreviewAside
            title={title}
            brandId={brandId}
            brands={brands}
            product={product}
            images={images}
            />
            </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
