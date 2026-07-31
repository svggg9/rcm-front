"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./ProductPage.module.css";
import { Icon } from "../../components/ui/Icon";
import { ensureCartId } from "../../lib/auth";
import { emitCartChanged } from "../../lib/cartEvents";
import { useFavorites } from "../../lib/FavoritesContext";
import { ProductShowcase } from "../../components/ProductShowcase/ProductShowcase";

import { ProductGallery } from "./components/ProductGallery";
import { ProductInfoPanel } from "./components/ProductInfoPanel";
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
  sellerPreview?: boolean;
};

export default function ProductPageClient({
  product,
  related,
  sellerPreview = false,
}: Props) {
  const router = useRouter();
  const { user } = useCurrentUser();

  const isAdmin = user?.role === "ADMIN";
  const isOwnSellerProduct =
    user?.role === "SELLER" && product.sellerId === user.id;

  const isSellerView = sellerPreview || isAdmin || isOwnSellerProduct;

  const [adding, setAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const addSuccessTimerRef = useRef<number | null>(null);
  const addInFlightRef = useRef(false);
  const favoriteInFlightRef = useRef(false);
  const [openDescription, setOpenDescription] = useState(true);
  const [openBrand, setOpenBrand] = useState(false);

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
    const selected = visibleVariants.find((variant) => variant.id === selectedVariantId);

    if (selected) {
      return selected;
    }

    return visibleVariants.length === 1 ? visibleVariants[0] : null;
  }, [visibleVariants, selectedVariantId]);

  const currentPrice =
    selectedVariant?.price ??
    (visibleVariants.length > 0
      ? Math.min(...visibleVariants.map((variant) => variant.price))
      : getMinPrice(product));
  const sameBrandProducts = useMemo(
    () => related.filter((item) => item.brand === product.brand),
    [product.brand, related]
  );
  const sameCategoryProducts = useMemo(
    () =>
      related.filter(
        (item) => item.category === product.category && item.brand !== product.brand
      ),
    [product.brand, product.category, related]
  );

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

  useEffect(() => {
    return () => {
      if (addSuccessTimerRef.current !== null) {
        window.clearTimeout(addSuccessTimerRef.current);
      }
    };
  }, []);

  function handleChangeColorway(colorwayId: number) {
    setSelectedColorwayId(colorwayId);
    setSelectedVariantId(null);
  }

  function handleChangeVariant(variantId: number) {
    const nextVariant = product.variants.find((variant) => variant.id === variantId);

    setSelectedVariantId(variantId);

    if (nextVariant?.colorwayId) {
      setSelectedColorwayId(nextVariant.colorwayId);
    }
  }

  async function handleAddToCart() {
    if (addInFlightRef.current || addSuccess) return;

    addInFlightRef.current = true;

    try {
      setAdding(true);
      setAddSuccess(false);

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

      await addVariantToCart({
        cartId,
        variantId: selectedVariant.id,
        qty: 1,
      });

      emitCartChanged();
      setAddSuccess(true);

      if (addSuccessTimerRef.current !== null) {
        window.clearTimeout(addSuccessTimerRef.current);
      }

      addSuccessTimerRef.current = window.setTimeout(() => {
        setAddSuccess(false);
        addSuccessTimerRef.current = null;
      }, 1200);
    } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Не удалось добавить в корзину"
        );
    } finally {
      addInFlightRef.current = false;
      setAdding(false);
    }
  }

  async function handleToggleFavorite() {
    if (favoriteInFlightRef.current) return;

    favoriteInFlightRef.current = true;

    try {
      setFavoritePending(true);
      await toggle(product.id);

      toast(isFav ? "Удалено из избранного" : "Добавлено в избранное");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось обновить избранное"
      );
    } finally {
      favoriteInFlightRef.current = false;
      setFavoritePending(false);
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
          <nav
            className={styles.breadcrumbs}
            aria-label="Навигационная цепочка"
          >
            <ol className={styles.breadcrumbList}>
              <li className={styles.breadcrumbItem}>
                <Link href="/catalog" className={styles.breadcrumbLink}>
                  Каталог
                </Link>
              </li>

              {product.brand ? (
                <li className={styles.breadcrumbSeparator} aria-hidden="true">
                  <Icon name="chevron-right" size={13} strokeWidth={1.4} />
                </li>
              ) : null}

              {product.brandSlug ? (
                <li className={styles.breadcrumbItem}>
                  <Link
                    href={`/brand/${product.brandSlug}`}
                    className={styles.breadcrumbLink}
                  >
                    {product.brand}
                  </Link>
                </li>
              ) : product.brand ? (
                <li className={styles.breadcrumbItem}>
                  <span className={styles.breadcrumbCurrent}>
                    {product.brand}
                  </span>
                </li>
              ) : null}
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
              selectedVariantId={selectedVariantId}
              onChangeVariant={handleChangeVariant}
              selectedVariant={selectedVariant}
              currentPrice={currentPrice}
              adding={adding}
              addSuccess={addSuccess}
              isFav={isFav}
              favoritePending={favoritePending}
              isSellerView={isSellerView}
              onAddToCart={handleAddToCart}
              onToggleFavorite={handleToggleFavorite}
              onEditProduct={() =>
                router.push(`/seller/products/${product.id}/edit`)
              }
              selectedColorwayId={selectedColorwayId}
              onChangeColorway={handleChangeColorway}
              openDescription={openDescription}
              openBrand={openBrand}
              onToggleDescription={() => setOpenDescription((prev) => !prev)}
              onToggleBrand={() => setOpenBrand((prev) => !prev)}
            />
          </div>

          <ProductShowcase
            className={styles.relatedSection}
            variant="carousel"
            density="compact"
            title={`Еще от ${product.brand}`}
            products={sameBrandProducts}
          />
          <ProductShowcase
            className={styles.relatedSection}
            variant="carousel"
            density="compact"
            title="Похожие товары"
            products={sameCategoryProducts}
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
