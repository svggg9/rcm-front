import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";

import styles from "../Admin.module.css";
import type { AdminProduct, ProductStatus } from "../types";
import Image from "next/image";

type Props = {
  products: AdminProduct[];
  status: ProductStatus | "ALL";
  refreshing: boolean;
  actionProductId: number | null;
  totalElements: number;
  onStatusChange: (status: ProductStatus | "ALL") => void;
  onRefresh: () => void;
  onOpenProduct: (id: number) => void;
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
    case "ARCHIVED":
      return "danger";
    default:
      return "default";
  }
}

export function AdminProductsTab({
  products,
  status,
  refreshing,
  actionProductId,
  totalElements,
  onStatusChange,
  onRefresh,
  onOpenProduct,
  onApprove,
  onBlock,
  onUnblock,
}: Props) {
  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={styles.sectionTitleNoMargin}>Модерация товаров</h1>
          <div className={styles.muted}>Найдено: {totalElements}</div>
        </div>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Обновляем…" : "Обновить"}
        </button>
      </div>

      <div className={styles.filters}>
        {STATUSES.map((item) => (
          <button
            type="button"
            key={item}
            className={`${styles.filterBtn} ${
              status === item ? styles.filterBtnActive : ""
            }`}
            onClick={() => onStatusChange(item)}
          >
            {formatStatus(item)}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="Товаров нет"
          text="По выбранному статусу ничего не найдено."
        />
      ) : (
        <div className={styles.list}>
          {products.map((product) => {
            const loading = actionProductId === product.id;
            const image = product.images?.[0];

            return (
              <article key={product.id} className={styles.productCard}>
                <button
                  className={styles.productPreview}
                  onClick={() => onOpenProduct(product.id)}
                  type="button"
                >
                  {image ? (
                    <Image
                      src={image}
                      alt={product.title}
                      width={88}
                      height={116}
                    />
                  ) : (
                    <div className={styles.productImagePlaceholder}>Нет фото</div>
                  )}
                </button>

                <div className={styles.productMain}>
                  <div className={styles.productTop}>
                    <div>
                      <div className={styles.productTitle}>{product.title}</div>
                      <div className={styles.muted}>
                        ID {product.id} · {product.brand || "Без бренда"} ·{" "}
                        {product.category || "Без категории"}
                      </div>
                    </div>

                    <StatusBadge tone={getProductStatusTone(product.status)}>
                      {formatStatus(product.status)}
                    </StatusBadge>
                  </div>

                  <p className={styles.productDescription}>
                    {product.description || "Описание не заполнено"}
                  </p>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => onOpenProduct(product.id)}
                    >
                      Подробнее
                    </button>

                    {product.status === "MODERATION" ? (
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        disabled={loading}
                        onClick={() => onApprove(product.id)}
                      >
                        {loading ? "..." : "Одобрить"}
                      </button>
                    ) : null}

                    {product.status === "BLOCKED" ? (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={loading}
                        onClick={() => onUnblock(product.id)}
                      >
                        {loading ? "..." : "Разблокировать"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        disabled={loading}
                        onClick={() => onBlock(product.id)}
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