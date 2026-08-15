"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { apiFetch, API_URL } from "../../../../lib/api";
import { Button } from "../../../../components/ui/Button";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import {
  scrollToFirstValidationError as scrollToFirstValidationErrorShared,
} from "../../../../lib/formValidation";

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
import {
  formatProductStatus,
  getProductStatusTone,
  numberOrNull,
} from "./utils";

import styles from "./ProductEditPage.module.css";

const MODAL_FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

type Props = {
  productId: number;
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
  initialProduct,
  initialCategories,
  initialBrands,
}: Props) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);

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
  const [publishSuccessOpen, setPublishSuccessOpen] = useState(false);
  const [creatingNextProduct, setCreatingNextProduct] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mediaActionPending, setMediaActionPending] = useState(false);
  const [onboardingStatus, setOnboardingStatus] =
    useState<SellerOnboardingStatus | null>(null);
  const [onboardingError, setOnboardingError] = useState(false);
  const [onboardingRetry, setOnboardingRetry] = useState(0);

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const pageContentRef = useRef<HTMLDivElement | null>(null);
  const editRevisionRef = useRef(0);
  const publishSuccessDialogRef = useRef<HTMLDivElement | null>(null);
  const publishSuccessCloseRef = useRef<HTMLButtonElement | null>(null);
  const publishSuccessReturnFocusRef = useRef<HTMLElement | null>(null);
  const productPageMountedRef = useRef(true);
  const creatingNextProductRef = useRef(false);

  const [uploadProgress, setUploadProgress] = useState({
      done: 0,
      total: 0,
    });

  useEffect(() => {
    return () => {
      productPageMountedRef.current = false;
    };
  }, []);

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

  useEffect(() => {
    if (!publishSuccessOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const returnFocusTarget = publishSuccessReturnFocusRef.current;
    const pageContent = pageContentRef.current;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      publishSuccessCloseRef.current?.focus({ preventScroll: true });
    });

    function handleModalKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !creatingNextProductRef.current) {
        event.preventDefault();
        setPublishSuccessOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = publishSuccessDialogRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR)
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements.at(-1);

      if (!firstFocusable || !lastFocusable) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstFocusable || !dialog.contains(activeElement)) {
          event.preventDefault();
          lastFocusable.focus({ preventScroll: true });
        }
      } else if (
        activeElement === lastFocusable ||
        !dialog.contains(activeElement)
      ) {
        event.preventDefault();
        firstFocusable.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", handleModalKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleModalKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;

      window.requestAnimationFrame(() => {
        if (
          returnFocusTarget?.isConnected &&
          !returnFocusTarget.matches(':disabled, [aria-disabled="true"]')
        ) {
          returnFocusTarget.focus({ preventScroll: true });
          return;
        }

        if (pageContent?.isConnected) {
          pageContent.focus({ preventScroll: true });
        }
      });
    };
  }, [publishSuccessOpen]);

  function markDirty() {
    editRevisionRef.current += 1;
    setDirty(true);
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
    scrollToFirstValidationErrorShared({
      root: pageContentRef.current,
      selector: [
        '[aria-invalid="true"]',
        '[data-validation-error="true"]',
        `.${styles.fieldInvalid}`,
        `.${styles.dropZoneInvalid}`,
      ].join(", "),
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
    messages.push("Выберите категорию или предложите свою");
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
    valid: messages.length === 0 && Object.keys(nextErrors).length === 0,
    message: messages[0] ?? null,
    messages,
  };
  }

  async function saveProduct() {
    if (
      saving ||
      publishing ||
      archiving ||
      deleting ||
      uploading ||
      reordering ||
      !dirty
    ) return;

    if (!canEditProductOperations(product?.status)) {
      toast.error(getProductEditUnavailableReason(product?.status));
      return;
    }

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
    if (
      !filesToUpload.length ||
      !canEditProductContent(product?.status) ||
      uploading ||
      saving ||
      publishing ||
      archiving ||
      deleting ||
      reordering ||
      mediaActionPending
    ) return;

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
    if (
      !canEditProductContent(product?.status) ||
      saving ||
      publishing ||
      archiving ||
      deleting ||
      uploading ||
      reordering ||
      mediaActionPending
    ) return;

    const previous = images;

    setMediaActionPending(true);
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
    } catch (e) {
      setImages(previous);
      toast.error(e instanceof Error ? e.message : "Не удалось удалить фото");
    } finally {
      setMediaActionPending(false);
    }
  }

  async function saveImageOrder(nextImages: ProductImageItem[]) {
    if (
      nextImages.length === 0 ||
      !canEditProductContent(product?.status) ||
      saving ||
      publishing ||
      archiving ||
      deleting ||
      uploading ||
      reordering ||
      mediaActionPending
    ) return;

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
    if (!canEditProductContent(product?.status) || productMutationBusy) return;
    if (dragImageId === null || dragImageId === targetImageId) return;

    const fromIndex = images.findIndex((image) => image.id === dragImageId);
    const toIndex = images.findIndex((image) => image.id === targetImageId);

    if (fromIndex < 0 || toIndex < 0) return;

    moveImageByIndex(fromIndex, toIndex);
  }

  function moveImageByIndex(fromIndex: number, toIndex: number) {
    if (!canEditProductContent(product?.status) || productMutationBusy) return;
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= images.length || toIndex >= images.length) return;
    if (fromIndex === toIndex) return;

    const nextImages = [...images];
    const [moved] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, moved);

    setImages(nextImages);
    void saveImageOrder(nextImages);
  }

  async function publishProduct() {
    if (
      publishing ||
      saving ||
      uploading ||
      reordering ||
      archiving ||
      deleting
    ) return;

    if (!product || !isProductStatusPublishable(product.status)) {
      toast.info(getPublishUnavailableReason(product?.status));
      return;
    }

    if (dirty) {
      toast.error("Сначала сохрани изменения");
      return;
    }

    const validation = validateProduct();

    if (!validation.valid) {
      scrollToFirstValidationError();
      failValidation(validation.message ?? "Проверьте обязательные поля");
      return;
    }

    if (!isSellerReadyForPublish()) {
      if (onboardingError) {
        toast.error("Не удалось проверить готовность магазина", {
          action: {
            label: "Повторить",
            onClick: () => {
              setOnboardingStatus(null);
              setOnboardingRetry((current) => current + 1);
            },
          },
        });
      } else if (onboardingStatus === null) {
        toast.info("Проверяем готовность магазина. Попробуйте ещё раз через секунду");
      } else {
        toast.error("Сначала заполните реквизиты и примите оферту продавца", {
          action: {
            label: "Заполнить",
            onClick: () => router.push("/seller?tab=legal"),
          },
        });
      }

      return;
    }

    publishSuccessReturnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
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
      setPublishSucceeded(true);
      setPublishSuccessOpen(true);
      toast.success("Товар отправлен на модерацию");
      window.setTimeout(() => setPublishSucceeded(false), 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось опубликовать товар");
    } finally {
      setPublishing(false);
    }
  }

  async function createNextProductDraft() {
    if (creatingNextProduct) return;

    creatingNextProductRef.current = true;
    setCreatingNextProduct(true);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/draft`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось создать товар");
      }

      const nextProductId: number = await response.json();
      if (!productPageMountedRef.current) return;
      router.push(`/seller/products/${nextProductId}/edit`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось создать товар"
      );
    } finally {
      creatingNextProductRef.current = false;
      if (productPageMountedRef.current) {
        setCreatingNextProduct(false);
      }
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

    markDirty();
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

    markDirty();
  }

  function removeVariant(index: number) {
    setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index));
    markDirty();
  }

  async function archiveProduct() {
    if (
      archiving ||
      publishing ||
      deleting ||
      saving ||
      uploading ||
      reordering ||
      product?.status === "ARCHIVED" ||
      product?.status === "BLOCKED"
    ) return;

    if (dirty) {
      toast.error("Сначала сохраните изменения, затем перенесите товар в архив");
      return;
    }

    const confirmed = window.confirm(
      product?.status === "ACTIVE"
        ? "Снять товар с витрины? Он исчезнет из каталога и останется доступен в архиве."
        : "Перенести товар в архив? Данные сохранятся, товар можно будет вернуть в черновики."
    );

    if (!confirmed) return;

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
    if (
      archiving ||
      publishing ||
      deleting ||
      saving ||
      uploading ||
      reordering ||
      product?.status === "DRAFT" ||
      product?.status === "BLOCKED"
    ) return;
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

  async function deleteProduct() {
    if (
      deleting ||
      publishing ||
      archiving ||
      saving ||
      uploading ||
      reordering ||
      !product ||
      !canDeleteProduct(product.status)
    ) return;

    const confirmed = window.confirm(
      "Удалить товар? Он исчезнет из кабинета, восстановить его через интерфейс не получится."
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const response = await apiFetch(
        `${API_URL}/api/seller/products/${productId}/delete`,
        { method: "POST" }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка удаления (${response.status})`);
      }

      toast.success("Товар удалён");
      router.push("/seller?tab=products");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось удалить товар"
      );
      setDeleting(false);
    }
  }

  function failValidation(message: string) {
    toast.error(message);
  }

  const canPublish = Boolean(product && isProductStatusPublishable(product.status));
  const productMutationBusy =
    saving ||
    uploading ||
    reordering ||
    publishing ||
    archiving ||
    deleting ||
    mediaActionPending;
  const contentEditingAllowed = canEditProductContent(product?.status);
  const operationalEditingAllowed = canEditProductOperations(product?.status);
  const contentControlsDisabled = productMutationBusy || !contentEditingAllowed;
  const operationalControlsDisabled =
    productMutationBusy || !operationalEditingAllowed;
  const mediaDisabledHint = getMediaDisabledHint(
    product?.status,
    productMutationBusy
  );
  const onboardingRequirementsPending =
    onboardingStatus !== null &&
    (!onboardingStatus.legalCompleted || !onboardingStatus.agreementAccepted);
  const onboardingStatusPending = onboardingStatus === null;

  const publishBlockedReason = !canPublish
    ? getPublishUnavailableReason(product?.status)
    : onboardingError
      ? "Не удалось проверить готовность магазина"
      : onboardingStatusPending
        ? "Проверяем готовность магазина"
        : onboardingRequirementsPending
          ? "Заполните реквизиты и примите оферту продавца"
          : undefined;
  return (
    <div className="pageContainer">
      <div className={styles.sellerLayout}>
        <SellerSidebar
          currentTab="products"
        />

        <div className={styles.editorContent}>
      <div className={styles.page}>
        <div className={styles.pageContent} ref={pageContentRef} tabIndex={-1}>
          <nav className={`${styles.breadcrumbs} textCaption`} aria-label="Навигация">
            <Link href="/seller">Кабинет продавца</Link>
            <span>/</span>
            <Link href="/seller?tab=products">Товары</Link>
            <span>/</span>
            <span>Редактирование товара</span>
          </nav>

        {product ? (
          <section className={styles.productStatusBar} aria-label="Статус товара">
            <div className={styles.productStatusCopy}>
              <span className={styles.productStatusLabel}>Текущий статус</span>
              <div className={styles.productStatusTitle}>
                <StatusBadge
                  tone={getProductStatusTone(product.status)}
                  size="regular"
                >
                  {formatProductStatus(product.status)}
                </StatusBadge>
                <span>{getProductStatusDescription(product.status)}</span>
              </div>
            </div>

            {product.status !== "BLOCKED" ? (
            <div className={styles.productStatusActions}>
              {product.status === "ARCHIVED" ? (
                <Button
                  type="button"
                  variant="secondary"
                  loading={archiving}
                  disabled={productMutationBusy && !archiving}
                  onClick={() => void moveProductToDraft()}
                >
                  Вернуть в черновик
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  loading={archiving}
                  disabled={productMutationBusy && !archiving}
                  onClick={() => void archiveProduct()}
                >
                  {product.status === "ACTIVE"
                    ? "Снять с витрины"
                    : product.status === "MODERATION"
                      ? "Отозвать в архив"
                      : "Перенести в архив"}
                </Button>
              )}

              {canDeleteProduct(product.status) ? (
                <Button
                  type="button"
                  variant="danger"
                  loading={deleting}
                  disabled={productMutationBusy && !deleting}
                  onClick={() => void deleteProduct()}
                >
                  Удалить товар
                </Button>
              ) : null}
            </div>
            ) : null}
          </section>
        ) : null}

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
            <fieldset
              className={styles.lockedFieldset}
              disabled={contentControlsDisabled}
            >
              <ProductGeneralCard
                validationErrors={validationErrors}
                title={title}
                description={description}
                composition={composition}
                categoryId={categoryId}
                suggestedCategoryName={suggestedCategoryName}
                audience={audience}
                categories={categories}
                onTitleChange={(value) => {
                  setTitle(value);
                  clearValidationError("title");
                  markDirty();
                }}
                onDescriptionChange={(value) => {
                  setDescription(value);
                  clearValidationError("description");
                  markDirty();
                }}
                onCompositionChange={(value) => {
                  setComposition(value);
                  markDirty();
                }}
                onCategoryIdChange={(value) => {
                  setCategoryId(value);
                  if (value) {
                    setSuggestedCategoryName("");
                  }
                  clearValidationError("categoryId");
                  markDirty();
                }}
                onSuggestedCategoryNameChange={(value) => {
                  setSuggestedCategoryName(value);
                  if (value.trim()) {
                    setCategoryId("");
                  }
                  clearValidationError("categoryId");
                  markDirty();
                }}
                onAudienceChange={(value) => {
                  setAudience(value);
                  markDirty();
                }}
              />
            </fieldset>

            <ProductVariantsCard
              variants={variants}
              invalidImages={validationErrors.images}
              uploadProgress={uploadProgress}
              images={images}
              uploading={uploading}
              reordering={reordering}
              mediaDisabled={productMutationBusy || !contentEditingAllowed}
              variantStructureDisabled={contentControlsDisabled}
              operationalDisabled={operationalControlsDisabled}
              mediaDisabledHint={mediaDisabledHint}
              dragImageId={dragImageId}
              validationErrors={validationErrors.variants ?? {}}
              onUpdateVariant={updateVariant}
              onAddVariant={addVariant}
              onRemoveVariant={removeVariant}
              onFilesChange={setSelectedFiles}
              onUploadImages={(files, colorwayId) =>
                void uploadImages(files, colorwayId)
              }
              onDragImageStart={setDragImageId}
              onDragImageEnd={() => setDragImageId(null)}
              onMoveImage={(imageId) => moveImage(imageId)}
              onDeleteImage={(imageId) => void deleteImage(imageId)}
            />

            <fieldset
              className={styles.lockedFieldset}
              disabled={contentControlsDisabled}
            >
              <ProductShippingCard
                validationErrors={validationErrors}
                packageWidthCm={packageWidthCm}
                packageHeightCm={packageHeightCm}
                packageLengthCm={packageLengthCm}
                packageWeightKg={packageWeightKg}
                onPackageWidthCmChange={(value) => {
                  setPackageWidthCm(value);
                  clearValidationError("packageWidthCm");
                  markDirty();
                }}
                onPackageHeightCmChange={(value) => {
                  setPackageHeightCm(value);
                  clearValidationError("packageHeightCm");
                  markDirty();
                }}
                onPackageLengthCmChange={(value) => {
                  setPackageLengthCm(value);
                  clearValidationError("packageLengthCm");
                  markDirty();
                }}
                onPackageWeightKgChange={(value) => {
                  setPackageWeightKg(value);
                  clearValidationError("packageWeightKg");
                  markDirty();
                }}
              />
            </fieldset>

            <div className={styles.formActions}>
              <Button
                type="button"
                onClick={() => void saveProduct()}
                disabled={
                  productMutationBusy ||
                  saveSucceeded ||
                  !dirty ||
                  !operationalEditingAllowed
                }
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
                disabled={productMutationBusy || publishSucceeded || dirty || !canPublish}
                loading={publishing}
                success={publishSucceeded}
                variant="primary"
                className={`${styles.primaryBtn} buttonPrimary textButton`}
                title={
                  dirty
                    ? "Сначала сохраните изменения"
                    : publishBlockedReason
                }
              >
                Отправить на публикацию
              </Button>

              {onboardingStatusPending ? (
                <div className={styles.publishRequirementHint} role="status">
                  Проверяем готовность магазина…
                </div>
              ) : onboardingRequirementsPending ? (
                <div className={styles.publishRequirementHint}>
                  Для публикации сначала заполните реквизиты и примите оферту.{" "}
                  <Link href="/seller?tab=legal">Перейти к реквизитам</Link>
                </div>
              ) : onboardingError ? (
                <div className={styles.publishRequirementHint}>
                  Не удалось проверить готовность магазина. Нажмите «Повторить» выше.
                </div>
              ) : null}

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

      {publishSuccessOpen ? (
        <div className="modalOverlay" role="presentation">
          <div
            ref={publishSuccessDialogRef}
            className={`modal ${styles.publishSuccessModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-publish-success-title"
            tabIndex={-1}
          >
            <div className="modalHeader">
              <div>
                <div className={styles.publishSuccessKicker}>Готово</div>
                <h2 className="modalTitle" id="product-publish-success-title">
                  Товар отправлен на модерацию
                </h2>
              </div>
              <button
                ref={publishSuccessCloseRef}
                type="button"
                className="modalClose"
                disabled={creatingNextProduct}
                onClick={() => setPublishSuccessOpen(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="modalBody">
              <p className={styles.publishSuccessText}>
                Карточка получила статус «На модерации». Пока мы её проверяем,
                можно добавить следующий товар.
              </p>
              <Link
                href={`/seller/products/${productId}/preview`}
                className={styles.publishPreviewLink}
                aria-disabled={creatingNextProduct || undefined}
                tabIndex={creatingNextProduct ? -1 : undefined}
                onClick={(event) => {
                  if (creatingNextProduct) event.preventDefault();
                }}
              >
                Открыть предпросмотр
              </Link>
            </div>

            <div className="modalFooter">
              <button
                type="button"
                className="buttonSecondary"
                disabled={creatingNextProduct}
                onClick={() => router.push("/seller?tab=products")}
              >
                К товарам
              </button>
              <Button
                type="button"
                variant="primary"
                loading={creatingNextProduct}
                onClick={() => void createNextProductDraft()}
              >
                Добавить ещё товар
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getProductStatusDescription(status: SellerProduct["status"]) {
  switch (status) {
    case "ACTIVE":
      return "Товар на витрине. Здесь можно менять цену, артикул и остатки; для правок карточки сначала снимите его с витрины.";
    case "MODERATION":
      return "Карточка проверяется и временно недоступна для редактирования.";
    case "NEEDS_REVISION":
      return "Исправьте замечания и отправьте карточку повторно.";
    case "ARCHIVED":
      return "Товар скрыт с витрины, его данные сохранены.";
    case "BLOCKED":
      return "Товар заблокирован администратором.";
    default:
      return "Черновик виден только вам.";
  }
}

function canDeleteProduct(status: SellerProduct["status"]) {
  return (
    status === "DRAFT" ||
    status === "NEEDS_REVISION" ||
    status === "ARCHIVED"
  );
}

function isProductStatusPublishable(status: SellerProduct["status"]) {
  return status === "DRAFT" || status === "NEEDS_REVISION";
}

function canEditProductContent(status?: SellerProduct["status"]) {
  return (
    status === "DRAFT" ||
    status === "NEEDS_REVISION" ||
    status === "ARCHIVED"
  );
}

function canEditProductOperations(status?: SellerProduct["status"]) {
  return canEditProductContent(status) || status === "ACTIVE";
}

function getProductEditUnavailableReason(status?: SellerProduct["status"]) {
  if (status === "MODERATION") {
    return "Товар на модерации. Чтобы изменить его, сначала отзовите карточку в архив";
  }

  if (status === "BLOCKED") {
    return "Товар заблокирован администратором и доступен только для просмотра";
  }

  return "Товар сейчас недоступен для редактирования";
}

function getMediaDisabledHint(
  status: SellerProduct["status"] | undefined,
  busy: boolean
) {
  if (status === "ACTIVE") {
    return "Чтобы изменить фото, сначала снимите товар с витрины.";
  }

  if (status === "MODERATION") {
    return "Фото нельзя менять во время модерации.";
  }

  if (status === "BLOCKED") {
    return "Фото заблокированного товара доступны только для просмотра.";
  }

  if (busy) {
    return "Дождитесь завершения текущего действия.";
  }

  return undefined;
}

function getPublishUnavailableReason(status?: SellerProduct["status"]) {
  switch (status) {
    case "MODERATION":
      return "Товар уже находится на модерации";
    case "ARCHIVED":
      return "Сначала верните товар в черновик";
    case "BLOCKED":
      return "Товар заблокирован администратором";
    case "ACTIVE":
      return "Активный товар уже опубликован. Для изменения карточки сначала снимите его с витрины";
    default:
      return "Товар сейчас нельзя отправить на публикацию";
  }
}
