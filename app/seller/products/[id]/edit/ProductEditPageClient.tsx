"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch, API_URL } from "../../../../lib/api";

import { ProductStickyHeader } from "./components/ProductStickyHeader";
import { ProductGeneralCard } from "./components/ProductGeneralCard";
import { ProductImagesCard } from "./components/ProductImagesCard";
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

function createEmptyVariant(): ProductVariant {
  return {
    id: null,
    size: "",
    sizeId: "",
    colorId: "",
    color: "",
    colorHex: null,
    price: 0,
    availableQuantity: null,
    sku: "",
    stockTrackingEnabled: false,
  };
}

function mapProductVariants(productData: SellerProduct): ProductVariant[] {
  return Array.isArray(productData.variants) && productData.variants.length
    ? productData.variants.map((variant) => ({
        id: variant.id,
        sizeId: variant.sizeId ?? "",
        size: variant.size ?? "",
        colorId: variant.colorId ?? "",
        color: variant.color ?? "",
        colorHex: variant.colorHex ?? null,
        price: Number(variant.price ?? 0),
        availableQuantity: variant.availableQuantity,
        sku: variant.sku ?? "",
        stockTrackingEnabled: variant.stockTrackingEnabled !== false,
      }))
    : [createEmptyVariant()];
}

export function ProductEditPageClient({ productId }: Props) {
  const [initialized, setInitialized] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const [product, setProduct] = useState<SellerProduct | null>(null);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [composition, setComposition] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [brandId, setBrandId] = useState<number | "">("");
  const [audience, setAudience] = useState<Audience>("UNISEX");
  const [sizes, setSizes] = useState<Option[]>([]);
  const [colors, setColors] = useState<Option[]>([]);

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
  const [onboardingStatus, setOnboardingStatus] =
    useState<SellerOnboardingStatus | null>(null);

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const [uploadProgress, setUploadProgress] = useState({
      done: 0,
      total: 0,
    });

  const cardScore = useMemo(() => {
    let score = 0;

    if (title.trim()) score += 15;
    if (description.trim().length >= 80) score += 20;
    if (categoryId) score += 10;
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
          colorsResponse,
          onboardingResponse,
        ] = await Promise.all([
          apiFetch(`${API_URL}/api/seller/products/${productId}`),
          apiFetch(`${API_URL}/api/catalog/categories`),
          apiFetch(`${API_URL}/api/seller/brands`),
          apiFetch(`${API_URL}/api/sizes`),
          apiFetch(`${API_URL}/api/colors`),
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

        if (!colorsResponse.ok) {
          throw new Error("Не удалось загрузить цвета");
        }

        const productData: SellerProduct = await productResponse.json();
        const categoriesData: Option[] = await categoriesResponse.json();
        const brandsData: Option[] = await brandsResponse.json();
        const sizesData: Option[] = await sizesResponse.json();
        const colorsData: Option[] = await colorsResponse.json();
        const onboardingData: SellerOnboardingStatus | null = onboardingResponse.ok
          ? await onboardingResponse.json()
          : null;

        if (cancelled) return;

        const safeCategories = Array.isArray(categoriesData) ? categoriesData : [];
        const safeBrands = Array.isArray(brandsData) ? brandsData : [];
        const safeSizes = Array.isArray(sizesData) ? sizesData : [];
        const safeColors = Array.isArray(colorsData) ? colorsData : [];

        setSizes(safeSizes);
        setColors(safeColors);

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
        setAudience(productData.audience ?? "UNISEX");

        setPackageWidthCm(productData.packageWidthCm ?? "");
        setPackageHeightCm(productData.packageHeightCm ?? "");
        setPackageLengthCm(productData.packageLengthCm ?? "");
        setPackageWeightKg(productData.packageWeightKg ?? "");

        setVariants(mapProductVariants(productData));

        setImages(Array.isArray(productData.imageItems) ? productData.imageItems : []);
        setInitialized(true);
        setDirty(false);
        setLastSavedAt(new Date());
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

  if (categoryId === "") {
    nextErrors.categoryId = true;
    messages.push("Выберите категорию");
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

  variants.forEach((variant, index) => {
    const current: NonNullable<ValidationErrors["variants"]>[number] = {};

    if (!variant.sku.trim()) current.sku = true;
    if (!variant.sizeId) current.sizeId = true;
    if (!variant.colorId) current.colorId = true;
    if (variant.price <= 0) current.price = true;

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
    messages.push("Проверьте варианты товара: SKU, размер, цвет, цену и остатки");
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
      return failValidation(validation.message ?? "Заполните обязательные поля");
    }

    for (const variant of variants) {
      if (!variant.sku.trim()) return failValidation("У каждого варианта должен быть SKU");
      if (!variant.sizeId) return failValidation("У каждого варианта должен быть размер");
      if (!variant.colorId) return failValidation("У каждого варианта должен быть цвет");
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
          categoryId: Number(categoryId),
          brandId: Number(brandId),
          audience,
          packageWidthCm: numberOrNull(packageWidthCm),
          packageHeightCm: numberOrNull(packageHeightCm),
          packageLengthCm: numberOrNull(packageLengthCm),
          packageWeightKg: numberOrNull(packageWeightKg),
          variants: variantsToSave.map((variant) => ({
            id: variant.id,
            sizeId: variant.sizeId ? Number(variant.sizeId) : null,
            colorId: variant.colorId ? Number(variant.colorId) : null,
            price: Number(variant.price),
            stockQuantity: variant.stockTrackingEnabled
              ? Number(variant.availableQuantity ?? 0)
              : null,
            sku: variant.sku.trim(),
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
      setLastSavedAt(new Date());
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

  async function uploadImages(filesToUpload = selectedFiles) {
    if (!filesToUpload.length || uploading) return;

    setUploading(true);
    setUploadProgress({ done: 0, total: filesToUpload.length });

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];

        const formData = new FormData();
        formData.append("file", file);

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

  async function archiveProduct() {
    if (archiving) return;

    setArchiving(true);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}/archive`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка архивации (${response.status})`);
      }

      toast.success("Товар перенесён в архив");
      setActionsOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось перенести товар в архив");
    } finally {
      setArchiving(false);
    }
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

  function addVariant() {
    setVariants((current) => [
      ...current,
      createEmptyVariant(),
    ]);

    markDirty();
  }

  function removeVariant(index: number) {
    setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index));
    markDirty();
  }

  if (loading) {
    return (
      <div className="pageContainer">
        <div className={styles.page}>Загрузка…</div>
      </div>
    );
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
        <ProductStickyHeader
        productId={productId}
        product={product}
        title={title}
        categoryId={categoryId}
        brandId={brandId}
        categories={categories}
        brands={brands}
        variants={variants}
        images={images}
        dirty={dirty}
        saving={saving}
        publishing={publishing}
        archiving={archiving}
        canPublish={canPublish}
        publishBlockedReason={publishBlockedReason}
        actionsOpen={actionsOpen}
        lastSavedAt={lastSavedAt}
        onSave={() => void saveProduct()}
        onPublish={() => void publishProduct()}
        onArchive={() => void archiveProduct()}
        onActionsOpenChange={setActionsOpen}
        />
    <div className={styles.pageContent}>
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
              brandId={brandId}
              audience={audience}
              categories={categories}
              brands={brands}
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
                clearValidationError("categoryId");
                markDirty();
              }}
              onBrandIdChange={(value) => {
                setBrandId(value);
                clearValidationError("brandId");
                markDirty();
              }}
              onAudienceChange={(value) => {
                setAudience(value);
                markDirty();
              }}
            />

            <ProductImagesCard
            invalid={validationErrors.images}
            uploadProgress={uploadProgress}
            images={images}
            uploading={uploading}
            reordering={reordering}
            dragImageId={dragImageId}
            onFilesChange={setSelectedFiles}
            onUploadImages={(files) => void uploadImages(files)}
            onDragImageStart={setDragImageId}
            onDragImageEnd={() => setDragImageId(null)}
            onMoveImage={(imageId) => moveImage(imageId)}
            onDeleteImage={(imageId) => void deleteImage(imageId)}
            onMoveImageByIndex={moveImageByIndex}
            />

            <ProductVariantsCard
            validationErrors={validationErrors.variants ?? {}}
            variants={variants}
            onUpdateVariant={updateVariant}
            onAddVariant={addVariant}
            onRemoveVariant={removeVariant}
            sizes={sizes}
            colors={colors}
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
          </main>

            <ProductPreviewAside
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
