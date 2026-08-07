"use client";

import { useState } from "react";

import { ProductListCard } from "../../components/ProductListCard";
import { Button } from "../../components/ui/Button";
import { CabinetTabs, type CabinetTabItem } from "../../components/ui/CabinetTabs";
import { EmptyState } from "../../components/ui/EmptyState";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import {
  formatProductStatus,
  getProductStatusTone,
} from "../../lib/productStatus";

import styles from "./AdminProductsTab.module.css";
import type { AdminProductListItem, ProductStatus } from "../types";

type Props = {
  products: AdminProductListItem[];
  totalElements: number;
  status: ProductStatus | "ALL";
  refreshing: boolean;
  loadingMore: boolean;
  actionProductId: number | null;
  statusCounts: Record<ProductStatus | "ALL", number>;
  onStatusChange: (status: ProductStatus | "ALL") => void;
  onRefresh: () => void;
  onLoadMore?: () => void;
  onOpenProduct: (id: number) => void;
  onPrefetchProduct?: (id: number) => void;
  onApprove: (id: number) => Promise<void>;
  onBlock: (id: number) => Promise<void>;
  onUnblock: (id: number) => Promise<void>;
};

type ProductAction = "approve" | "block" | "unblock";

const STATUSES: Array<ProductStatus | "ALL"> = [
  "MODERATION",
  "NEEDS_REVISION",
  "ACTIVE",
  "BLOCKED",
  "DRAFT",
  "ARCHIVED",
  "ALL",
];

function formatDate(value?: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminProductsTab({
  products,
  totalElements,
  status,
  refreshing,
  loadingMore,
  actionProductId,
  statusCounts,
  onStatusChange,
  onRefresh,
  onLoadMore,
  onOpenProduct,
  onPrefetchProduct,
  onApprove,
  onBlock,
  onUnblock,
}: Props) {
  const [pendingAction, setPendingAction] = useState<{
    productId: number;
    action: ProductAction;
  } | null>(null);
  const statusTabs: Array<CabinetTabItem<ProductStatus | "ALL">> = STATUSES.map(
    (value) => ({
      value,
      label: value === "ALL" ? "Все" : formatProductStatus(value),
      count: statusCounts[value] ?? 0,
    })
  );

  async function runAction(
    productId: number,
    action: ProductAction,
    callback: (id: number) => Promise<void>
  ) {
    setPendingAction({ productId, action });
    try {
      await callback(productId);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <CabinetTabs
          items={statusTabs}
          value={status}
          onChange={onStatusChange}
          ariaLabel="Фильтр товаров по статусу"
          countTone="gold"
          appearance="segmented"
        />

        <Button
          type="button"
          variant="secondary"
          loading={refreshing}
          onClick={onRefresh}
          className={styles.refreshButton}
        >
          Обновить
        </Button>
      </div>

      {products.length === 0 ? (
        statusCounts.ALL === 0 ? (
          <EmptyState
            icon="package"
            tone="gold"
            title="Товаров пока нет"
            text="Новые карточки продавцов появятся здесь."
          />
        ) : (
          <EmptyState
            icon="search"
            title="Товаров нет"
            text="По выбранному статусу ничего не найдено."
          />
        )
      ) : (
        <>
          <div className={styles.list}>
            {products.map((product) => {
            const date = formatDate(product.updatedAt);
            const productBusy = actionProductId === product.id;
            const isPending = (action: ProductAction) =>
              pendingAction?.productId === product.id &&
              pendingAction.action === action;

            return (
              <ProductListCard
                key={product.id}
                id={product.id}
                title={product.title}
                imageUrl={product.coverImage}
                brandName={product.brandName || "Без бренда"}
                categoryName={
                  product.categoryName ||
                  product.suggestedCategoryName ||
                  "Без категории"
                }
                suggestedCategory={
                  !product.categoryName && Boolean(product.suggestedCategoryName)
                }
                minPrice={product.minPrice}
                variantsCount={product.variantsCount}
                totalStock={product.totalStock}
                statusLabel={formatProductStatus(product.status)}
                statusTone={getProductStatusTone(product.status)}
                dateLabel={date ? `Обновлён ${date}` : null}
                onOpen={() => onOpenProduct(product.id)}
                onPrefetch={() => onPrefetchProduct?.(product.id)}
                actions={
                  <>
                    {product.status === "MODERATION" ? (
                      <Button
                        type="button"
                        variant="primary"
                        disabled={productBusy}
                        loading={isPending("approve")}
                        onClick={() =>
                          void runAction(product.id, "approve", onApprove)
                        }
                      >
                        Одобрить
                      </Button>
                    ) : null}

                    {product.status === "BLOCKED" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={productBusy}
                        loading={isPending("unblock")}
                        onClick={() =>
                          void runAction(product.id, "unblock", onUnblock)
                        }
                      >
                        Разблокировать
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        disabled={productBusy}
                        loading={isPending("block")}
                        onClick={() =>
                          void runAction(product.id, "block", onBlock)
                        }
                      >
                        Заблокировать
                      </Button>
                    )}
                  </>
                }
              />
            );
            })}
          </div>
          <ListLoadMore
            loaded={products.length}
            total={totalElements}
            loading={loadingMore}
            onLoadMore={onLoadMore}
          />
        </>
      )}
    </section>
  );
}
