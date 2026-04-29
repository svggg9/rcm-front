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
  file,
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
  const productCreated = Boolean(createdProductId);

  return (
    <div className={styles.createPage}>
      <div className={styles.createHero}>
        <div>
          <div className={styles.kicker}>Кабинет продавца</div>
          <h1 className={styles.createTitle}>Добавление товара</h1>
          <p className={styles.createHint}>
            Заполни карточку товара, создай товар, затем добавь фото. После этого товар можно
            отправить на модерацию или опубликовать.
          </p>
        </div>

        <div className={styles.createStatusCard}>
          <div className={productCreated ? styles.statusDotDone : styles.statusDot} />
          <div>
            <div className={styles.statusTitle}>
              {productCreated ? "Товар создан" : "Черновик товара"}
            </div>
            <div className={styles.statusSub}>
              {productCreated
                ? `ID товара: ${createdProductId}`
                : "Фото станет доступно после создания"}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.createLayout}>
        <aside className={styles.createSidebar}>
          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>Этапы</div>

            <Step title="Основная информация" text="Название, описание, категория" number={1} done />
            <Step title="Характеристики" text="Аудитория, размер, цвет" number={2} done />
            <Step title="Цена и остатки" text="Цена, количество, SKU" number={3} done />
            <Step
              title="Фото товара"
              text={productCreated ? "Можно загрузить изображение" : "Сначала создай товар"}
              number={4}
              done={productCreated}
            />
          </div>
        </aside>

        <main className={styles.createContent}>
          <section className={styles.createCard}>
            <CardHeader
              title="Основная информация"
              hint="То, что покупатель увидит в каталоге и карточке товара."
            />

            <div className={styles.formGrid}>
              <label className={styles.fieldFull}>
                <span>Название товара</span>
                <input
                  value={title}
                  onChange={(event) => onTitleChange(event.target.value)}
                  className={styles.createInput}
                  placeholder="Например: Карбоновый шоссейный велосипед RCM Sport"
                />
              </label>

              <label className={styles.field}>
                <span>Категория</span>
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
                <span>Бренд</span>
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

              <label className={styles.fieldFull}>
                <span>Описание</span>
                <textarea
                  value={description}
                  onChange={(event) => onDescriptionChange(event.target.value)}
                  className={styles.createTextarea}
                  rows={6}
                  placeholder="Опиши материал, назначение, комплектацию, особенности товара и преимущества для покупателя."
                />
              </label>
            </div>
          </section>

          <section className={styles.createCard}>
            <CardHeader
              title="Характеристики"
              hint="Минимальный набор параметров для первой версии карточки."
            />

            <div className={styles.formGrid}>
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

              <label className={styles.field}>
                <span>Размер</span>
                <input
                  value={size}
                  onChange={(event) => onSizeChange(event.target.value)}
                  className={styles.createInput}
                  placeholder="Например: M, L, 42, 700C"
                />
              </label>

              <label className={styles.field}>
                <span>Цвет</span>
                <input
                  value={color}
                  onChange={(event) => onColorChange(event.target.value)}
                  className={styles.createInput}
                  placeholder="Например: чёрный"
                />
              </label>
            </div>
          </section>

          <section className={styles.createCard}>
            <CardHeader
              title="Цена и остатки"
              hint="Эти данные нужны для создания первого варианта товара."
            />

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Цена, ₽</span>
                <input
                  type="number"
                  value={price}
                  onChange={(event) => onPriceChange(Number(event.target.value))}
                  className={styles.createInput}
                  min={0}
                  placeholder="0"
                />
              </label>

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

              <label className={styles.fieldFull}>
                <span>SKU</span>
                <input
                  value={sku}
                  onChange={(event) => onSkuChange(event.target.value)}
                  className={styles.createInput}
                  placeholder="Например: RCM-BIKE-700C-BLK-M"
                />
              </label>
            </div>

            <div className={styles.createActions}>
              <button
                type="button"
                onClick={onCreateProduct}
                disabled={submitting}
                className={styles.createPrimaryBtn}
              >
                {submitting ? "Создаём товар…" : productCreated ? "Обновить данные" : "Создать товар"}
              </button>

              <span className={productCreated ? styles.successText : styles.mutedText}>
                {productCreated
                  ? "Товар создан. Можно загрузить фото."
                  : "После создания появится ID товара."}
              </span>
            </div>
          </section>

          <section className={styles.createCard}>
            <CardHeader
              title="Фото товара"
              hint="Главное фото будет отображаться в каталоге и карточке товара."
            />

            {!productCreated ? (
              <div className={styles.lockedBox}>
                <div className={styles.lockedIcon}>Фото</div>
                <div>
                  <b>Сначала создай товар</b>
                  <p>Загрузка изображения доступна только после появления ID товара.</p>
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