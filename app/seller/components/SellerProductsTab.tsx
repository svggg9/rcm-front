"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { apiFetch, API_URL } from "../../lib/api";
import styles from "../Seller.module.css";

type SellerProductVariant = {
  id: number;
  size: string;
  color: string;
  price: number;
  availableQuantity: number | null;
  sku: string;
  stockTrackingEnabled?: boolean;
};

type SellerProduct = {
  id: number;
  title: string;
  description: string;
  brand: string | null;
  category: string | null;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  status?: "DRAFT" | "MODERATION" | "ACTIVE" | "ARCHIVED" | "BLOCKED";
  variants: SellerProductVariant[];
  images: string[];
};

type Props = {
  products: SellerProduct[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

type ProductFilter = "ALL" | "ACTIVE" | "DRAFT" | "UNLIMITED";

export function SellerProductsTab({
  products,
  loading,
  refreshing,
  onRefresh,
}: Props) {
  const [filter, setFilter] = useState<ProductFilter>("ALL");

  const activeCount = products.filter((product) => product.status === "ACTIVE").length;
  const draftCount = products.filter((product) => product.status === "DRAFT").length;
  const unlimitedCount = products.filter((product) =>
    product.variants.some((variant) => variant.stockTrackingEnabled === false)
  ).length;

  const filteredProducts = useMemo(() => {
    if (filter === "ACTIVE") {
      return products.filter((product) => product.status === "ACTIVE");
    }

    if (filter === "DRAFT") {
      return products.filter((product) => product.status === "DRAFT");
    }

    if (filter === "UNLIMITED") {
      return products.filter((product) =>
        product.variants.some((variant) => variant.stockTrackingEnabled === false)
      );
    }

    return products;
  }, [filter, products]);

  return (
    <div className={styles.productsPage}>
      <div className={styles.productsHeader}>
        <div>
          <h1 className={styles.sectionTitleNoMargin}>Товары</h1>
          <p className={styles.productsHint}>
            Управляй карточками, ценами, остатками и публикацией товаров.
          </p>
        </div>

        <Link href="/seller?tab=products&mode=create" className={styles.createProductLink}>
          Добавить товар
        </Link>
      </div>

      <div className={styles.productsFilters}>
        <FilterButton
          active={filter === "ALL"}
          label="Всего товаров"
          value={products.length}
          onClick={() => setFilter("ALL")}
        />

        <FilterButton
          active={filter === "ACTIVE"}
          label="Активные"
          value={activeCount}
          onClick={() => setFilter("ACTIVE")}
        />

        <FilterButton
          active={filter === "DRAFT"}
          label="Черновики"
          value={draftCount}
          onClick={() => setFilter("DRAFT")}
        />

        <FilterButton
          active={filter === "UNLIMITED"}
          label="Без учета остатков"
          value={unlimitedCount}
          onClick={() => setFilter("UNLIMITED")}
        />
      </div>

      {loading ? (
        <div className={styles.empty}>Загружаем товары…</div>
      ) : products.length === 0 ? (
        <div className={styles.productsEmpty}>
          <div className={styles.productsEmptyIcon}>+</div>
          <h2>Товаров пока нет</h2>
          <p>Создай первую карточку товара, добавь фото и отправь её на публикацию.</p>

          <Link
            href="/seller?tab=products&mode=create"
            className={styles.createProductLink}
          >
            Добавить товар
          </Link>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className={styles.empty}>По выбранному фильтру товаров нет.</div>
      ) : (
        <div className={styles.productsList}>
          {filteredProducts.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  label,
  value,
  onClick,
}: {
  active: boolean;
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.productsFilterCard} ${
        active ? styles.productsFilterCardActive : ""
      }`}
    >
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}

function ProductRow({ product }: { product: SellerProduct }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const mainImage = product.images?.[0] ?? null;
  const firstVariant = product.variants?.[0] ?? null;

  const [price, setPrice] = useState(firstVariant?.price ?? 0);
  const [quantity, setQuantity] = useState(firstVariant?.availableQuantity ?? 0);

  const hasUnlimitedStock = product.variants.some(
    (variant) => variant.stockTrackingEnabled === false
  );

  return (
    <article className={styles.productRow}>
      <div className={styles.productImageBox}>
        {mainImage ? (
          <img src={mainImage} alt={product.title} className={styles.productImage} />
        ) : (
          <div className={styles.productImagePlaceholder}>Изображение отсутствует</div>
        )}
      </div>

      <div className={styles.productMain}>
        <div className={styles.productTitleRow}>
          <h2>{product.title || "Новый товар"}</h2>
          <StatusBadge status={product.status ?? "DRAFT"} />
        </div>

        <div className={styles.productMeta}>
          <span>SKU: {firstVariant?.sku || "не заполнен"}</span>
          <span>•</span>
          <span>{product.category || "Категория не определена"}</span>
          <span>•</span>
          <span>{product.brand || "Бренд не указан"}</span>
        </div>

        <div className={styles.productTags}>
          <span>{formatAudience(product.audience)}</span>
          <span>{product.variants.length} вариант(ов)</span>
          <span>{hasUnlimitedStock ? "∞ Без учета остатков" : "Остатки включены"}</span>
        </div>
      </div>

      <div className={styles.productRightSide}>
        <div className={styles.productInlineFields}>
          <InlineEditableNumber
            label="Цена, ₽"
            value={price}
            onChange={setPrice}
            onCommit={(value) => {
              if (!firstVariant?.id) return;

              void apiFetch(`${API_URL}/api/seller/products/${product.id}/variants/bulk`, {
                method: "PATCH",
                body: JSON.stringify({ price: value }),
              }).catch(console.error);
            }}
          />

          {hasUnlimitedStock ? (
            <div className={styles.inlineFieldWrap}>
              <div className={styles.inlineFieldLabel}>Количество, ед.</div>

              <div className={styles.inlineReadonlyField}>
                <b>∞</b>
              </div>
            </div>
          ) : (
            <InlineEditableNumber
              label="Количество, ед."
              value={quantity}
              onChange={setQuantity}
              onCommit={(value) => {
                if (!firstVariant?.id) return;

                void apiFetch(
                  `${API_URL}/api/seller/products/${product.id}/variants/bulk`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({ stockQuantity: value }),
                  }
                ).catch(console.error);
              }}
            />
          )}
        </div>

        <div className={styles.productActions}>
          <Link
            href={`/product/${product.id}`}
            target="_blank"
            className={styles.openProductLink}
          >
            Открыть
          </Link>

          <div className={styles.productMenuWrap}>
            <button
              type="button"
              className={styles.productMenuBtn}
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Действия с товаром"
            >
              ⋯
            </button>

            {menuOpen ? (
              <div className={styles.productMenu}>
                <Link
                  href={`/seller/products/${product.id}/edit`}
                  className={styles.openProductLink}
                >
                  Редактировать
                </Link>

                <button type="button">Скопировать</button>
                <button type="button">Перенести в архив</button>

                <button type="button" className={styles.productMenuDanger}>
                  Удалить
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function InlineEditableNumber({
  label,
  value,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  function commit() {
    const nextValue = Number(draft);

    if (!Number.isFinite(nextValue) || nextValue < 0) {
      setDraft(String(value));
      setEditing(false);
      return;
    }

    onChange(nextValue);
    onCommit(nextValue);
    setEditing(false);
  }

  return (
    <div className={styles.inlineFieldWrap}>
      <div className={styles.inlineFieldLabel}>{label}</div>

      {editing ? (
        <div className={styles.inlineEditField}>
          <input
            autoFocus
            type="number"
            value={draft}
            min={0}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }

              if (event.key === "Escape") {
                setDraft(String(value));
                setEditing(false);
              }
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          className={styles.inlineValueField}
          onClick={() => {
            setDraft(String(value));
            setEditing(true);
          }}
        >
          <b>{Number(value).toLocaleString()}</b>
        </button>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "DRAFT" | "MODERATION" | "ACTIVE" | "ARCHIVED" | "BLOCKED";
}) {
  const label = {
    DRAFT: "Черновик",
    MODERATION: "На модерации",
    ACTIVE: "Активен",
    ARCHIVED: "Архив",
    BLOCKED: "Заблокирован",
  }[status];

  const className = {
    DRAFT: styles.statusDraft,
    MODERATION: styles.statusModeration,
    ACTIVE: styles.statusActive,
    ARCHIVED: styles.statusArchived,
    BLOCKED: styles.statusBlocked,
  }[status];

  return <span className={`${styles.productStatusBadge} ${className}`}>{label}</span>;
}

function formatAudience(audience?: "MEN" | "WOMEN" | "UNISEX") {
  if (audience === "MEN") return "Для него";
  if (audience === "WOMEN") return "Для неё";
  return "Унисекс";
}