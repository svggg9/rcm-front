  "use client";

  import Link from "next/link";
  import { useMemo, useState } from "react";
  import Image from "next/image";

  import styles from "../Seller.module.css";
  import { EmptyState } from "../../components/ui/EmptyState";
  import { StatusBadge } from "../../components/ui/StatusBadge";
  import { useRouter } from "next/navigation";
  import { apiFetch, API_URL } from "../../lib/api";

  import type { SellerProductListItem } from "../types";

  type Props = {
    products: SellerProductListItem[];
    loading: boolean;
    refreshing: boolean;
    onRefresh: () => void;
  };

  type ProductFilter = "ALL" | "ACTIVE" | "MODERATION" | "NEEDS_REVISION" | "DRAFT";

  export function SellerProductsTab({ products, loading }: Props) {
    const [filter, setFilter] = useState<ProductFilter>("ALL");

    const activeCount = products.filter((product) => product.status === "ACTIVE").length;
    const draftCount = products.filter((product) => product.status === "DRAFT").length;
    const moderationCount = products.filter((product) => product.status === "MODERATION").length;
    const revisionCount = products.filter((product) => product.status === "NEEDS_REVISION").length;

    const filteredProducts = useMemo(() => {
      if (filter === "ACTIVE") {
        return products.filter((product) => product.status === "ACTIVE");
      }

      if (filter === "DRAFT") {
        return products.filter((product) => product.status === "DRAFT");
      }

      if (filter === "MODERATION") {
        return products.filter((product) => product.status === "MODERATION");
      }

      if (filter === "NEEDS_REVISION") {
        return products.filter((product) => product.status === "NEEDS_REVISION");
      }

      return products;
    }, [filter, products]);

    const router = useRouter();
    const [creating, setCreating] = useState(false);

    async function createDraftProduct() {
      if (creating) return;

      setCreating(true);

      try {
        const response = await apiFetch(`${API_URL}/api/seller/products/draft`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Не удалось создать черновик");
        }

        const id: number = await response.json();
        router.push(`/seller/products/${id}/edit`);
      } finally {
        setCreating(false);
      }
    }

    return (
      <div className={styles.productsPage}>
        <div className={styles.productsHeader}>
          <div>
            <h1 className={styles.sectionTitleNoMargin}>Товары</h1>
            <p className={styles.productsHint}>
              Управляй карточками, ценами, остатками и публикацией товаров.
            </p>
          </div>

        <button
          type="button"
          onClick={createDraftProduct}
          disabled={creating}
          className={styles.createProductLink}
        >
          {creating ? "Создаём…" : "Добавить товар"}
        </button>
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
            active={filter === "MODERATION"}
            label="На модерации"
            value={moderationCount}
            onClick={() => setFilter("MODERATION")}
          />

          <FilterButton
            active={filter === "NEEDS_REVISION"}
            label="На доработке"
            value={revisionCount}
            onClick={() => setFilter("NEEDS_REVISION")}
          />

          <FilterButton
            active={filter === "DRAFT"}
            label="Черновики"
            value={draftCount}
            onClick={() => setFilter("DRAFT")}
          />
        </div>

        {loading ? (
          <EmptyState title="Загружаем товары…" />
        ) : products.length === 0 ? (
          <EmptyState
            title="Товаров пока нет"
            text="Создай первую карточку товара, добавь фото и отправь её на публикацию."
            actions={
            <button
              type="button"
              onClick={createDraftProduct}
              disabled={creating}
              className={styles.createProductLink}
            >
              {creating ? "Создаём…" : "Добавить товар"}
            </button>
            }
          />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="Товаров нет"
            text="По выбранному фильтру ничего не найдено."
          />
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

  function ProductRow({ product }: { product: SellerProductListItem }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const mainImage = product.coverImage;
    const minPrice = product.minPrice ?? 0;
    const totalStock = product.totalStock ?? 0;
    const variantsCount = product.variantsCount ?? 0;

    return (
      <article className={styles.productRow}>
        <div className={styles.productImageBox}>
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.title}
              className={styles.productImage}
              width={160}
              height={200}
            />
          ) : (
            <div className={styles.productImagePlaceholder}>Изображение отсутствует</div>
          )}
        </div>

        <div className={styles.productMain}>
          <div className={styles.productTitleRow}>
            <h2>{product.title || "Новый товар"}</h2>
            <StatusBadge tone={getProductStatusTone(product.status)}>
              {formatProductStatus(product.status)}
            </StatusBadge>
          </div>

          <div className={styles.productMeta}>
            <span>ID: {product.id}</span>
            <span>•</span>
            <span>{product.categoryName || "Категория не определена"}</span>
            <span>•</span>
            <span>{product.brandName || "Бренд не указан"}</span>
          </div>

          <div className={styles.productTags}>
            <span>{variantsCount} вариант(ов)</span>
            <span>Остаток: {Number(totalStock).toLocaleString()}</span>
          </div>
        </div>

        <div className={styles.productRightSide}>
          <div className={styles.productInlineFields}>
            <div className={styles.inlineFieldWrap}>
              <div className={styles.inlineFieldLabel}>Цена от, ₽</div>
              <div className={styles.inlineReadonlyField}>
                <b>{Number(minPrice).toLocaleString()}</b>
              </div>
            </div>

            <div className={styles.inlineFieldWrap}>
              <div className={styles.inlineFieldLabel}>Количество, ед.</div>
              <div className={styles.inlineReadonlyField}>
                <b>{Number(totalStock).toLocaleString()}</b>
              </div>
            </div>
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

  function getProductStatusTone(status: SellerProductListItem["status"]) {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "MODERATION":
        return "warning";
      case "NEEDS_REVISION":
        return "warning";
      case "BLOCKED":
      case "ARCHIVED":
        return "danger";
      default:
        return "default";
    }
  }

  function formatProductStatus(status: SellerProductListItem["status"]) {
    switch (status) {
      case "DRAFT":
        return "Черновик";
      case "MODERATION":
        return "На модерации";
      case "NEEDS_REVISION":
        return "На доработке";
      case "ACTIVE":
        return "Активен";
      case "ARCHIVED":
        return "Архив";
      case "BLOCKED":
        return "Заблокирован";
      default:
        return "Черновик";
    }
  }