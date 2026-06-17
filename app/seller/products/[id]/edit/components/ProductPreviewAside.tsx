import type { Option, ProductImageItem, SellerProduct } from "../types";
import styles from "../ProductEditPage.module.css";
import Image from "next/image";

type Props = {
  productId: number;
  title: string;
  brandId: number | "";
  brands: Option[];
  product: SellerProduct | null;
  images: ProductImageItem[];
  cardScore: number;
  descriptionLength: number;
  packageWeightKg: number | "";
  variantsCount: number;
};

export function ProductPreviewAside({
  productId,
  title,
  brandId,
  brands,
  product,
  images,
  cardScore,
  descriptionLength,
  packageWeightKg,
  variantsCount,
}: Props) {
  return (
    <aside className={styles.aside}>
      <div className={styles.stickyCard}>
        <div className={styles.previewImageBox}>
          {images[0] ? (
            <Image
              src={images[0].url}
              alt=""
              fill
              sizes="360px"
              className={styles.previewImage}
            />
          ) : (
            <div className={styles.previewPlaceholder}>Нет фото</div>
          )}
        </div>

        <div className={styles.previewTitleRow}>
          <h2>{title || "Название товара"}</h2>
          {product ? <StatusBadge status={product.status} /> : null}
        </div>
        <p>{brands.find((brand) => brand.id === brandId)?.name || product?.brand || "Бренд"}</p>

        <div className={styles.scoreBlock}>
          <div className={styles.scoreTop}>
            <span>Качество карточки</span>
            <strong>{cardScore}%</strong>
          </div>

          <div className={styles.scoreTrack}>
            <div style={{ width: `${cardScore}%` }} />
          </div>
        </div>

        <a
          href={`/seller/products/${productId}/preview`}
          target="_blank"
          rel="noreferrer"
          className={styles.previewAction}
        >
          Предпросмотр
        </a>

        <div className={styles.asideHints}>
          {images.length === 0 ? <span>Добавь хотя бы одно фото</span> : null}
          {descriptionLength < 80 ? <span>Описание лучше сделать подробнее</span> : null}
          {!packageWeightKg ? <span>Заполни вес для доставки</span> : null}
          {variantsCount === 0 ? <span>Добавь вариант товара</span> : null}
        </div>
      </div>
    </aside>
  );
}

function StatusBadge({ status }: { status: NonNullable<SellerProduct["status"]> }) {
  const label = {
    DRAFT: "Черновик",
    MODERATION: "На модерации",
    NEEDS_REVISION: "Нужна доработка",
    ACTIVE: "Активен",
    ARCHIVED: "Архив",
    BLOCKED: "Заблокирован",
  }[status];

  return (
    <span className={`${styles.statusBadge} ${styles[`statusBadge_${status}`]}`}>
      {label}
    </span>
  );
}
