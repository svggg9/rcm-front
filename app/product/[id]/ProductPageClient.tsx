"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./ProductPage.module.css";
import { ensureCartId } from "../../lib/auth";
import { emitCartChanged } from "../../lib/cartEvents";
import { useFavorites } from "../../lib/FavoritesContext";
import { ProductCarousel } from "../../components/ProductCarousel/ProductCarousel";
import { mapProductToCarouselProduct } from "../../lib/productMappers";

import { ProductGallery } from "./components/ProductGallery";
import { ProductInfoPanel } from "./components/ProductInfoPanel";
import { ProductDetailsAccordion } from "./components/ProductDetailsAccordion";
import { ProductImageViewer } from "./components/ProductImageViewer";

import type { Product } from "./lib/types";
import { addVariantToCart } from "./lib/productPageApi";
import { getMinPrice, getSizesText } from "./lib/productPageUtils";

type Props = {
  product: Product;
  related: Product[];
};

export default function ProductPageClient({ product, related }: Props) {
  const [adding, setAdding] = useState(false);

  const [openFit, setOpenFit] = useState(false);
  const [openShipping, setOpenShipping] = useState(false);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    product.variants.find((variant) => variant.availableQuantity > 0)?.id ??
      product.variants[0]?.id ??
      null
  );

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const { favoriteIds, toggle } = useFavorites();
  const isFav = favoriteIds.includes(product.id);

  useEffect(() => {
    if (!viewerOpen || !product.images.length) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setViewerOpen(false);
      }

      if (event.key === "ArrowRight") {
        setViewerIndex((prev) => (prev + 1) % product.images.length);
      }

      if (event.key === "ArrowLeft") {
        setViewerIndex((prev) =>
          prev === 0 ? product.images.length - 1 : prev - 1
        );
      }
    }

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [viewerOpen, product.images]);

  const selectedVariant = useMemo(() => {
    return (
      product.variants.find((variant) => variant.id === selectedVariantId) ??
      product.variants[0] ??
      null
    );
  }, [product.variants, selectedVariantId]);

  const currentPrice = selectedVariant?.price ?? getMinPrice(product);

  const sizesText = useMemo(() => getSizesText(product), [product]);

  const viewerProgress =
    product.images.length > 1
      ? (viewerIndex / (product.images.length - 1)) * 100
      : 0;

  async function handleAddToCart() {
    try {
      const cartId = await ensureCartId();

      if (!cartId) {
        alert("Не удалось создать корзину");
        return;
      }

      if (!selectedVariant) {
        alert("Нет доступных вариантов");
        return;
      }

      if (selectedVariant.availableQuantity <= 0) {
        alert("Этот вариант отсутствует в наличии");
        return;
      }

      setAdding(true);

      await addVariantToCart({
        cartId,
        variantId: selectedVariant.id,
        qty: 1,
      });

      emitCartChanged();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleFavorite() {
    await toggle(product.id);
  }

  function openViewer(index: number) {
    setViewerIndex(index);
    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
  }

  function showPrevImage() {
    if (!product.images.length) return;

    setViewerIndex((prev) =>
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  }

  function showNextImage() {
    if (!product.images.length) return;

    setViewerIndex((prev) => (prev + 1) % product.images.length);
  }

  return (
    <>
      <div className="pageContainer">
        <div className={styles.page}>
          <div className={styles.top}>
            <ProductGallery
              title={product.title}
              images={product.images}
              onOpenImage={openViewer}
            />

            <ProductInfoPanel
              product={product}
              selectedVariantId={selectedVariantId}
              onChangeVariant={setSelectedVariantId}
              selectedVariant={selectedVariant}
              currentPrice={currentPrice}
              sizesText={sizesText}
              adding={adding}
              isFav={isFav}
              onAddToCart={handleAddToCart}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>

          <ProductDetailsAccordion
            product={product}
            selectedVariant={selectedVariant}
            sizesText={sizesText}
            openFit={openFit}
            openShipping={openShipping}
            onToggleFit={() => setOpenFit((prev) => !prev)}
            onToggleShipping={() => setOpenShipping((prev) => !prev)}
          />

          {related.length > 0 ? (
            <ProductCarousel
              title="Другие товары"
              products={related.map(mapProductToCarouselProduct)}
            />
          ) : null}
        </div>
      </div>

      <ProductImageViewer
        open={viewerOpen}
        title={product.title}
        images={product.images}
        currentIndex={viewerIndex}
        progress={viewerProgress}
        onClose={closeViewer}
        onPrev={showPrevImage}
        onNext={showNextImage}
      />
    </>
  );
}