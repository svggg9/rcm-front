"use client";

import styles from "../Seller.module.css";

type Option = {
  id: number;
  name: string;
};

type Audience = "MEN" | "WOMEN" | "UNISEX";

type Props = {
  categories: Option[];
  brands: Option[];
  loadingLists: boolean;
  title: string;
  description: string;
  categoryId: number | "";
  brandId: number | "";
  audience: Audience;
  size: string;
  color: string;
  price: number;
  quantity: number;
  sku: string;
  submitting: boolean;
  createdProductId: number | null;
  file: File | null;
  uploading: boolean;
  imageUrl: string | null;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryIdChange: (value: number | "") => void;
  onBrandIdChange: (value: number | "") => void;
  onAudienceChange: (value: Audience) => void;
  onSizeChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onPriceChange: (value: number) => void;
  onQuantityChange: (value: number) => void;
  onSkuChange: (value: string) => void;
  onFileChange: (value: File | null) => void;
  onCreateProduct: () => void;
  onUploadImage: () => void;
};

export function SellerProductCreateTab({
  categories,
  brands,
  loadingLists,
  title,
  description,
  categoryId,
  brandId,
  audience,
  size,
  color,
  price,
  quantity,
  sku,
  submitting,
  createdProductId,
  uploading,
  imageUrl,
  onTitleChange,
  onDescriptionChange,
  onCategoryIdChange,
  onBrandIdChange,
  onAudienceChange,
  onSizeChange,
  onColorChange,
  onPriceChange,
  onQuantityChange,
  onSkuChange,
  onFileChange,
  onCreateProduct,
  onUploadImage,
}: Props) {
  return (
    <>
      <h1 className={styles.sectionTitle}>Новый товар</h1>

      <div className={styles.card}>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Название</span>
            <input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span>SKU</span>
            <input
              value={sku}
              onChange={(event) => onSkuChange(event.target.value)}
              className={styles.input}
            />
          </label>

          <label className={styles.fieldFull}>
            <span>Описание</span>
            <textarea
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              className={styles.textarea}
              rows={5}
            />
          </label>

          <label className={styles.field}>
            <span>Категория</span>
            <select
              disabled={loadingLists}
              value={categoryId}
              onChange={(event) => onCategoryIdChange(Number(event.target.value))}
              className={styles.input}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Бренд</span>
            <select
              disabled={loadingLists}
              value={brandId}
              onChange={(event) => onBrandIdChange(Number(event.target.value))}
              className={styles.input}
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Для кого</span>
            <select
              value={audience}
              onChange={(event) => onAudienceChange(event.target.value as Audience)}
              className={styles.input}
            >
              <option value="MEN">Для него</option>
              <option value="WOMEN">Для нее</option>
              <option value="UNISEX">Для всех</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Размер</span>
            <input
              value={size}
              onChange={(event) => onSizeChange(event.target.value)}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span>Цвет</span>
            <input
              value={color}
              onChange={(event) => onColorChange(event.target.value)}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span>Цена (₽)</span>
            <input
              type="number"
              value={price}
              onChange={(event) => onPriceChange(Number(event.target.value))}
              className={styles.input}
              min={0}
            />
          </label>

          <label className={styles.field}>
            <span>Кол-во</span>
            <input
              type="number"
              value={quantity}
              onChange={(event) => onQuantityChange(Number(event.target.value))}
              className={styles.input}
              min={0}
            />
          </label>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCreateProduct}
            disabled={submitting}
            className={styles.primaryBtn}
          >
            {submitting ? "Создаём…" : "Создать товар"}
          </button>

          {createdProductId ? (
            <span className={styles.muted}>ID: {createdProductId}</span>
          ) : null}
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.subtitle}>Фото</h2>

        {!createdProductId ? (
          <div className={styles.muted}>Сначала создай товар</div>
        ) : (
          <>
            <div className={styles.uploadRow}>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              />

              <button
                type="button"
                onClick={onUploadImage}
                disabled={uploading}
                className={styles.secondaryBtn}
              >
                {uploading ? "Загружаем…" : "Загрузить"}
              </button>
            </div>

            {imageUrl ? (
              <div className={styles.preview}>
                <img src={imageUrl} alt="" className={styles.previewImg} />

                <div className={styles.previewMeta}>
                  <div className={styles.muted}>Загружено</div>
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                  >
                    Открыть картинку
                  </a>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}