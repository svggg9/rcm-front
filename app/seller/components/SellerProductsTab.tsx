"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./SellerProductsTab.module.css";
import { CabinetTabs, type CabinetTabItem } from "../../components/ui/CabinetTabs";
import { EmptyState } from "../../components/ui/EmptyState";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { ProductListCard } from "../../components/ProductListCard";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import {
  formatProductStatus,
  getProductStatusTone,
} from "../../lib/productStatus";

import type { SellerProductListItem } from "../types";

type Props = {
  products: SellerProductListItem[];
  totalElements?: number;
  loading: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  creatingProduct?: boolean;
  onCreateProduct?: () => void;
};

type ProductFilter =
  | "ALL"
  | "ACTIVE"
  | "MODERATION"
  | "NEEDS_REVISION"
  | "DRAFT"
  | "ARCHIVED";

export function SellerProductsTab({
  products,
  totalElements = products.length,
  loading,
  loadingMore = false,
  onLoadMore,
  creatingProduct = false,
  onCreateProduct,
}: Props) {
  const [items, setItems] = useState(products);
  const [filter, setFilter] = useState<ProductFilter>("ALL");

  useEffect(() => {
    setItems(products);
  }, [products]);

  const allProductsLoaded = !onLoadMore;
  const activeCount = items.filter((product) => product.status === "ACTIVE").length;
  const draftCount = items.filter((product) => product.status === "DRAFT").length;
  const moderationCount = items.filter((product) => product.status === "MODERATION").length;
  const revisionCount = items.filter((product) => product.status === "NEEDS_REVISION").length;
  const archivedCount = items.filter((product) => product.status === "ARCHIVED").length;
  const productTabs: CabinetTabItem<ProductFilter>[] = [
    { value: "ALL", label: "Все", count: totalElements },
    {
      value: "ACTIVE",
      label: "Активные",
      count: allProductsLoaded ? activeCount || undefined : undefined,
    },
    {
      value: "MODERATION",
      label: "Модерация",
      count: allProductsLoaded ? moderationCount || undefined : undefined,
    },
    {
      value: "NEEDS_REVISION",
      label: "Доработка",
      count: allProductsLoaded ? revisionCount || undefined : undefined,
    },
    {
      value: "DRAFT",
      label: "Черновики",
      count: allProductsLoaded ? draftCount || undefined : undefined,
    },
    {
      value: "ARCHIVED",
      label: "Архив",
      count: allProductsLoaded ? archivedCount || undefined : undefined,
    },
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
      {onCreateProduct ? (
        <div className={styles.productSectionTabs}>
          <CabinetTabs<"products" | "create">
            items={[
              { value: "products", label: "Товары" },
              {
                value: "create",
                label: "Создать товар",
              },
            ]}
            value="products"
            onChange={(tab) => {
              if (tab === "create" && !creatingProduct) {
                onCreateProduct();
              }
            }}
            ariaLabel="Товары"
            appearance="line"
          />
        </div>
      ) : null}

      <div className={styles.productsToolbar}>
        <CabinetTabs
          items={productTabs}
          value={filter}
          onChange={setFilter}
          ariaLabel="Фильтр товаров"
          countTone="gold"
          appearance="line"
        />
      </div>

      {loading ? (
        <CabinetSkeleton variant="list" compact />
      ) : items.length === 0 ? (
        <EmptyState
          icon="package"
          tone="gold"
          title="Товаров пока нет"
          text="Создай первую карточку товара, добавь фото и отправь её на публикацию."
        />
      ) : (
        <>
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon="search"
              title="Товаров нет"
              text={
                onLoadMore
                  ? "В загруженной части списка товаров с таким статусом нет."
                  : "По выбранному фильтру ничего не найдено."
              }
            />
          ) : (
            <div className={styles.productsList}>
              {filteredProducts.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))}
            </div>
          )}
          <ListLoadMore
            loaded={items.length}
            total={totalElements}
            loading={loadingMore}
            onLoadMore={onLoadMore}
          />
        </>
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

  const editHref = `/seller/products/${product.id}/edit`;

  function openProductEdit() {
    router.push(editHref);
  }

  return (
    <ProductListCard
      id={product.id}
      title={product.title}
      imageUrl={product.coverImage}
      flushMedia
      brandName={product.brandName}
      categoryName={product.categoryName}
      minPrice={product.minPrice}
      variantsCount={product.variantsCount}
      totalStock={product.totalStock}
      statusLabel={formatProductStatus(product.status)}
      statusTone={getProductStatusTone(product.status)}
      onOpen={openProductEdit}
    />
  );
}
