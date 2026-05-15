"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, API_URL } from "../../../../lib/api";
import { useClientAuth } from "../../../../lib/useClientAuth";

import { ProductStickyHeader } from "./components/ProductStickyHeader";
import { ProductGeneralCard } from "./components/ProductGeneralCard";
import { ProductImagesCard } from "./components/ProductImagesCard";
import { ProductVariantsCard } from "./components/ProductVariantsCard";
import { ProductShippingCard } from "./components/ProductShippingCard";
import { ProductPreviewAside } from "./components/ProductPreviewAside";

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

export function ProductEditPageClient({ productId }: Props) {
  const router = useRouter();
  const isAuth = useClientAuth();

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
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [brandId, setBrandId] = useState<number | "">("");
  const [audience, setAudience] = useState<Audience>("UNISEX");

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

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    if (isAuth === null) return;

    if (!isAuth) {
      router.push(`/auth/login?next=/seller/products/${productId}/edit`);
    }
  }, [isAuth, productId, router]);

  useEffect(() => {
    if (isAuth !== true) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [productResponse, categoriesResponse, brandsResponse] = await Promise.all([
          apiFetch(`${API_URL}/api/seller/products/${productId}`),
          apiFetch(`${API_URL}/api/categories`),
          apiFetch(`${API_URL}/api/brands`),
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

        const productData: SellerProduct = await productResponse.json();
        const categoriesData: Option[] = await categoriesResponse.json();
        const brandsData: Option[] = await brandsResponse.json();

        if (cancelled) return;

        setProduct(productData);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setBrands(Array.isArray(brandsData) ? brandsData : []);

        setTitle(productData.title ?? "");
        setDescription(productData.description ?? "");
        setCategoryId(productData.categoryId ?? "");
        setBrandId(productData.brandId ?? "");
        setAudience(productData.audience ?? "UNISEX");

        setPackageWidthCm(productData.packageWidthCm ?? "");
        setPackageHeightCm(productData.packageHeightCm ?? "");
        setPackageLengthCm(productData.packageLengthCm ?? "");
        setPackageWeightKg(productData.packageWeightKg ?? "");

        setVariants(
          Array.isArray(productData.variants) && productData.variants.length
            ? productData.variants.map((variant) => ({
                id: variant.id,
                size: variant.size ?? "",
                color: variant.color ?? "",
                price: Number(variant.price ?? 0),
                availableQuantity: variant.availableQuantity,
                sku: variant.sku ?? "",
                stockTrackingEnabled: variant.stockTrackingEnabled !== false,
              }))
            : []
        );

        setImages(Array.isArray(productData.imageItems) ? productData.imageItems : []);
        setInitialized(true);
        setDirty(false);
        setLastSavedAt(new Date());
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Не удалось загрузить товар");
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
  }, [isAuth, productId]);

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
    setNotice(null);
  }

  async function saveProduct() {
    if (saving || !dirty) return;

    setError(null);
    setNotice(null);

    if (!title.trim()) return setError("Введите название товара");
    if (!description.trim()) return setError("Введите описание");
    if (categoryId === "") return setError("Выберите категорию");
    if (brandId === "") return setError("Выберите бренд");
    if (variants.length === 0) return setError("Добавьте хотя бы один вариант");

    for (const variant of variants) {
      if (!variant.sku.trim()) return setError("У каждого варианта должен быть SKU");
      if (!variant.size.trim()) return setError("У каждого варианта должен быть размер");
      if (!variant.color.trim()) return setError("У каждого варианта должен быть цвет");
      if (variant.price <= 0) return setError("Цена варианта должна быть больше 0");

      if (
        variant.stockTrackingEnabled &&
        (variant.availableQuantity === null || variant.availableQuantity < 0)
      ) {
        return setError("Количество не может быть меньше 0");
      }
    }

    setSaving(true);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categoryId: Number(categoryId),
          brandId: Number(brandId),
          audience,
          packageWidthCm: numberOrNull(packageWidthCm),
          packageHeightCm: numberOrNull(packageHeightCm),
          packageLengthCm: numberOrNull(packageLengthCm),
          packageWeightKg: numberOrNull(packageWeightKg),
          variants: variants.map((variant) => ({
            id: variant.id,
            size: variant.size.trim(),
            color: variant.color.trim(),
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

      setDirty(false);
      setLastSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить товар");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImages() {
    if (!selectedFiles.length || uploading) return;

    setUploading(true);
    setError(null);
    setNotice(null);

    try {
      for (const file of selectedFiles) {
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
      }

      setSelectedFiles([]);
      setNotice("Фото загружены");
      await reloadProductImages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
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
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch(
        `${API_URL}/api/seller/products/${productId}/images/${imageId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка удаления (${response.status})`);
      }

      setNotice("Фото удалено");
      await reloadProductImages();
    } catch (e) {
      setImages(previous);
      setError(e instanceof Error ? e.message : "Не удалось удалить фото");
    }
  }

  async function saveImageOrder(nextImages: ProductImageItem[]) {
    if (nextImages.length === 0) return;

    setReordering(true);
    setError(null);

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

      setNotice("Порядок фото сохранён");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить порядок фото");
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

    const nextImages = [...images];
    const [moved] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, moved);

    setImages(nextImages);
    void saveImageOrder(nextImages);
  }

  async function publishProduct() {
    if (publishing) return;

    setPublishing(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}/publish`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка публикации (${response.status})`);
      }

      setNotice("Товар отправлен на публикацию");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось опубликовать товар");
    } finally {
      setPublishing(false);
    }
  }

  async function archiveProduct() {
    if (archiving) return;

    setArchiving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch(`${API_URL}/api/seller/products/${productId}/archive`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Ошибка архивации (${response.status})`);
      }

      setNotice("Товар перенесён в архив");
      setActionsOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось перенести товар в архив");
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

    markDirty();
  }

  function addVariant() {
    setVariants((current) => [
      ...current,
      {
        id: null,
        size: "",
        color: "",
        price: 0,
        availableQuantity: 0,
        sku: "",
        stockTrackingEnabled: true,
      },
    ]);

    markDirty();
  }

  function removeVariant(index: number) {
    setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index));
    markDirty();
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
        actionsOpen={actionsOpen}
        lastSavedAt={lastSavedAt}
        onSave={() => void saveProduct()}
        onPublish={() => void publishProduct()}
        onArchive={() => void archiveProduct()}
        onActionsOpenChange={setActionsOpen}
        />

        {error ? <div className={styles.error}>{error}</div> : null}
        {notice ? <div className={styles.notice}>{notice}</div> : null}

        <div className={styles.layout}>
          <main className={styles.main}>
            <ProductGeneralCard
            title={title}
            description={description}
            categoryId={categoryId}
            brandId={brandId}
            audience={audience}
            categories={categories}
            brands={brands}
            onTitleChange={(value) => {
                setTitle(value);
                markDirty();
            }}
            onDescriptionChange={(value) => {
                setDescription(value);
                markDirty();
            }}
            onCategoryIdChange={(value) => {
                setCategoryId(value);
                markDirty();
            }}
            onBrandIdChange={(value) => {
                setBrandId(value);
                markDirty();
            }}
            onAudienceChange={(value) => {
                setAudience(value);
                markDirty();
            }}
            />

            <ProductImagesCard
            images={images}
            selectedFiles={selectedFiles}
            uploading={uploading}
            reordering={reordering}
            dragImageId={dragImageId}
            onFilesChange={setSelectedFiles}
            onUploadImages={() => void uploadImages()}
            onDragImageStart={setDragImageId}
            onDragImageEnd={() => setDragImageId(null)}
            onMoveImage={(imageId) => moveImage(imageId)}
            onDeleteImage={(imageId) => void deleteImage(imageId)}
            />

            <ProductVariantsCard
            variants={variants}
            onUpdateVariant={updateVariant}
            onAddVariant={addVariant}
            onRemoveVariant={removeVariant}
            />

            <ProductShippingCard
            packageWidthCm={packageWidthCm}
            packageHeightCm={packageHeightCm}
            packageLengthCm={packageLengthCm}
            packageWeightKg={packageWeightKg}
            onPackageWidthCmChange={(value) => {
                setPackageWidthCm(value);
                markDirty();
            }}
            onPackageHeightCmChange={(value) => {
                setPackageHeightCm(value);
                markDirty();
            }}
            onPackageLengthCmChange={(value) => {
                setPackageLengthCm(value);
                markDirty();
            }}
            onPackageWeightKgChange={(value) => {
                setPackageWeightKg(value);
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
  );
}