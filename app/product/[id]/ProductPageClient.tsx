"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./ProductPage.module.css";
import { ensureCartId } from "../../lib/auth";
import { emitCartChanged } from "../../lib/cartEvents";
import { useFavorites } from "../../lib/FavoritesContext";
import { ProductCarousel } from "../../components/ProductCarousel/ProductCarousel";

import { ProductGallery } from "./components/ProductGallery";
import { ProductInfoPanel } from "./components/ProductInfoPanel";
import { ProductDetailsAccordion } from "./components/ProductDetailsAccordion";
import { ProductImageViewer } from "./components/ProductImageViewer";

import type { Product } from "./lib/types";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { addVariantToCart } from "./lib/productPageApi";
import { getMinPrice } from "./lib/productPageUtils";
import { toast } from "sonner";
import type { CarouselProduct } from "../../components/ProductCarousel/types";

type Props = {
  product: Product;
  related: CarouselProduct[];
};

export default function ProductPageClient({ product, related }: Props) {
  const router = useRouter();
  const { user } = useCurrentUser();

  const isAdmin = user?.role === "ADMIN";
  const isOwnSellerProduct =
    user?.role === "SELLER" && product.sellerId === user.id;

  const isSellerView = isAdmin || isOwnSellerProduct;

  const [adding, setAdding] = useState(false);
  const [openDescription, setOpenDescription] = useState(true);
  const [openShipping, setOpenShipping] = useState(false);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [selectedColorwayId, setSelectedColorwayId] = useState<number | null>(() => {
    const defaultColorway =
      product.colorways?.find((colorway) => colorway.isDefault) ??
      product.colorways?.[0];

    return defaultColorway?.id ?? product.variants[0]?.colorwayId ?? null;
  });

  const { favoriteIds, toggle } = useFavorites();
  const isFav = favoriteIds.includes(product.id);

  const selectedColorway = useMemo(() => {
    return (
      product.colorways?.find((colorway) => colorway.id === selectedColorwayId) ??
      null
    );
  }, [product.colorways, selectedColorwayId]);

  const displayImages = useMemo(() => {
    return selectedColorway?.images?.length ? selectedColorway.images : product.images;
  }, [product.images, selectedColorway]);

  const visibleVariants = useMemo(() => {
    if (!selectedColorwayId) {
      return product.variants;
    }

    const filtered = product.variants.filter(
      (variant) => variant.colorwayId === selectedColorwayId
    );

    return filtered.length ? filtered : product.variants;
  }, [product.variants, selectedColorwayId]);

  const selectedVariant = useMemo(() => {
    return (
      visibleVariants.find((variant) => variant.id === selectedVariantId) ??
      visibleVariants[0] ??
      null
    );
  }, [visibleVariants, selectedVariantId]);

  const currentPrice = selectedVariant?.price ?? getMinPrice(product);

  const viewerProgress =
    displayImages.length > 1
      ? (viewerIndex / (displayImages.length - 1)) * 100
      : 0;

  useEffect(() => {
    setViewerIndex(0);
  }, [displayImages]);

  useEffect(() => {
    if (!viewerOpen || !displayImages.length) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setViewerOpen(false);
      }

      if (event.key === "ArrowRight") {
        setViewerIndex((prev) => (prev + 1) % displayImages.length);
      }

      if (event.key === "ArrowLeft") {
        setViewerIndex((prev) =>
          prev === 0 ? displayImages.length - 1 : prev - 1
        );
      }
    }

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [viewerOpen, displayImages]);

  function handleChangeColorway(colorwayId: number) {
    setSelectedColorwayId(colorwayId);

    const nextVariant = product.variants.find(
      (variant) => variant.colorwayId === colorwayId
    );

    setSelectedVariantId(nextVariant?.id ?? null);
  }

  function handleChangeVariant(variantId: number) {
    const nextVariant = product.variants.find((variant) => variant.id === variantId);

    setSelectedVariantId(variantId);

    if (nextVariant?.colorwayId) {
      setSelectedColorwayId(nextVariant.colorwayId);
    }
  }

  async function handleAddToCart() {
    try {
      const cartId = await ensureCartId();

      if (!cartId) {
        toast.error("Не удалось создать корзину");
        return;
      }

      if (!selectedVariant) {
        toast.error("Нет доступных вариантов");
        return;
      }

      if (
        selectedVariant.availableQuantity !== null &&
        selectedVariant.availableQuantity <= 0
      ) {
        toast.error("Этот вариант отсутствует в наличии");
        return;
      }

      setAdding(true);

      await addVariantToCart({
        cartId,
        variantId: selectedVariant.id,
        qty: 1,
      });

      toast.success("Товар добавлен в корзину");

      emitCartChanged();
    } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Не удалось добавить в корзину"
        );
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleFavorite() {
      try {
        await toggle(product.id);

        toast(isFav ? "Удалено из избранного" : "Добавлено в избранное");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Не удалось обновить избранное"
        );
      }
    }

  function openViewer(index: number) {
    setViewerIndex(index);
    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
  }

  function showPrevImage() {
    if (!displayImages.length) return;

    setViewerIndex((prev) =>
      prev === 0 ? displayImages.length - 1 : prev - 1
    );
  }

  function showNextImage() {
    if (!displayImages.length) return;

    setViewerIndex((prev) => (prev + 1) % displayImages.length);
  }

  return (
    <>
      <div className="pageContainer">
        <div className={styles.page}>
          <nav className={styles.breadcrumbs} aria-label="Навигационная цепочка">
  <ol className={styles.breadcrumbList}>
    <li className={styles.breadcrumbItem}>
      <Link href="/catalog" className={styles.breadcrumbLink}>
        Каталог
      </Link>
    </li>

    {product.brandSlug ? (
      <li className={styles.breadcrumbItem}>
        <Link href={`/brand/${product.brandSlug}`} className={styles.breadcrumbLink}>
          {product.brand}
        </Link>
      </li>
    ) : product.brand ? (
      <li className={styles.breadcrumbItem}>
        <span className={styles.breadcrumbCurrent}>{product.brand}</span>
      </li>
    ) : null}

    <li className={styles.breadcrumbItem}>
      <span className={styles.breadcrumbCurrent}>{product.title}</span>
    </li>
  </ol>
          </nav>
          <div className={styles.top}>
            <ProductGallery
              key={selectedColorwayId ?? "default"}
              title={product.title}
              images={displayImages}
              onOpenImage={openViewer}
            />

            <ProductInfoPanel
              product={product}
              variants={visibleVariants}
              colorways={product.colorways ?? []}
              selectedColorwayId={selectedColorwayId}
              onChangeColorway={handleChangeColorway}
              selectedVariantId={selectedVariantId}
              onChangeVariant={handleChangeVariant}
              selectedVariant={selectedVariant}
              currentPrice={currentPrice}
              adding={adding}
              isFav={isFav}
              isSellerView={isSellerView}
              onAddToCart={handleAddToCart}
              onToggleFavorite={handleToggleFavorite}
              onEditProduct={() => router.push(`/seller/products/${product.id}/edit`)}
            />
          </div>

          {related.length > 0 ? (
            <>
              <ProductCarousel
                title={`Еще от ${product.brand}`}
                products={related.filter((item) => item.brand === product.brand)}
              />
              <ProductCarousel
                title="Рекомендации"
                products={related.filter((item) => item.brand !== product.brand)}
              />
            </>
          ) : null}

          <ProductDetailsAccordion
            product={product}
            selectedVariant={selectedVariant}
            openDescription={openDescription}
            openShipping={openShipping}
            onToggleDescription={() => setOpenDescription((prev) => !prev)}
            onToggleShipping={() => setOpenShipping((prev) => !prev)}
          />
        </div>
      </div>

      <ProductImageViewer
        open={viewerOpen}
        title={product.title}
        images={displayImages}
        currentIndex={viewerIndex}
        progress={viewerProgress}
        onClose={closeViewer}
        onPrev={showPrevImage}
        onNext={showNextImage}
      />
    </>
  );
}
