import { useState } from "react";

import styles from "../Admin.module.css";
import type { AdminProduct } from "../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import Image from "next/image";

type Props = {
  product: AdminProduct;
  actionProductId: number | null;
  onBack: () => void;
  onApprove: () => void;
  onReturnToRevision: (comment: string) => void;
  onBlock: () => void;
  onUnblock: () => void;
};

function formatStatus(status: string) {
  switch (status) {
    case "DRAFT":
      return "Черновик";
    case "MODERATION":
      return "На модерации";
    case "NEEDS_REVISION":
      return "warning";
    case "ACTIVE":
      return "Активен";
    case "ARCHIVED":
      return "В архиве";
    case "BLOCKED":
      return "Заблокирован";
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
    case "BLOCKED":
    case "ARCHIVED":
      return "danger";
    default:
      return "default";
  }
}

export function AdminProductDetails({
  product,
  actionProductId,
  onBack,
  onApprove,
  onReturnToRevision,
  onBlock,
  onUnblock,
}: Props) {
  const loading = actionProductId === product.id;

  const [revisionComment, setRevisionComment] = useState("");

  function handleReturnToRevision() {
    const cleanComment = revisionComment.trim();

    if (!cleanComment) {
      return;
    }

    onReturnToRevision(cleanComment);
  }

  return (
    <>
      <div className={styles.detailsHeader}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Назад
        </button>
        <h1 className={styles.sectionTitleNoMargin}>{product.title}</h1>
      </div>

      <div className={styles.detailsMeta}>
        <span>ID {product.id}</span>
        <span className={styles.dot}>·</span>
        <StatusBadge tone={getProductStatusTone(product.status)}>
          {formatStatus(product.status)}
        </StatusBadge>
        <span className={styles.dot}>·</span>
        <span>{product.brand || "Без бренда"}</span>
      </div>

      <div className={styles.detailsLayout}>
        <section className={styles.detailsSection}>
          <h2 className={styles.detailsSectionTitle}>Карточка товара</h2>

          <div className={styles.gallery}>
            {product.images?.length ? (
              product.images.map((image) => (
                <div key={image} className={styles.galleryImageWrap}>
                  <Image
                    src={image}
                    alt={product.title}
                    width={160}
                    height={214}
                    className={styles.galleryImage}
                  />
                </div>
              ))
            ) : (
              <div className={styles.galleryEmpty}>Фото не загружены</div>
            )}
          </div>

          <div className={styles.descriptionBlock}>
            <div className={styles.infoLabel}>Описание</div>
            <p>{product.description || "Описание не заполнено"}</p>
          </div>

          <h3 className={styles.subtitle}>Варианты</h3>

          <div className={styles.variantList}>
            {product.variants?.length ? (
              product.variants.map((variant) => (
                <div key={variant.id} className={styles.variantRow}>
                  <div>
                    <b>{variant.sku}</b>
                    <div className={styles.muted}>
                      Размер: {variant.size} · Цвет: {variant.color}
                    </div>
                  </div>
                  <div className={styles.variantPrice}>
                    {variant.price.toLocaleString("ru-RU")} ₽
                  </div>
                  <div className={styles.muted}>
                    Остаток: {variant.availableQuantity}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.empty}>Варианты не заполнены</div>
            )}
          </div>
        </section>

        <aside className={styles.detailsAside}>
          <section className={styles.detailsSection}>
            <h2 className={styles.detailsSectionTitle}>Информация</h2>

            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Статус</span>
                <span className={styles.infoValue}>
                  {formatStatus(product.status)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Категория</span>
                <span className={styles.infoValue}>
                  {product.category || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Бренд</span>
                <span className={styles.infoValue}>{product.brand || "—"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Аудитория</span>
                <span className={styles.infoValue}>{product.audience}</span>
              </div>
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={styles.detailsSectionTitle}>Действия</h2>

            <div className={styles.detailsActions}>
              {product.status === "MODERATION" ? (
                <>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={onApprove}
                    disabled={loading}
                  >
                    {loading ? "Одобряем…" : "Одобрить товар"}
                  </button>

                  <div className={styles.revisionForm}>
                    <label>
                      <span>Причина возврата</span>
                      <textarea
                        value={revisionComment}
                        onChange={(event) => setRevisionComment(event.target.value)}
                        placeholder="Например: добавьте фото на белом фоне, уточните состав, исправьте размерную сетку."
                        className={styles.textarea}
                        rows={5}
                      />
                    </label>

                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={handleReturnToRevision}
                      disabled={loading || !revisionComment.trim()}
                    >
                      {loading ? "Отправляем…" : "Вернуть на доработку"}
                    </button>
                  </div>
                </>
              ) : null}

              {product.status === "BLOCKED" ? (
                <button
                type="button"
                  className={styles.secondaryBtn}
                  onClick={onUnblock}
                  disabled={loading}
                >
                  {loading ? "Разблокируем…" : "Разблокировать"}
                </button>
              ) : (
                <button
                type="button"
                  className={styles.dangerBtn}
                  onClick={onBlock}
                  disabled={loading}
                >
                  {loading ? "Блокируем…" : "Заблокировать"}
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}