import Link from "next/link";

import type {
  Option,
  ProductImageItem,
  SellerProduct,
} from "../types";
import styles from "../ProductEditPage.module.css";
import Image from "next/image";
import { StatusBadge } from "../../../../../components/ui/StatusBadge";
import { productPath } from "../../../../../lib/productUrls";
import { formatProductStatus, getProductStatusTone } from "../utils";

type Props = {
  productId: number;
  product: SellerProduct | null;
  title: string;
  categoryId: number | "";
  brandId: number | "";
  categories: Option[];
  brands: Option[];
  images: ProductImageItem[];
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
  archiving: boolean;
  canPublish: boolean;
  publishBlockedReason?: string;
  actionsOpen: boolean;
  lastSavedAt: Date | null;
  onSave: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onActionsOpenChange: (value: boolean) => void;
};

export function ProductStickyHeader({
  productId,
  product,
  title,
  categoryId,
  brandId,
  categories,
  brands,
  images,
  dirty,
  saving,
  publishing,
  archiving,
  canPublish,
  publishBlockedReason,
  actionsOpen,
  lastSavedAt,
  onSave,
  onPublish,
  onArchive,
  onActionsOpenChange,
}: Props) {
  const publicProductHref = productPath({
    id: productId,
    publicId: product?.publicId,
    title: title || product?.title,
    brand: product?.brand,
  });

  return (
    <header className={styles.lockedHeader}>
      <div className={styles.lockedHeaderInner}>
        <div className={styles.lockedProduct}>
          <Link href="/seller?tab=products" className={styles.lockedBack}>
            ←
          </Link>

          <div className={styles.lockedImageBox}>
            {images[0] ? (
              <Image
                src={images[0].url}
                alt=""
                fill
                sizes="48px"
                className={styles.lockedImage}
              />
            ) : (
              <div className={styles.lockedImagePlaceholder}>Фото</div>
            )}
          </div>

          <div className={styles.lockedInfo}>
            <div className={styles.lockedTitleRow}>
              <Link href={publicProductHref} target="_blank" className={styles.lockedTitle}>
                {title || "Название товара"}
              </Link>

              {product ? (
                <StatusBadge tone={getProductStatusTone(product.status)}>
                  {formatProductStatus(product.status)}
                </StatusBadge>
              ) : null}
            </div>

            <div className={styles.lockedMeta}>
              <span>{product?.article || "Артикул сайта появится после сохранения"}</span>
              <span>•</span>
              <span>
                {categories.find((category) => category.id === categoryId)?.name ||
                  product?.category ||
                  "Категория не выбрана"}
              </span>
              <span>•</span>
              <span>
                {brands.find((brand) => brand.id === brandId)?.name ||
                  product?.brand ||
                  "Бренд не выбран"}
              </span>
            </div>

          <div className={styles.saveState}>
            {dirty
              ? "Есть несохранённые изменения"
              : lastSavedAt
                ? `Сохранено ${lastSavedAt.toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Сохранено"}
          </div>
          </div>
        </div>

        <div className={styles.lockedActions}>
            <button
              type="button"
              onClick={onPublish}
              disabled={publishing || !canPublish}
              className={styles.lockedSecondaryBtn}
              title={!canPublish ? publishBlockedReason : undefined}
            >
              Опубликовать
            </button>

          <div className={styles.lockedMenuWrap}>
            <button
              type="button"
              onClick={() => onActionsOpenChange(!actionsOpen)}
              className={styles.lockedIconBtn}
              aria-label="Действия с товаром"
            >
              ⋯
            </button>

            {actionsOpen ? (
              <div className={styles.lockedMenu}>
                {product?.status === "ACTIVE" ? (
                  <Link href={publicProductHref} target="_blank">
                    Открыть карточку
                  </Link>
                ) : (
                  <Link href={`/seller/products/${productId}/edit`}>
                    Редактировать
                  </Link>
                )}

                <button type="button" disabled>
                  Скопировать
                </button>

                <button
                  type="button"
                  onClick={onArchive}
                  disabled={archiving}
                  className={styles.lockedMenuDanger}
                >
                  Перенести в архив
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={saving || !dirty}
            className={styles.lockedPrimaryBtn}
          >
            Сохранить
          </button>
        </div>
      </div>
    </header>
  );
}
