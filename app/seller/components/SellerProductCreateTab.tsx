"use client";

import Link from "next/link";

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
  stockTrackingEnabled: boolean;
  onStockTrackingEnabledChange: (value: boolean) => void;
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
  file,
  uploading,
  imageUrl,
  stockTrackingEnabled,
  onStockTrackingEnabledChange,
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
  const productCreated = Boolean(createdProductId);

  return (
    <div className={styles.createPage}>
      <div className={styles.createHero}>
        <div>
          <div className={styles.kicker}>Кабинет продавца</div>
          <h1 className={styles.createTitle}>Добавление товара</h1>
          <p className={styles.createHint}>
            Заполни базовые данные и создай черновик. После создания лучше перейти
            в полноценную страницу редактирования, чтобы добавить фото, варианты и габариты.
          </p>
        </div>

        <div className={styles.createStatusCard}>
          <div className={productCreated ? styles.statusDotDone : styles.statusDot} />
          <div>
            <div className={styles.statusTitle}>
              {productCreated ? "Товар создан" : "Черновик товара"}
            </div>
            <div className={styles.statusSub}>
              {productCreated ? `ID товара: ${createdProductId}` : "Создай товар, чтобы открыть редактор"}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.createLayout}>
        <main className={styles.createContent}>
          <section className={styles.createCard}>
            <CardHeader
              title="Основная информация"
              hint="Название, категория, бренд и описание товара."
            />

            <div className={styles.formGrid}>
              <label className={styles.fieldFull}>
                <span className={styles.required}>Название товара</span>
                <input
                  value={title}
                  onChange={(event) => onTitleChange(event.target.value)}
                  className={styles.createInput}
                  placeholder="Например: кроссовки GEL-1130 White/Pure Silver"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.required}>Категория</span>
                <select
                  disabled={loadingLists}
                  value={categoryId}
                  onChange={(event) =>
                    onCategoryIdChange(event.target.value ? Number(event.target.value) : "")
                  }
                  className={styles.createInput}
                >
                  <option value="">Выбери категорию</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.required}>Бренд</span>
                <select
                  disabled={loadingLists}
                  value={brandId}
                  onChange={(event) =>
                    onBrandIdChange(event.target.value ? Number(event.target.value) : "")
                  }
                  className={styles.createInput}
                >
                  <option value="">Выбери бренд</option>
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
                  className={styles.createInput}
                >
                  <option value="MEN">Для него</option>
                  <option value="WOMEN">Для неё</option>
                  <option value="UNISEX">Унисекс</option>
                </select>
              </label>

              <label className={styles.fieldFull}>
                <span className={styles.required}>Описание</span>
                <textarea
                  value={description}
                  onChange={(event) => onDescriptionChange(event.target.value)}
                  className={styles.createTextarea}
                  rows={7}
                  placeholder="Опиши материал, назначение, комплектацию, особенности товара и преимущества для покупателя."
                />
              </label>
            </div>
          </section>

          <section className={styles.createCard}>
            <CardHeader
              title="Первый вариант"
              hint="Минимальные данные для создания первой товарной позиции."
            />

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.required}>Размер</span>
                <input
                  value={size}
                  onChange={(event) => onSizeChange(event.target.value)}
                  className={styles.createInput}
                  placeholder="Например: M, 42, 700C"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.required}>Цвет</span>
                <input
                  value={color}
                  onChange={(event) => onColorChange(event.target.value)}
                  className={styles.createInput}
                  placeholder="Например: белый"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.required}>Цена, ₽</span>
                <input
                  type="number"
                  value={price}
                  onChange={(event) => onPriceChange(Number(event.target.value))}
                  className={styles.createInput}
                  min={0}
                  placeholder="0"
                />
              </label>

              <label className={styles.fieldFull}>
                <span>Учет остатков</span>

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={stockTrackingEnabled}
                    onChange={(event) => onStockTrackingEnabledChange(event.target.checked)}
                  />
                  <span>Учитывать количество товара</span>
                </label>

                <div className={styles.fieldHint}>
                  {stockTrackingEnabled
                    ? "Покупатели смогут заказать только доступное количество."
                    : "Товар можно будет покупать без ограничения по остатку."}
                </div>
              </label>

              {stockTrackingEnabled ? (
                <label className={styles.field}>
                  <span>Количество</span>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(event) => onQuantityChange(Number(event.target.value))}
                    className={styles.createInput}
                    min={0}
                    placeholder="0"
                  />
                </label>
              ) : (
                <div className={styles.field}>
                  <span>Количество</span>
                  <div className={styles.unlimitedBox}>∞ Без учета остатков</div>
                </div>
              )}

              <label className={styles.fieldFull}>
                <span className={styles.required}>SKU</span>
                <input
                  value={sku}
                  onChange={(event) => onSkuChange(event.target.value)}
                  className={styles.createInput}
                  placeholder="Например: ASICS-GEL1130-WHT-42"
                />
              </label>
            </div>

            <div className={styles.createActions}>
              <button
                type="button"
                onClick={onCreateProduct}
                disabled={submitting || productCreated}
                className={styles.createPrimaryBtn}
              >
                {submitting ? "Создаём товар…" : productCreated ? "Товар создан" : "Создать товар"}
              </button>

              {productCreated ? (
                <Link
                  href={`/seller/products/${createdProductId}/edit`}
                  className={styles.createSecondaryBtn}
                >
                  Перейти к редактированию
                </Link>
              ) : (
                <span className={styles.mutedText}>После создания появится страница редактирования.</span>
              )}
            </div>
          </section>

          <section className={styles.createCard}>
            <CardHeader
              title="Фото товара"
              hint="Для массовой загрузки и сортировки фото перейди в редактор товара."
            />

            {!productCreated ? (
              <div className={styles.lockedBox}>
                <div className={styles.lockedIcon}>Фото</div>
                <div>
                  <b>Сначала создай товар</b>
                  <p>Загрузка изображений доступна после появления ID товара.</p>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.uploadPanel}>
                  <label className={styles.fileLabel}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                    />

                    <div>
                      <div className={styles.fileName}>
                        {file ? file.name : "Выбери изображение товара"}
                      </div>
                      <div className={styles.fileHint}>
                        {file ? "Файл готов к загрузке" : "PNG, JPG, WEBP"}
                      </div>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={onUploadImage}
                    disabled={uploading || !file}
                    className={styles.createSecondaryBtn}
                  >
                    {uploading ? "Загружаем…" : "Загрузить фото"}
                  </button>
                </div>

                {imageUrl ? (
                  <div className={styles.preview}>
                    <img src={imageUrl} alt="Фото товара" className={styles.previewImg} />

                    <div className={styles.previewMeta}>
                      <b>Фото загружено</b>
                      <a href={imageUrl} target="_blank" rel="noreferrer">
                        Открыть изображение
                      </a>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </main>

        <aside className={styles.createSidebar}>
          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>Этапы</div>

            <Step title="Основная информация" text="Название, описание, категория" number={1} done />
            <Step title="Первый вариант" text="Размер, цвет, цена и SKU" number={2} done />
            <Step
              title="Редактор товара"
              text={productCreated ? "Можно открыть полную карточку" : "Доступен после создания"}
              number={3}
              done={productCreated}
            />
            <Step
              title="Фото и габариты"
              text="Массовая загрузка, сортировка, доставка"
              number={4}
              done={productCreated}
            />

            {productCreated ? (
              <Link
                href={`/seller/products/${createdProductId}/edit`}
                className={styles.openProductLink}
              >
                Открыть редактор
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function CardHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className={styles.createCardHeader}>
      <h2>{title}</h2>
      <p>{hint}</p>
    </div>
  );
}

function Step({
  number,
  title,
  text,
  done,
}: {
  number: number;
  title: string;
  text: string;
  done: boolean;
}) {
  return (
    <div className={done ? styles.stepDone : styles.stepMuted}>
      <span>{number}</span>
      <div>
        <b>{title}</b>
        <p>{text}</p>
      </div>
    </div>
  );
}