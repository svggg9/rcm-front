"use client";

import { useEffect, useMemo, useState } from "react";

import { getCartId } from "../../../lib/auth";
import { emitCartChanged } from "../../../lib/cartEvents";
import { useFavorites } from "../../../lib/FavoritesContext";

import type { Product, Variant } from "./types";
import {
  fetchProductPageData,
  addVariantToCart,
} from "./productPageApi";
import {
  getMinPrice,
  getSizesText,
} from "./productPageUtils";

export function useProductPage(productId: string) {
  // ===== STATE =====
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [openFit, setOpenFit] = useState(false);
  const [openShipping, setOpenShipping] = useState(false);

  const cartId = getCartId();
  const { favoriteIds, toggle } = useFavorites();

  // ===== DATA LOAD =====
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);

        const data = await fetchProductPageData(productId);
        if (!alive) return;

        setProduct(data.product);
        setRelated(data.related);

        const firstAvailableVariant =
          data.product.variants[0] ??
          null;

        setSelectedVariantId(firstAvailableVariant?.id ?? null);
      } catch {
        if (!alive) return;
        setProduct(null);
        setRelated([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [productId]);

  // ===== VIEWER KEYBOARD =====
  useEffect(() => {
    if (!viewerOpen || !product?.images?.length) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setViewerOpen(false);
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    }

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [viewerOpen, product]);

  // ===== DERIVED =====
  const selectedVariant: Variant | null = useMemo(() => {
    if (!product) return null;

    return (
      product.variants.find((v) => v.id === selectedVariantId) ??
      product.variants[0] ??
      null
    );
  }, [product, selectedVariantId]);

  const currentPrice =
    selectedVariant?.price ?? (product ? getMinPrice(product) : 0);

  const sizesText = useMemo(() => {
    if (!product) return "Размеры уточняются";
    return getSizesText(product);
  }, [product]);

  const isFav = product ? favoriteIds.includes(product.id) : false;

  const viewerProgress =
    product && product.images.length > 1
      ? (viewerIndex / (product.images.length - 1)) * 100
      : 0;

  // ===== ACTIONS =====

  async function addToCart() {
    if (!product || !cartId || !selectedVariant) return;

    try {
      setAdding(true);

      await addVariantToCart({
        cartId,
        variantId: selectedVariant.id,
      });

      emitCartChanged();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function toggleFavorite() {
    if (!product) return;
    await toggle(product.id);
  }

  function openViewer(index: number) {
    setViewerIndex(index);
    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
  }

  function nextImage() {
    if (!product?.images?.length) return;

    setViewerIndex((prev) => (prev + 1) % product.images.length);
  }

  function prevImage() {
    if (!product?.images?.length) return;

    setViewerIndex((prev) =>
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  }

  // ===== RETURN =====
  return {
    // data
    product,
    related,
    loading,

    // variant
    selectedVariant,
    selectedVariantId,
    setSelectedVariantId,

    // UI states
    adding,
    isFav,
    sizesText,
    currentPrice,

    // accordion
    openFit,
    openShipping,
    toggleFit: () => setOpenFit((prev) => !prev),
    toggleShipping: () => setOpenShipping((prev) => !prev),

    // viewer
    viewerOpen,
    viewerIndex,
    viewerProgress,
    openViewer,
    closeViewer,
    nextImage,
    prevImage,

    // actions
    addToCart,
    toggleFavorite,
  };
}