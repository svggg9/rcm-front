"use client";

import type { Option, ProductImageItem, SellerProduct } from "../types";
import styles from "../ProductEditPage.module.css";
import { ProductImageCarousel } from "../../../../../components/ProductImageCarousel/ProductImageCarousel";
import { StatusBadge } from "../../../../../components/ui/StatusBadge";
import { formatProductStatus, getProductStatusTone } from "../utils";

type Props = {
  title: string;
  brandId: number | "";
  brands: Option[];
  product: SellerProduct | null;
  images: ProductImageItem[];
};

export function ProductPreviewAside({
  title,
  brandId,
  brands,
  product,
  images,
}: Props) {
  const brandName =
    brands.find((brand) => brand.id === brandId)?.name?.trim() ||
    product?.brand?.trim() ||
    null;

  return (
    <aside className={styles.aside}>
      <div className={styles.stickyCard}>
        <ProductImageCarousel
          title={title || "Товар"}
          images={images.map((image) => image.url)}
        />

        <div className={styles.previewTitleRow}>
          <h2 className="textTitle">{title || "Название товара"}</h2>
          {product ? (
            <StatusBadge tone={getProductStatusTone(product.status)}>
              {formatProductStatus(product.status)}
            </StatusBadge>
          ) : null}
        </div>
        {brandName ? <p className="textCaption">{brandName}</p> : null}

      </div>
    </aside>
  );
}
