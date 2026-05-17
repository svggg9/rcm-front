import type { Option, ProductImageItem, SellerProduct } from "../types";
import styles from "../ProductEditPage.module.css";
import Image from "next/image";

type Props = {
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
            <Image src={images[0].url} alt="" className={styles.previewImage} />
          ) : (
            <div className={styles.previewPlaceholder}>Нет фото</div>
          )}
        </div>

        <h2>{title || "Название товара"}</h2>
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