"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import ProductPageClient from "../../../../product/[id]/ProductPageClient";
import { API_URL, apiFetch } from "../../../../lib/api";
import type { Product } from "../../../../product/[id]/lib/types";
import type { SellerProduct } from "../edit/types";

import styles from "./SellerProductPreviewPage.module.css";

type Props = {
  productId: number;
};

export function SellerProductPreviewPageClient({ productId }: Props) {
  const [product, setProduct] = useState<SellerProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);

        const response = await apiFetch(
          `${API_URL}/api/seller/products/${productId}`
        );

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || "Не удалось загрузить товар");
        }

        const data = (await response.json()) as SellerProduct;

        if (!cancelled) {
          setProduct(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить товар"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const previewProduct = useMemo(
    () => (product ? mapSellerProductToPreviewProduct(product) : null),
    [product]
  );

  if (loading) {
    return (
      <div className="pageContainer">
        <div className={styles.state}>Загружаем предпросмотр</div>
      </div>
    );
  }

  if (error || !previewProduct) {
    return (
      <div className="pageContainer">
        <div className={styles.errorBox}>
          <h1>Предпросмотр недоступен</h1>
          <p>{error || "Товар не найден"}</p>
          <Link href={`/seller/products/${productId}/edit`}>Вернуться к товару</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pageContainer">
        <div className={styles.previewBar}>
          <div>
            <span>Предпросмотр карточки</span>
            <p>Так товар будет выглядеть после публикации.</p>
          </div>
          <Link href={`/seller/products/${productId}/edit`}>Вернуться к редактированию</Link>
        </div>
      </div>

      <ProductPageClient product={previewProduct} related={[]} sellerPreview />
    </>
  );
}

function mapSellerProductToPreviewProduct(product: SellerProduct): Product {
  const imageItems = [...(product.imageItems ?? [])].sort(
    (first, second) => first.sortOrder - second.sortOrder
  );
  const images = imageItems.length
    ? imageItems.map((image) => image.url)
    : product.images ?? [];

  return {
    id: product.id,
    sellerId: 0,
    title: product.title || "Название товара",
    description: product.description || "",
    composition: product.composition || "",
    article: product.article || undefined,
    brand: product.brand || "Бренд",
    brandSlug: null,
    category: product.category || "",
    audience: product.audience,
    status: product.status,
    images,
    colorways: (product.colorways ?? []).map((colorway) => ({
      id: colorway.id,
      colorId: colorway.colorId ?? null,
      color: colorway.color || "",
      colorHex: colorway.colorHex ?? null,
      sortOrder: colorway.sortOrder ?? null,
      isDefault: Boolean(colorway.isDefault),
      images: colorway.images ?? [],
    })),
    variants: product.variants
      .filter((variant) => variant.id !== null)
      .map((variant) => ({
        id: variant.id as number,
        colorwayId: variant.colorwayId ?? null,
        size: variant.size || "Без размера",
        color: variant.color || "",
        price: variant.price || 0,
        availableQuantity: variant.stockTrackingEnabled
          ? variant.availableQuantity
          : null,
        sku: variant.sku,
        sellerArticle: variant.sellerArticle ?? null,
        stockTrackingEnabled: variant.stockTrackingEnabled,
      })),
  };
}
