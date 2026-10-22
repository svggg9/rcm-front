"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "./ProductPage.module.css";
import { resolveCartId } from "../../lib/cartAuthority";
import { emitCartChanged } from "../../lib/cartEvents";
import { useFavorites } from "../../lib/FavoritesContext";
import { ProductShowcase } from "../../components/ProductShowcase/ProductShowcase";

import { ProductGallery } from "./components/ProductGallery";
import { ProductInfoPanel } from "./components/ProductInfoPanel";

import type { Product } from "./lib/types";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { addVariantToCart } from "./lib/productPageApi";
import { getMinPrice } from "./lib/productPageUtils";
import { compactProductMedia, productColorVariants, resolveProductColorway } from "../../lib/productPresentation";
import { toast } from "@/app/components/ui/toast";
import type { CarouselProduct } from "../../components/ProductCarousel/types";

const ProductImageViewer = dynamic(
  () =>
    import("./components/ProductImageViewer").then(
      (module) => module.ProductImageViewer
    ),
  { ssr: false }
);

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
  const searchParams = useSearchParams();
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
  const addErrorToastId = `product-cart-add-${product.id}`;

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [previewColorwayId, setPreviewColorwayId] = useState<number | null>(null);
  const selectedColorway = resolveProductColorway(product.colorways ?? [], sellerPreview
    ? previewColorwayId?.toString() ?? null : searchParams.get("color"));
  const selectedColorwayId = selectedColorway?.id ?? null;

  const { isFavorite, toggle } = useFavorites();
  const isFav = isFavorite(product.id);

  const displayImages = useMemo(() => {
    return selectedColorway?.images?.length ? selectedColorway.images : product.images;
  }, [product.images, selectedColorway]);

  const visibleVariants = useMemo(() => {
    return productColorVariants(product.variants, selectedColorwayId);
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [viewerOpen, displayImages]);

  useEffect(() => {
    return () => {
      if (addSuccessTimerRef.current !== null) {
        window.clearTimeout(addSuccessTimerRef.current);
      }
      toast.dismiss(addErrorToastId);
    };
  }, [addErrorToastId]);

  function handleChangeColorway(colorwayId: number) {
    if (adding || !product.colorways?.some(color => color.id === colorwayId) || colorwayId === selectedColorwayId) return;
    setSelectedVariantId(null);
    setAddSuccess(false);
    if (sellerPreview) {
      setPreviewColorwayId(colorwayId);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("color", String(colorwayId));
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function handleChangeVariant(variantId: number) {
    const nextVariant = product.variants.find((variant) => variant.id === variantId);

    if (!nextVariant || !visibleVariants.some(variant => variant.id === variantId)) return;
    setSelectedVariantId(variantId);
  }

  async function handleAddToCart(variantId?: number) {
    const variantToAdd = variantId === undefined ? selectedVariant : product.variants.find(variant => variant.id === variantId);
    if (addInFlightRef.current || addSuccess) return;

    addInFlightRef.current = true;

    try {
      setAdding(true);
      setAddSuccess(false);

      const cartId = await resolveCartId();

      if (!cartId) {
        toast.error("Не удалось создать корзину", { id: addErrorToastId });
        return;
      }

      if (!variantToAdd) {
        toast.warning("Нет доступных вариантов");
        return;
      }

      if (
        variantToAdd.availableQuantity !== null &&
        variantToAdd.availableQuantity <= 0
      ) {
        toast.warning("Этот вариант отсутствует в наличии");
        return;
      }

      await addVariantToCart({
        cartId,
        variantId: variantToAdd.id,
        qty: 1,
      });

      toast.dismiss(addErrorToastId);
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
        error instanceof Error ? error.message : "Не удалось добавить в корзину",
        { id: addErrorToastId },
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

      toast.success(isFav ? "Удалено из избранного" : "Добавлено в избранное");
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
          <div className={styles.top}>
            <ProductGallery
              key={selectedColorwayId ?? "default"}
              title={product.title}
              images={displayImages}
              onOpenImage={openViewer}
              compact={compactProductMedia(product.category)}
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

      {viewerOpen ? (
        <ProductImageViewer
          open
          title={product.title}
          images={displayImages}
          currentIndex={viewerIndex}
          progress={viewerProgress}
          onClose={closeViewer}
          onPrev={showPrevImage}
          onNext={showNextImage}
        />
      ) : null}
    </>
  );
}
