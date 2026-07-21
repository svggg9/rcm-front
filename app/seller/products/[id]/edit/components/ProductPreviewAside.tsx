import type { Option, ProductImageItem, SellerProduct } from "../types";
import styles from "../ProductEditPage.module.css";
import Image from "next/image";
import { StatusBadge } from "../../../../../components/ui/StatusBadge";
import { formatProductStatus, getProductStatusTone } from "../utils";

type Props = {
  productId: number;
  title: string;
  brandId: number | "";
  brands: Option[];
  product: SellerProduct | null;
  images: ProductImageItem[];
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
  descriptionLength,
  packageWeightKg,
  variantsCount,
}: Props) {
  const brandName =
    brands.find((brand) => brand.id === brandId)?.name?.trim() ||
    product?.brand?.trim() ||
    null;

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
            <div className={`${styles.previewPlaceholder} textCaption`}>Нет фото</div>
          )}
        </div>

        <div className={styles.previewTitleRow}>
          <h2 className="textTitle">{title || "Название товара"}</h2>
          {product ? (
            <StatusBadge tone={getProductStatusTone(product.status)}>
              {formatProductStatus(product.status)}
            </StatusBadge>
          ) : null}
        </div>
        {brandName ? <p className="textCaption">{brandName}</p> : null}

        <a
          href={`/seller/products/${productId}/preview`}
          target="_blank"
          rel="noreferrer"
          className={`${styles.previewAction} textButton`}
        >
          Предпросмотр
        </a>

        <div className={styles.asideHints}>
          {images.length === 0 ? <span className="textSmall">Добавь хотя бы одно фото</span> : null}
          {descriptionLength < 80 ? <span className="textSmall">Описание лучше сделать подробнее</span> : null}
          {!packageWeightKg ? <span className="textSmall">Заполни вес для доставки</span> : null}
          {variantsCount === 0 ? <span className="textSmall">Добавь вариант товара</span> : null}
        </div>
      </div>
    </aside>
  );
}
