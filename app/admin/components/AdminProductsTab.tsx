"use client";

import { AdminProductActions } from "./AdminProductActions";

import { ProductListCard } from "../../components/ProductListCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { AdminSearchForm } from "./AdminSearchForm";
import { useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/Button";
import { CabinetPanel } from "../../components/ui/CabinetPanel";
import type { CabinetTabItem } from "../../components/ui/CabinetTabs";
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
  onBlock: (id: number, reason: string) => Promise<void>;
  onUnblock: (id: number) => Promise<void>;
};

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
  const params = useSearchParams();
  const filtered = Boolean(params.get("q") || params.get("seller"));
  const statusTabs: Array<CabinetTabItem<ProductStatus | "ALL">> = STATUSES.map(
    (value) => ({
      value,
      label: value === "ALL" ? "Все" : formatProductStatus(value),
      count: filtered ? undefined : statusCounts[value] ?? 0,
    })
  );

  return (
    <><SectionHeader title="Товары" large /><AdminSearchForm label="Название товара, артикул или бренд" withSeller /><CabinetPanel
      items={statusTabs}
      value={status}
      onChange={onStatusChange}
      ariaLabel="Фильтр товаров по статусу"
      actions={
        <Button
          type="button"
          variant="secondary"
          loading={refreshing}
          onClick={onRefresh}
          className={styles.refreshButton}
        >
          Обновить
        </Button>
      }
    >
      {products.length === 0 ? (
        statusCounts.ALL === 0 ? (
          <EmptyState
            icon="package"
            tone="gold"
            title="Товаров пока нет"
            text="Новые карточки продавцов появятся здесь"
          />
        ) : (
          <EmptyState
            icon="search"
            title="Товаров нет"
            text="По выбранным условиям ничего не найдено"
          />
        )
      ) : (
        <>
          <div className={styles.list}>
            {products.map((product) => {
            const date = formatDate(product.updatedAt);
            const productBusy = actionProductId === product.id;


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
                actions={<AdminProductActions title={product.title} status={product.status} busy={productBusy} onApprove={()=>onApprove(product.id)} onBlock={reason=>onBlock(product.id,reason)} onUnblock={()=>onUnblock(product.id)} />}
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
    </CabinetPanel></>
  );
}
