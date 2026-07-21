import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CabinetTabs, type CabinetTabItem } from "../../components/ui/CabinetTabs";

import styles from "../Admin.module.css";
import type { AdminProduct, ProductStatus } from "../types";
import Image from "next/image";

type Props = {
  products: AdminProduct[];
  status: ProductStatus | "ALL";
  refreshing: boolean;
  actionProductId: number | null;
  totalElements: number;
  statusCounts: Record<ProductStatus | "ALL", number>;
  onStatusChange: (status: ProductStatus | "ALL") => void;
  onRefresh: () => void;
  onOpenProduct: (id: number) => void;
  onPrefetchProduct?: (id: number) => void;
  onApprove: (id: number) => void;
  onBlock: (id: number) => void;
  onUnblock: (id: number) => void;
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

function formatStatus(status: string) {
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
      return "В архиве";
    case "BLOCKED":
      return "Заблокирован";
    case "ALL":
      return "Все";
    default:
      return status;
  }
}

function getProductStatusTone(status: string) {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "MODERATION":
      return "warning";
    case "NEEDS_REVISION":
      return "warning";
    case "BLOCKED":
      return "danger";
    default:
      return "default";
  }
}

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
  status,
  refreshing,
  actionProductId,
  totalElements,
  statusCounts,
  onStatusChange,
  onRefresh,
  onOpenProduct,
  onPrefetchProduct,
  onApprove,
  onBlock,
  onUnblock,
}: Props) {
  const statusTabs: Array<CabinetTabItem<ProductStatus | "ALL">> = STATUSES.map(
    (value) => ({
      value,
      label: formatStatus(value),
      count: statusCounts[value] ?? 0,
    })
  );

  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={`${styles.sectionTitleNoMargin} textTitle`}>
            Модерация товаров
          </h1>
          <div className={`${styles.muted} textCaption`}>
            Найдено: {totalElements}
          </div>
        </div>

        <button
          type="button"
          className={`${styles.refreshBtn} textButton`}
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Обновляем…" : "Обновить"}
        </button>
      </div>

      <div className={styles.filters}>
        <CabinetTabs
          items={statusTabs}
          value={status}
          onChange={onStatusChange}
          ariaLabel="Фильтр товаров по статусу"
          fullBleedMobile
          pinFirst
          countTone="gold"
          tone="gold"
        />
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon="package"
          title="Товаров нет"
          text="По выбранному статусу ничего не найдено."
        />
      ) : (
        <div className={styles.list}>
          {products.map((product) => {
            const loading = actionProductId === product.id;
            const image = product.images?.[0];
            const date = formatDate(product.updatedAt ?? product.createdAt);

            return (
              <article
                key={product.id}
                className={styles.productCard}
                role="button"
                tabIndex={0}
                onClick={() => onOpenProduct(product.id)}
                onMouseEnter={() => onPrefetchProduct?.(product.id)}
                onFocus={() => onPrefetchProduct?.(product.id)}
                onKeyDown={(event) => {
                  const target = event.target as HTMLElement;

                  if (target.closest("button, a, input, select, textarea")) {
                    return;
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenProduct(product.id);
                  }
                }}
              >
                <div
                  className={styles.productPreview}
                >
                  {image ? (
                    <Image
                      src={image}
                      alt={product.title}
                      width={90}
                      height={112}
                    />
                  ) : (
                    <div className={`${styles.productImagePlaceholder} textCaption`}>
                      Нет фото
                    </div>
                  )}
                </div>

                <div className={styles.productMain}>
                  <div className={`${styles.productTitle} textBody`}>
                    {product.title}
                  </div>

                  <div className={`${styles.productMetaLine} textCaption`}>
                    <span>ID {product.id}</span>
                    <span>{product.brand || "Без бренда"}</span>
                    {product.category ? (
                      <span>{product.category}</span>
                    ) : product.suggestedCategoryName ? (
                      <span className={styles.suggestedCategory}>
                        {product.suggestedCategoryName}
                      </span>
                    ) : (
                      <span>Без категории</span>
                    )}
                  </div>
                </div>

                <div className={styles.productState}>
                  <StatusBadge tone={getProductStatusTone(product.status)}>
                    {formatStatus(product.status)}
                  </StatusBadge>

                  {date ? (
                    <div className={`${styles.productDate} textCaption`}>
                      {date}
                    </div>
                  ) : null}

                  <div className={styles.productActions}>
                    {product.status === "MODERATION" ? (
                      <button
                        type="button"
                        className={`${styles.primaryBtn} textButton`}
                        disabled={loading}
                        onClick={(event) => {
                          event.stopPropagation();
                          onApprove(product.id);
                        }}
                      >
                        {loading ? "..." : "Одобрить"}
                      </button>
                    ) : null}

                    {product.status === "BLOCKED" ? (
                      <button
                        type="button"
                        className={`${styles.secondaryBtn} textButton`}
                        disabled={loading}
                        onClick={(event) => {
                          event.stopPropagation();
                          onUnblock(product.id);
                        }}
                      >
                        {loading ? "..." : "Разблокировать"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`${styles.dangerBtn} textButton`}
                        disabled={loading}
                        onClick={(event) => {
                          event.stopPropagation();
                          onBlock(product.id);
                        }}
                      >
                        {loading ? "..." : "Заблокировать"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
