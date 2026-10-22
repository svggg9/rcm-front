import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";

import styles from "../Admin.module.css";
import type { AdminProduct, DictionaryItem } from "../types";
import { Price } from "../../components/ui/Price";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { CategoryPicker } from "../../components/ui/CategoryPicker";
import { FormSelect } from "../../components/ui/FormSelect";
import { TextInput } from "../../components/ui/TextInput";
import { RequestError } from "../../components/ui/RequestError";
import { eligibleCategoryParents, normalizeCategories } from "../../lib/categories";

type Props = {
  product: AdminProduct;
  categories: DictionaryItem[];
  categoryError?: string | null;
  categoryLoading?: boolean;
  onRetryCategories?: () => void;
  actionProductId: number | null;
  onBack: () => void;
  onAssignCategory: (params: {
    categoryId?: number;
    categoryName?: string;
    parentId?: number | null;
  }) => Promise<void>;
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
      return "Нужны исправления";
    case "ACTIVE":
      return "Активен";
    case "ARCHIVED":
      return "В архиве";
    case "BLOCKED":
      return "Отклонен";
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
    case "BLOCKED":
      return "danger";
    default:
      return "default";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminProductDetails({
  product,
  categories,
  categoryError,
  categoryLoading = false,
  onRetryCategories,
  actionProductId,
  onBack,
  onAssignCategory,
  onApprove,
  onReturnToRevision,
  onBlock,
  onUnblock,
}: Props) {
  const loading = actionProductId === product.id;

  const [revisionComment, setRevisionComment] = useState("");
  const [categorySelection, setCategorySelection] = useState<{ savedId: number | null; value: number | "" }>({
    savedId: product.categoryId, value: product.categoryId ?? "",
  });
  let selectedCategoryId = categorySelection.value;
  if (categorySelection.savedId !== product.categoryId) {
    selectedCategoryId = product.categoryId ?? "";
    setCategorySelection({ savedId: product.categoryId, value: selectedCategoryId });
  }
  const [newCategoryName, setNewCategoryName] = useState(
    product.suggestedCategoryName ?? ""
  );
  const [newParentId, setNewParentId] = useState<number | "root" | "">("");
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const categoryInFlight = useRef(false);
  const categoryOptions = normalizeCategories(categories);
  const parentCategories = eligibleCategoryParents(categoryOptions).filter((category) => category.effectiveActive);
  const selectedCategory = categoryOptions.find((category) => category.id === selectedCategoryId);
  const cleanCategoryName = newCategoryName.trim().replace(/\s+/g, " ");
  const newParent = newParentId === "root" ? null : newParentId;
  const duplicate = categoryOptions.some((category) => category.parentId === newParent && category.label.toLocaleLowerCase("ru") === cleanCategoryName.toLocaleLowerCase("ru"));
  const newCategoryError = cleanCategoryName.includes("/") ? "Введите название без пути, раздел выберите отдельно" : duplicate ? "В этом разделе уже есть такая категория — выберите её выше" : null;
  const categoryUnavailable = loading || assigning || categoryLoading || Boolean(categoryError);

  async function assignCategory(create = false) {
    if (categoryUnavailable || categoryInFlight.current) return;
    if (create ? !cleanCategoryName || newCategoryError || newParentId === "" : !selectedCategory?.effectiveActive) return;
    categoryInFlight.current = true;
    setAssigning(true);
    setAssignmentError(null);
    try {
      await onAssignCategory(create ? { categoryName: cleanCategoryName, parentId: newParentId === "root" ? null : Number(newParentId) } : { categoryId: Number(selectedCategoryId) });
      if (create) { setNewCategoryName(""); setNewParentId(""); }
    } catch (reason) {
      setAssignmentError(reason instanceof Error ? reason.message : "Не удалось назначить категорию");
    } finally { categoryInFlight.current = false; setAssigning(false); }
  }

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
        <button
          type="button"
          className={`${styles.backBtn} textButton`}
          onClick={onBack}
        >
          Назад
        </button>

        <div className={styles.detailsTitleBlock}>
          <h1 className={`${styles.sectionTitleNoMargin} textTitle`}>
            {product.title}
          </h1>

          <div className={`${styles.detailsMeta} textCaption`}>
            <span>ID {product.id}</span>
            <span>{product.brand || "Без бренда"}</span>
            <StatusBadge tone={getProductStatusTone(product.status)}>
              {formatStatus(product.status)}
            </StatusBadge>
          </div>
        </div>
      </div>

      <div className={styles.detailsLayout}>
        <main className={styles.detailsMain}>
          {product.revisionSourceId && <Banner tone="info" title={`Изменения товара №${product.revisionSourceId}`}>
            Одобрение обновит существующую карточку, сохранив текущие цены и резервы
          </Banner>}
          <section className={styles.detailsSection}>
            <h2 className={`${styles.detailsSectionTitle} textBody`}>
              Основные данные
            </h2>

            <div className={styles.infoGrid}>
              <InfoRow label="Название" value={product.title} />
              <InfoRow label="Бренд" value={product.brand || "—"} />
              <InfoRow label="Категория" value={product.category || "—"} />
              {product.suggestedCategoryName ? (
                <InfoRow
                  label="Предложенная категория"
                  value={product.suggestedCategoryName}
                  valueClassName={styles.suggestedCategory}
                />
              ) : null}
              <InfoRow label="Аудитория" value={product.audience || "—"} />
            </div>

            <div className={styles.descriptionBlock}>
              <div className={`${styles.infoLabel} textSmall`}>Описание</div>
              <p className="textSmall">
                {product.description || "Описание не заполнено"}
              </p>
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={`${styles.detailsSectionTitle} textBody`}>Фото</h2>

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
                <div className={`${styles.galleryEmpty} textCaption`}>
                  Фото не загружены
                </div>
              )}
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={`${styles.detailsSectionTitle} textBody`}>
              Варианты
            </h2>

            <div className={styles.variantList}>
              {product.variants?.length ? (
                product.variants.map((variant) => (
                  <div key={variant.id} className={styles.variantRow}>
                    <div>
                      <span className="textSmall">{variant.sku}</span>
                      <div className={`${styles.muted} textCaption`}>
                        Размер: {variant.size || "—"}, Цвет: {variant.color || "—"}
                      </div>
                    </div>
                    <div className={`${styles.variantPrice} textSmall`}>
                      <Price amount={variant.price} />
                    </div>
                    <div className={`${styles.muted} textCaption`}>
                      Остаток: {variant.availableQuantity}
                    </div>
                  </div>
                ))
              ) : (
                <div className={`${styles.empty} textCaption`}>
                  Варианты не заполнены
                </div>
              )}
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={`${styles.detailsSectionTitle} textBody`}>
              Модерация
            </h2>

            {product.suggestedCategoryName ? (
              <div className={styles.categoryProposal}>
                <div>
                  <span className={`${styles.infoLabel} textSmall`}>
                    Предложенная категория
                  </span>
                  <div className={`${styles.categoryProposalValue} textBody`}>
                    {product.suggestedCategoryName}
                  </div>
                </div>

                <span className="textMuted textSmall">Выберите существующую категорию или укажите раздел для новой</span>
              </div>
            ) : null}

            <div className={styles.moderationGrid}>
              <CategoryPicker label="Привязать к существующей" value={selectedCategoryId} categories={categoryOptions}
                currentLabel={product.category} allowCustomValue={false} disabled={categoryUnavailable}
                loading={categoryLoading} error={categoryError} onRetry={onRetryCategories}
                onChange={(value) => { setCategorySelection({ savedId: product.categoryId, value }); setAssignmentError(null); }} />
              <Button variant="secondary" disabled={categoryUnavailable || !selectedCategory?.effectiveActive}
                loading={assigning} onClick={() => void assignCategory()}>Привязать</Button>
              <TextInput label="Создать новую категорию" fieldVariant="boxed" value={newCategoryName} maxLength={120}
                disabled={categoryUnavailable} error={newCategoryError} onChange={(event) => { setNewCategoryName(event.target.value); setAssignmentError(null); }} />
              <FormSelect<number | "root"> label="Расположение новой категории" value={newParentId} required
                placeholder="Выберите родительскую категорию" disabled={categoryUnavailable}
                options={[{ value: "root", label: "Создать основной раздел" }, ...parentCategories.map((category) => ({ value: category.id, label: category.name }))]}
                onChange={(value) => { setNewParentId(value); setAssignmentError(null); }} />
              <Button variant="primary" disabled={categoryUnavailable || !cleanCategoryName || newParentId === "" || !!newCategoryError}
                loading={assigning} onClick={() => void assignCategory(true)}>Создать и привязать</Button>
            </div>
            {assignmentError && !categoryError ? <RequestError variant="inline" message={assignmentError} /> : null}

            <label className={styles.adminTextareaField} data-ui="field">
              <span className="textCaption">Комментарий модератора</span>
              <textarea
                value={revisionComment}
                onChange={(event) => setRevisionComment(event.target.value)}
                className={`${styles.textarea} textBody`}
                rows={4}
              />
            </label>

            {product.moderationComment ? (
              <div className={styles.infoBlock}>
                <span className={`${styles.infoLabel} textSmall`}>
                  Последний комментарий
                </span>
                <span className={`${styles.infoValue} textSmall`}>
                  {product.moderationComment}
                </span>
              </div>
            ) : null}
          </section>
        </main>

        <aside className={styles.detailsAside}>
          <section className={styles.detailsSection}>
            <h2 className={`${styles.detailsSectionTitle} textBody`}>
              Информация
            </h2>

            <div className={styles.infoGrid}>
              <InfoRow
                label="Статус"
                value={
                  <StatusBadge tone={getProductStatusTone(product.status)}>
                    {formatStatus(product.status)}
                  </StatusBadge>
                }
              />
              <InfoRow label="Создан" value={formatDate(product.createdAt)} />
              <InfoRow label="Обновлен" value={formatDate(product.updatedAt)} />
              <InfoRow label="Фото" value={String(product.images?.length ?? 0)} />
              <InfoRow
                label="Варианты"
                value={String(product.variants?.length ?? 0)}
              />
            </div>
          </section>

          <section className={styles.detailsSection}>
            <h2 className={`${styles.detailsSectionTitle} textBody`}>
              Действия
            </h2>

            <div className={styles.detailsActions}>
              {product.status === "MODERATION" ? (
                <>
                  <button
                    type="button"
                    className={`${styles.primaryBtn} textButton`}
                    onClick={onApprove}
                    disabled={loading}
                  >
                    Одобрить
                  </button>

                  <button
                    type="button"
                    className={`${styles.secondaryBtn} textButton`}
                    onClick={handleReturnToRevision}
                    disabled={loading || !revisionComment.trim()}
                  >
                    На доработку
                  </button>
                </>
              ) : null}

              {product.status === "BLOCKED" ? (
                <button
                  type="button"
                  className={`${styles.secondaryBtn} textButton`}
                  onClick={onUnblock}
                  disabled={loading}
                >
                  Вернуть в работу
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.dangerBtn} textButton`}
                  onClick={onBlock}
                  disabled={loading}
                >
                  Отклонить
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function InfoRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className={styles.infoRow}>
      <span className={`${styles.infoLabel} textSmall`}>{label}</span>
      <span className={`${styles.infoValue} ${valueClassName ?? ""} textSmall`}>
        {value}
      </span>
    </div>
  );
}
