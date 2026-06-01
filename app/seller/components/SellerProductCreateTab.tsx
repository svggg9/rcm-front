"use client";

import styles from "../Seller.module.css";
import { toast } from "sonner";

type Option = {
  id: number;
  name: string;
  hex?: string | null;
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

  price: number;
  quantity: number;
  sku: string;
  submitting: boolean;

  stockTrackingEnabled: boolean;

  sizes: Option[];
  colors: Option[];
  sizeId: number | "";
  colorId: number | "";

  newBrandName: string;
  creatingBrand: boolean;

  onNewBrandNameChange: (value: string) => void;
  onCreateBrand: () => void;

  onSizeIdChange: (value: number | "") => void;
  onColorIdChange: (value: number | "") => void;
  onStockTrackingEnabledChange: (value: boolean) => void;

  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryIdChange: (value: number | "") => void;
  onBrandIdChange: (value: number | "") => void;
  onAudienceChange: (value: Audience) => void;

  onPriceChange: (value: number) => void;
  onQuantityChange: (value: number) => void;
  onSkuChange: (value: string) => void;

  onCreateProduct: () => void;
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
  sizes,
  colors,
  sizeId,
  colorId,
  price,
  quantity,
  sku,
  submitting,
  stockTrackingEnabled,
  newBrandName,
  creatingBrand,
  onNewBrandNameChange,
  onCreateBrand,
  onSizeIdChange,
  onColorIdChange,
  onStockTrackingEnabledChange,
  onTitleChange,
  onDescriptionChange,
  onCategoryIdChange,
  onBrandIdChange,
  onAudienceChange,
  onPriceChange,
  onQuantityChange,
  onSkuChange,
  onCreateProduct,
}: Props) {
  function handleCreateProduct() {
    if (!title.trim()) {
      toast.error("Введите название товара");
      return;
    }

    if (categoryId === "") {
      toast.error("Выберите категорию");
      return;
    }

    if (brandId === "") {
      toast.error("Выберите бренд");
      return;
    }

    if (!description.trim()) {
      toast.error("Введите описание товара");
      return;
    }

    if (sizeId === "") {
      toast.error("Выберите размер");
      return;
    }

    if (colorId === "") {
      toast.error("Выберите цвет");
      return;
    }

    if (price <= 0) {
      toast.error("Цена должна быть больше 0");
      return;
    }

    if (stockTrackingEnabled && quantity <= 0) {
      toast.error("Количество должно быть больше 0");
      return;
    }

    if (!sku.trim()) {
      toast.error("Введите SKU");
      return;
    }

    onCreateProduct();
  }

  return (
    <div className={styles.createPage}>
      <div className={styles.createHero}>
        <div>
          <div className={styles.kicker}>Кабинет продавца</div>
          <h1 className={styles.createTitle}>Добавление товара</h1>
          <p className={styles.createHint}>
            Создай черновик товара. После этого откроется полноценный редактор:
            фото, варианты, габариты и публикация будут на следующем экране.
          </p>
        </div>

        <div className={styles.createStatusCard}>
          <div className={styles.statusDot} />
          <div>
            <div className={styles.statusTitle}>Черновик товара</div>
            <div className={styles.statusSub}>
              После создания откроется редактор
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
                    onCategoryIdChange(
                      event.target.value ? Number(event.target.value) : ""
                    )
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
                    onBrandIdChange(
                      event.target.value ? Number(event.target.value) : ""
                    )
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

              <div className={styles.brandCreateRow}>
                <input
                  value={newBrandName}
                  onChange={(event) => onNewBrandNameChange(event.target.value)}
                  className={styles.createInput}
                  placeholder="Добавить свой бренд"
                />

                <button
                  type="button"
                  onClick={onCreateBrand}
                  disabled={creatingBrand || !newBrandName.trim()}
                  className={styles.createSecondaryBtn}
                >
                  {creatingBrand ? "Добавляем…" : "Добавить"}
                </button>
              </div>

              <label className={styles.field}>
                <span>Для кого</span>
                <select
                  value={audience}
                  onChange={(event) =>
                    onAudienceChange(event.target.value as Audience)
                  }
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
                <select
                  disabled={loadingLists}
                  value={sizeId}
                  onChange={(event) =>
                    onSizeIdChange(
                      event.target.value ? Number(event.target.value) : ""
                    )
                  }
                  className={styles.createInput}
                >
                  <option value="">Выбери размер</option>
                  {sizes.map((size) => (
                    <option key={size.id} value={size.id}>
                      {size.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.required}>Цвет</span>
                <select
                  disabled={loadingLists}
                  value={colorId}
                  onChange={(event) =>
                    onColorIdChange(
                      event.target.value ? Number(event.target.value) : ""
                    )
                  }
                  className={styles.createInput}
                >
                  <option value="">Выбери цвет</option>
                  {colors.map((color) => (
                    <option key={color.id} value={color.id}>
                      {color.name}
                    </option>
                  ))}
                </select>
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
                    onChange={(event) =>
                      onStockTrackingEnabledChange(event.target.checked)
                    }
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
                    onChange={(event) =>
                      onQuantityChange(Number(event.target.value))
                    }
                    className={styles.createInput}
                    min={0}
                    placeholder="0"
                  />
                </label>
              ) : (
                <div className={styles.field}>
                  <span>Количество</span>
                  <div className={styles.unlimitedBox}>
                    ∞ Без учета остатков
                  </div>
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
                onClick={handleCreateProduct}
                disabled={submitting}
                className={styles.createPrimaryBtn}
              >
                {submitting
                  ? "Создаём черновик…"
                  : "Создать и перейти к редактору"}
              </button>

              <span className={styles.mutedText}>
                Фото, дополнительные варианты и габариты добавишь на следующем
                экране.
              </span>
            </div>
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