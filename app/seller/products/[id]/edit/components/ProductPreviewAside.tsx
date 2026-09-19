"use client";

import type { ReactNode } from "react";

import { StatusBadge } from "../../../../../components/ui/StatusBadge";
import type { Option, SellerProduct } from "../types";
import { formatProductStatus, getProductStatusTone } from "../utils";
import styles from "../ProductEditPage.module.css";
import { ProductPhotoEditor, type ProductPhotoEditorProps } from "./ProductPhotoEditor";

type Props = {
  title: string;
  brandId: number | "";
  brands: Option[];
  product: SellerProduct | null;
  photoEditor: ProductPhotoEditorProps;
  actions?: ReactNode;
};

export function ProductPreviewAside({
  title,
  brandId,
  brands,
  product,
  photoEditor,
  actions,
}: Props) {
  const brandName =
    brands.find((brand) => brand.id === brandId)?.name?.trim() ||
    product?.brand?.trim() ||
    null;

  return (
    <aside className={styles.aside}>
      <div className={styles.stickyCard}>
        <div className={styles.previewMedia}>
          <ProductPhotoEditor {...photoEditor} />
          {product ? (
            <div className={styles.photoEditorStatus}>
              <StatusBadge
                tone={getProductStatusTone(product.status)}
                size="regular"
              >
                {formatProductStatus(product.status)}
              </StatusBadge>
            </div>
          ) : null}
        </div>

        <div className={styles.previewTitleRow}>
          <h2 className="textTitle">{title || "Название товара"}</h2>
        </div>
        {brandName ? <p className="textCaption">{brandName}</p> : null}
        {actions ? <div className={styles.previewActions}>{actions}</div> : null}
      </div>
    </aside>
  );
}
