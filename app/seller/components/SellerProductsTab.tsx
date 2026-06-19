"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./SellerProductsTab.module.css";
import { CabinetTabs, type CabinetTabItem } from "../../components/ui/CabinetTabs";
import { EmptyState } from "../../components/ui/EmptyState";
import { Price } from "../../components/ui/Price";
import { StatusBadge } from "../../components/ui/StatusBadge";

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
  const [items, setItems] = useState(products);
  const [filter, setFilter] = useState<ProductFilter>("ALL");

  useEffect(() => {
    setItems(products);
  }, [products]);

  const activeCount = items.filter((product) => product.status === "ACTIVE").length;
  const draftCount = items.filter((product) => product.status === "DRAFT").length;
  const moderationCount = items.filter((product) => product.status === "MODERATION").length;
  const revisionCount = items.filter((product) => product.status === "NEEDS_REVISION").length;
  const archivedCount = items.filter((product) => product.status === "ARCHIVED").length;
  const productTabs: CabinetTabItem<ProductFilter>[] = [
    { value: "ALL", label: "Все", count: items.length },
    { value: "ACTIVE", label: "Активные", count: activeCount },
    { value: "MODERATION", label: "На модерации", count: moderationCount },
    { value: "NEEDS_REVISION", label: "На доработке", count: revisionCount },
    { value: "DRAFT", label: "Черновики", count: draftCount },
    { value: "ARCHIVED", label: "Архив", count: archivedCount },
  ];

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

  return (
    <div className={styles.productsPage}>
      <div className={styles.productsToolbar}>
        <CabinetTabs
          items={productTabs}
          value={filter}
          onChange={setFilter}
          ariaLabel="Фильтр товаров"
          fullBleedMobile
          pinFirst
          countTone="gold"
          tone="gold"
        />
      </div>

      {loading ? (
        null
      ) : items.length === 0 ? (
        <EmptyState
          title="Товаров пока нет"
          text="Создай первую карточку товара, добавь фото и отправь её на публикацию."
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductRow({
  product,
}: {
  product: SellerProductListItem;
}) {
  const router = useRouter();

  const mainImage = product.coverImage;
  const minPrice = product.minPrice ?? 0;
  const totalStock = product.totalStock ?? 0;
  const variantsCount = product.variantsCount ?? 0;
  const editHref = `/seller/products/${product.id}/edit`;

  function openProductEdit() {
    router.push(editHref);
  }

  return (
    <article
      className={styles.productRow}
      role="button"
      tabIndex={0}
      onClick={openProductEdit}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProductEdit();
        }
      }}
    >
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
        <div className={styles.productStatus}>
          <StatusBadge tone={getProductStatusTone(product.status)}>
            {formatProductStatus(product.status)}
          </StatusBadge>
        </div>

        <div className={styles.productInfo}>
          <h2 className={styles.productTitle}>{product.title || "Без названия"}</h2>

          <div className={styles.productMeta}>
            <span>ID: {product.id}</span>
            {product.categoryName ? (
              <>
                <span>•</span>
                <span>{product.categoryName}</span>
              </>
            ) : null}
          </div>

          <div className={styles.productTags}>
            <span>{variantsCount} вариант(ов)</span>
            <span>Остаток: {Number(totalStock).toLocaleString()}</span>
          </div>
        </div>

        <div className={styles.productState}>
          <div className={styles.productPrice}>
            <Price amount={Number(minPrice)} />
          </div>
        </div>
      </div>

      <span className={styles.productArrow} aria-hidden="true">
        &gt;
      </span>

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
      return "danger";
    case "ARCHIVED":
      return "default";
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
