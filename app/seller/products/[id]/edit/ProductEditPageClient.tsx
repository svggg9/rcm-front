"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, API_URL } from "../../../../lib/api";

import { ProductGeneralCard } from "./components/ProductGeneralCard";
import { ProductVariantsCard } from "./components/ProductVariantsCard";
import { ProductShippingCard } from "./components/ProductShippingCard";
import { ProductPreviewAside } from "./components/ProductPreviewAside";
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

type SellerOnboardingStatus = {
  progress: number;
  legalCompleted: boolean;
  agreementAccepted: boolean;
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
    stockTrackingEnabled: false,
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
        stockTrackingEnabled: variant.stockTrackingEnabled !== false,
      }))
    : [createEmptyVariant()];
}

export function ProductEditPageClient({ productId }: Props) {
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [product, setProduct] = useState<SellerProduct | null>(null);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [composition, setComposition] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [suggestedCategoryName, setSuggestedCategoryName] = useState("");
  const [brandId, setBrandId] = useState<number | "">("");
  const [audience, setAudience] = useState<Audience>("UNISEX");
  const [sizes, setSizes] = useState<Option[]>([]);

  const [packageWidthCm, setPackageWidthCm] = useState<number | "">("");
  const [packageHeightCm, setPackageHeightCm] = useState<number | "">("");
  const [packageLengthCm, setPackageLengthCm] = useState<number | "">("");
  const [packageWeightKg, setPackageWeightKg] = useState<number | "">("");

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<ProductImageItem[]>([]);

  const [dragImageId, setDragImageId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [onboardingStatus, setOnboardingStatus] =
    useState<SellerOnboardingStatus | null>(null);

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const pageContentRef = useRef<HTMLDivElement | null>(null);

  const [uploadProgress, setUploadProgress] = useState({
      done: 0,
      total: 0,
    });

  const cardScore = useMemo(() => {
    let score = 0;

    if (title.trim()) score += 15;
    if (description.trim().length >= 80) score += 20;
    if (categoryId || suggestedCategoryName.trim()) score += 10;
    if (brandId) score += 10;
    if (images.length > 0) score += 20;
    if (variants.length > 0) score += 15;
    if (packageWidthCm && packageHeightCm && packageLengthCm && packageWeightKg) {
      score += 10;
    }

    return Math.min(score, 100);
  }, [
    title,
    description,
    categoryId,
    suggestedCategoryName,
    brandId,
    images.length,
    variants.length,
    packageWidthCm,
    packageHeightCm,
    packageLengthCm,
    packageWeightKg,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [
          productResponse,
          categoriesResponse,
          brandsResponse,
          sizesResponse,
          onboardingResponse,
        ] = await Promise.all([
          apiFetch(`${API_URL}/api/seller/products/${productId}`),
          apiFetch(`${API_URL}/api/catalog/categories`),
          apiFetch(`${API_URL}/api/seller/brands`),
          apiFetch(`${API_URL}/api/sizes`),
          apiFetch(`${API_URL}/api/seller/onboarding-status`),
        ]);

        if (!productResponse.ok) {
          const text = await productResponse.text().catch(() => "");
          throw new Error(text || `Ошибка загрузки товара (${productResponse.status})`);
        }

        if (!categoriesResponse.ok) {
          throw new Error("Не удалось загрузить категории");
        }

        if (!brandsResponse.ok) {
          throw new Error("Не удалось загрузить бренды");
        }

        if (!sizesResponse.ok) {
          throw new Error("Не удалось загрузить размеры");
        }

        const productData: SellerProduct = await productResponse.json();
        const categoriesData: Option[] = await categoriesResponse.json();
        const brandsData: Option[] = await brandsResponse.json();
        const sizesData: Option[] = await sizesResponse.json();
        const onboardingData: SellerOnboardingStatus | null = onboardingResponse.ok
          ? await onboardingResponse.json()
          : null;

        if (cancelled) return;

        const safeCategories = Array.isArray(categoriesData) ? categoriesData : [];
        const safeBrands = Array.isArray(brandsData) ? brandsData : [];
        const safeSizes = Array.isArray(sizesData) ? sizesData : [];

        setSizes(safeSizes);

        setProduct(productData);
        setOnboardingStatus(onboardingData);
        setCategories(safeCategories);
        setBrands(safeBrands);

        const nextBrandId =
          productData.brandId ?? safeBrands[0]?.id ?? "";

        setBrandId(nextBrandId);

        setTitle(
          productData.status === "DRAFT" && productData.title?.trim() === "Новый товар"
            ? ""
            : productData.title ?? ""
        );
        setDescription(productData.description ?? "");
        setComposition(productData.composition ?? "");
        setCategoryId(productData.categoryId ?? "");
        setSuggestedCategoryName(productData.suggestedCategoryName ?? "");
        setAudience(productData.audience ?? "UNISEX");

        setPackageWidthCm(productData.packageWidthCm ?? "");
        setPackageHeightCm(productData.packageHeightCm ?? "");
        setPackageLengthCm(productData.packageLengthCm ?? "");
        setPackageWeightKg(productData.packageWeightKg ?? "");

        setVariants(mapProductVariants(productData));

        setImages(Array.isArray(productData.imageItems) ? productData.imageItems : []);
        setInitialized(true);
        setDirty(false);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Не удалось загрузить товар");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [productId]);

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

  function markDirty() {
    if (!initialized) return;
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

    if (
      variant.stockTrackingEnabled &&
      (variant.availableQuantity === null || variant.availableQuantity < 0)
    ) {
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

    for (const variant of variants) {
      if (variant.price <= 0) return failValidation("Цена варианта должна быть больше 0");

      if (
        variant.stockTrackingEnabled &&
        (variant.availableQuantity === null || variant.availableQuantity < 0)
      ) {
        return failValidation("Количество не может быть меньше 0");
      }
    }

    setSaving(true);

    try {
      const variantsToSave = await resolveVariantsForSave();

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
            stockQuantity: variant.stockTrackingEnabled
              ? Number(variant.availableQuantity ?? 0)
              : null,
            sku: variant.sku.trim() || null,
            sellerArticle: variant.sellerArticle?.trim() || null,
            stockTrackingEnabled: variant.stockTrackingEnabled,
          })),
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка сохранения (${response.status})`);
      }

      await reloadProductState();
      setDirty(false);
      toast.success("Товар сохранён");
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

  async function reloadProductState() {
    const response = await apiFetch(`${API_URL}/api/seller/products/${productId}`);

    if (!response.ok) return;

    const productData: SellerProduct = await response.json();

    setProduct(productData);
    setVariants(mapProductVariants(productData));
    setImages(Array.isArray(productData.imageItems) ? productData.imageItems : []);
  }

  async function uploadImages(filesToUpload = selectedFiles, colorwayId?: number | null) {
    if (!filesToUpload.length || uploading) return;

    setUploading(true);
    setUploadProgress({ done: 0, total: filesToUpload.length });

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];

        const formData = new FormData();
        formData.append("file", file);
        if (colorwayId) {
          formData.append("colorwayId", String(colorwayId));
        }

        const response = await apiFetch(`${API_URL}/api/seller/products/${productId}/images`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || `Ошибка загрузки ${file.name}`);
        }

        setUploadProgress({
          done: i + 1,
          total: filesToUpload.length,
        });
      }

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
    void saveImageOrder(nextImages);
  }

  async function publishProduct() {
    if (publishing) return;

    if (dirty) {
      toast.error("Сначала сохрани изменения");
      return;
    }

    if (!isSellerReadyForPublish()) {
      toast.error("Заполните реквизиты и примите оферту продавца");
      return;
    }

    setPublishing(true);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}/publish`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка публикации (${response.status})`);
      }

      toast.success("Товар отправлен на модерацию");

      setProduct((current) =>
        current
          ? {
              ...current,
              status: "MODERATION",
              moderationComment: null,
            }
          : current
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось опубликовать товар");
    } finally {
      setPublishing(false);
    }
  }

  function isSellerReadyForPublish() {
    return onboardingStatus === null || onboardingStatus.progress === 100;
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

  if (loading) {
    return <ProductEditSkeleton />;
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

  async function deleteProduct() {
    if (deleting) return;

    const confirmed = window.confirm(
      dirty
        ? "Есть несохраненные изменения. Удалить товар без сохранения правок?"
        : "Удалить товар? Это действие нельзя будет быстро отменить."
    );
    if (!confirmed) return;

    setDeleting(true);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}/delete`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка удаления (${response.status})`);
      }

      toast.success("Товар удалён");
      router.push("/seller?tab=products");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить товар");
    } finally {
      setDeleting(false);
    }
  }

  function failValidation(message: string) {
    void message;
  }

  const canPublish = isSellerReadyForPublish();

  const publishBlockedReason =
    onboardingStatus && onboardingStatus.progress < 100
      ? "Заполните реквизиты и примите оферту продавца"
      : undefined;

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <nav className={styles.breadcrumbs} aria-label="Навигация">
          <a href="/seller">Кабинет продавца</a>
          <span>/</span>
          <a href="/seller?tab=products">Товары</a>
          <span>/</span>
          <span>{title || "Редактирование товара"}</span>
        </nav>

        <div className={styles.pageContent} ref={pageContentRef}>
        {onboardingStatus && onboardingStatus.progress < 100 ? (
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
            sizes={sizes}
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

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => void saveProduct()}
                disabled={saving || !dirty}
                className={styles.primaryBtn}
              >
                {!dirty && !saving ? "Сохранено" : "Сохранить"}
              </button>

              <button
                type="button"
                onClick={() => void publishProduct()}
                disabled={publishing || !canPublish}
                className={styles.secondaryBtn}
                title={!canPublish ? publishBlockedReason : undefined}
              >
                {publishing ? "Отправляем..." : "Опубликовать"}
              </button>

              {product?.status !== "ARCHIVED" ? (
                <button
                  type="button"
                  onClick={() => void archiveProduct()}
                  disabled={archiving}
                  className={styles.archiveBtn}
                >
                  {archiving ? "Переносим..." : "В архив"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void deleteProduct()}
                disabled={deleting}
                className={styles.deleteProductBtn}
              >
                {deleting ? "Удаляем..." : "Удалить"}
              </button>
            </div>
          </main>

            <ProductPreviewAside
            productId={productId}
            title={title}
            brandId={brandId}
            brands={brands}
            product={product}
            images={images}
            cardScore={cardScore}
            descriptionLength={description.length}
            packageWeightKg={packageWeightKg}
            variantsCount={variants.length}
            />
            </div>
        </div>
      </div>
    </div>
  );
}

function ProductEditSkeleton() {
  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.skeletonBreadcrumbs}>
          <div />
          <div />
          <div />
        </div>

        <div className={styles.pageContent}>
          <div className={styles.layout}>
            <main className={styles.main}>
              <SkeletonSection rows={5} />
              <SkeletonSection rows={4} image />
              <SkeletonSection rows={4} />

              <div className={styles.skeletonActions}>
                <div />
                <div />
              </div>
            </main>

            <aside className={styles.aside}>
              <div className={styles.skeletonPreview}>
                <div className={styles.skeletonPreviewImage} />
                <div className={styles.skeletonPreviewLine} />
                <div className={styles.skeletonPreviewLineShort} />
                <div className={styles.skeletonPreviewButton} />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonSection({
  rows,
  image = false,
}: {
  rows: number;
  image?: boolean;
}) {
  return (
    <section className={styles.skeletonSection}>
      <div className={styles.skeletonSectionTitle} />
      {image ? <div className={styles.skeletonUpload} /> : null}
      <div className={styles.skeletonFields}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} />
        ))}
      </div>
    </section>
  );
}
