"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import styles from "./SellerProductsTab.module.css";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { apiFetch, API_URL } from "../../lib/api";

import type { SellerProductListItem } from "../types";

type Props = {
  products: SellerProductListItem[];
  loading: boolean;
};

type ProductFilter =
  | "ALL"
  | "ACTIVE"
  | "MODERATION"
  | "NEEDS_REVISION"
  | "DRAFT"
  | "ARCHIVED";

export function SellerProductsTab({ products, loading }: Props) {
  const router = useRouter();

  const [items, setItems] = useState(products);
  const [filter, setFilter] = useState<ProductFilter>("ALL");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setItems(products);
  }, [products]);

  const activeCount = items.filter((product) => product.status === "ACTIVE").length;
  const draftCount = items.filter((product) => product.status === "DRAFT").length;
  const moderationCount = items.filter((product) => product.status === "MODERATION").length;
  const revisionCount = items.filter((product) => product.status === "NEEDS_REVISION").length;
  const archivedCount = items.filter((product) => product.status === "ARCHIVED").length;

  const filteredProducts = useMemo(() => {
    if (filter === "ACTIVE") {
      return items.filter((product) => product.status === "ACTIVE");
    }

    if (filter === "DRAFT") {
      return items.filter((product) => product.status === "DRAFT");
    }

    if (filter === "MODERATION") {
      return items.filter((product) => product.status === "MODERATION");
    }

    if (filter === "NEEDS_REVISION") {
      return items.filter((product) => product.status === "NEEDS_REVISION");
    }

    if (filter === "ARCHIVED") {
      return items.filter((product) => product.status === "ARCHIVED");
    }

    return items;
  }, [filter, items]);

  async function createDraftProduct() {
    if (creating) return;

    setCreating(true);

    try {
      const brandsResponse = await apiFetch(`${API_URL}/api/seller/brands`);

      if (!brandsResponse.ok) {
        throw new Error("Не удалось проверить производителя");
      }

      const brands = await brandsResponse.json();

      if (!Array.isArray(brands) || brands.length === 0) {
        router.push("/seller?tab=brand");
        return;
      }

      const response = await apiFetch(`${API_URL}/api/seller/products/draft`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось создать черновик");
      }

      const id: number = await response.json();
      router.push(`/seller/products/${id}/edit`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось создать товар"
      );
    } finally {
      setCreating(false);
    }
  }

  async function archiveProduct(productId: number) {
    try {
      const response = await apiFetch(
        `${API_URL}/api/seller/products/${productId}/archive`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось перенести товар в архив");
      }

      setItems((current) =>
        current.map((product) =>
          product.id === productId
            ? {
                ...product,
                status: "ARCHIVED",
              }
            : product
        )
      );

      toast.success("Товар перенесён в архив");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось перенести товар в архив"
      );
    }
  }

  async function copyProduct(productId: number) {
  try {
    const response = await apiFetch(
      `${API_URL}/api/seller/products/${productId}/copy`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "Не удалось скопировать товар");
    }

    const newProductId: number = await response.json();

    toast.success("Копия товара создана");
    router.push(`/seller/products/${newProductId}/edit`);
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Не удалось скопировать товар"
    );
  }
  }

  async function deleteProduct(productId: number) {
  try {
    const response = await apiFetch(
      `${API_URL}/api/seller/products/${productId}/delete`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "Не удалось удалить товар");
    }

    setItems((current) => current.filter((product) => product.id !== productId));

    toast.success("Товар удалён");
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Не удалось удалить товар"
    );
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
          value={items.length}
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

        <FilterButton
          active={filter === "ARCHIVED"}
          label="Архив"
          value={archivedCount}
          onClick={() => setFilter("ARCHIVED")}
        />
      </div>

      {loading ? (
        <EmptyState title="Загружаем товары…" />
      ) : items.length === 0 ? (
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
            <ProductRow
              key={product.id}
              product={product}
              onArchive={archiveProduct}
              onCopy={copyProduct}
              onDelete={deleteProduct}
            />
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

function ProductRow({
    product,
    onArchive,
    onCopy,
    onDelete,
  }: {
    product: SellerProductListItem;
    onArchive: (productId: number) => Promise<void>;
    onCopy: (productId: number) => Promise<void>;
    onDelete: (productId: number) => Promise<void>;
  }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const mainImage = product.coverImage;
  const minPrice = product.minPrice ?? 0;
  const totalStock = product.totalStock ?? 0;
  const variantsCount = product.variantsCount ?? 0;
  const archived = product.status === "ARCHIVED";

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
          <div className={styles.productImagePlaceholder}>
            Изображение отсутствует
          </div>
        )}
      </div>

      <div className={styles.productMain}>
        <div className={styles.productTitleRow}>
          <h2>{product.title || "Без названия"}</h2>
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
          {product.status === "ACTIVE" ? (
            <Link
              href={`/product/${product.id}`}
              target="_blank"
              className={styles.openProductLink}
            >
              Открыть
            </Link>
          ) : (
            <Link
              href={`/seller/products/${product.id}/edit`}
              className={styles.openProductLink}
            >
              Редактировать
            </Link>
          )}

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
                {product.status === "ACTIVE" ? (
                  <Link
                    href={`/seller/products/${product.id}/edit`}
                    className={styles.openProductLink}
                  >
                    Редактировать
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void onCopy(product.id);
                  }}
                >
                  Скопировать
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void onArchive(product.id);
                  }}
                  disabled={archived}
                >
                  {archived ? "В архиве" : "Перенести в архив"}
                </button>

                <button
                  type="button"
                  className={styles.productMenuDanger}
                  onClick={() => {
                    setMenuOpen(false);
                    void onDelete(product.id);
                  }}
                  disabled={product.status === "ACTIVE" || product.status === "MODERATION"}
                >
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
