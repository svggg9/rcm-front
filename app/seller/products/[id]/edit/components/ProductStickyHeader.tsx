import Link from "next/link";

import type {
  Option,
  ProductImageItem,
  ProductStatus,
  ProductVariant,
  SellerProduct,
} from "../types";
import styles from "../ProductEditPage.module.css";
import Image from "next/image";
import { useEffect, useRef } from "react";

type Props = {
  productId: number;
  product: SellerProduct | null;
  title: string;
  categoryId: number | "";
  brandId: number | "";
  categories: Option[];
  brands: Option[];
  variants: ProductVariant[];
  images: ProductImageItem[];
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
  archiving: boolean;
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
  variants,
  images,
  dirty,
  saving,
  publishing,
  archiving,
  actionsOpen,
  lastSavedAt,
  onSave,
  onPublish,
  onArchive,
  onActionsOpenChange,
}: Props) {
  
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;

    const update = () => {
      document.documentElement.style.setProperty(
        "--product-sticky-header-height",
        `${Math.ceil(node.getBoundingClientRect().height)}px`
      );
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <header ref={headerRef} className={styles.lockedHeader}>
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
              <Link href={`/product/${productId}`} target="_blank" className={styles.lockedTitle}>
                {title || "Название товара"}
              </Link>

              {product ? <StatusBadge status={product.status} /> : null}
            </div>

            <div className={styles.lockedMeta}>
              <span>{variants[0]?.sku || "SKU не заполнен"}</span>
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
            disabled={publishing}
            className={styles.lockedSecondaryBtn}
          >
            {publishing ? "Отправляем…" : "Опубликовать"}
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
                  <Link href={`/product/${productId}`} target="_blank">
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
                  {archiving ? "Переносим…" : "Перенести в архив"}
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
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </div>
    </header>
  );
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const label = {
    DRAFT: "Черновик",
    MODERATION: "На модерации",
    NEEDS_REVISION: "Нужна доработка",
    ACTIVE: "Активен",
    ARCHIVED: "Архив",
    BLOCKED: "Заблокирован",
  }[status];

  return <span className={styles.statusBadge}>{label}</span>;
}