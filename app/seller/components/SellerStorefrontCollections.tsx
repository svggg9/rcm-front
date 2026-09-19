"use client";
import { ConfirmActionButton } from "../../components/ui/ConfirmActionButton";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "../../components/ui/Button";
import { EditorSurface } from "../../components/ui/EditorSurface";
import { DesignSystemIcon } from "../../components/ui/DesignSystemIcon";
import { FormMultiSelect } from "../../components/ui/FormMultiSelect";
import { Price } from "../../components/ui/Price";
import { TextInput } from "../../components/ui/TextInput";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { scrollToFirstValidationError } from "../../lib/formValidation";
import {
  createSellerStorefrontCollection,
  deleteSellerStorefrontCollection,
  getSellerStorefrontCollections,
  getSellerStorefrontProducts,
  updateSellerStorefrontCollection,
} from "../lib/sellerBrandApi";
import type {
  SellerStorefrontCollection,
  SellerStorefrontProduct,
} from "../types";

import styles from "./SellerStorefrontCollections.module.css";
import pageStyles from "./SellerBrandTab.module.css";

type Props = {
  brandId: number;
  renderPanel: (action: ReactNode, content: ReactNode) => ReactNode;
};

export function SellerStorefrontCollections({ brandId, renderPanel }: Props) {
  const searchParams = useSearchParams();
  const collectionProductId = parseProductId(searchParams.get("collectionProductId"));
  const collectionProductTitle = searchParams.get("collectionProductTitle")?.trim() || null;
  const [collections, setCollections] = useState<SellerStorefrontCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<SellerStorefrontProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [appliedProductQuery, setAppliedProductQuery] = useState("");
  const [productsPage, setProductsPage] = useState(-1);
  const [productsHasMore, setProductsHasMore] = useState(false);
  const productsRequestIdRef = useRef(0);
  const selectedIdsRef = useRef(selectedIds);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; products?: string }>({});
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<number>>(new Set());
  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionTitleSort, setCollectionTitleSort] = useState<"asc" | "desc" | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const selectAllCollectionsRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const openedForProductRef = useRef<string | null>(null);
  const filteredCollections = useMemo(() => {
    const query = collectionQuery.trim().toLocaleLowerCase("ru-RU");
    const filtered = query ? collections.filter(collection => collection.title.toLocaleLowerCase("ru-RU").includes(query)) : collections;
    if (!collectionTitleSort) return filtered;
    return [...filtered].sort((left, right) => {
      const result = left.title.localeCompare(right.title, "ru", { sensitivity: "base" });
      return collectionTitleSort === "asc" ? result : -result;
    });
  }, [collectionQuery, collections, collectionTitleSort]);
  const selectedVisibleCollections = filteredCollections.filter(collection => selectedCollectionIds.has(collection.id)).length;
  const allVisibleCollectionsSelected = filteredCollections.length > 0 && selectedVisibleCollections === filteredCollections.length;

  useEffect(() => {
    setCollectionsLoading(true);
    void getSellerStorefrontCollections(brandId)
      .then(setCollections)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Не удалось загрузить подборки")
      )
      .finally(() => setCollectionsLoading(false));
  }, [brandId]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    if (selectAllCollectionsRef.current) {
      selectAllCollectionsRef.current.indeterminate = selectedVisibleCollections > 0
        && selectedVisibleCollections < filteredCollections.length;
    }
  }, [filteredCollections.length, selectedCollectionIds, selectedVisibleCollections]);

  const loadProducts = useCallback(async (page: number, query: string, reset: boolean) => {
    const requestId = ++productsRequestIdRef.current;
    if (reset) {
      setAppliedProductQuery(query.trim());
      setProductsHasMore(false);
    }
    setProductsLoading(true);
    try {
      const result = await getSellerStorefrontProducts(brandId, page, 24, query);
      if (productsRequestIdRef.current !== requestId) return;
      const selected = new Set(selectedIdsRef.current);
      setProducts((current) => {
        const base = reset
          ? current.filter((product) => selected.has(product.id))
          : current;
        return mergeProducts(base, result.content);
      });
      setProductsPage(result.number);
      setProductsHasMore(result.number + 1 < result.totalPages);
    } catch (reason) {
      if (productsRequestIdRef.current !== requestId) return;
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить товары");
    } finally {
      if (productsRequestIdRef.current === requestId) setProductsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    if (!collectionProductId) return;
    const requestKey = `${brandId}:${collectionProductId}`;
    if (openedForProductRef.current === requestKey) return;

    openedForProductRef.current = requestKey;
    setEditing(true);
    setError(null);
    setFieldErrors({});
    selectedIdsRef.current = [collectionProductId];
    setSelectedIds([collectionProductId]);
    void loadProducts(0, "", true);
  }, [brandId, collectionProductId, loadProducts]);

  async function openEditor() {
    if (saving || editing) return;
    if (collections.length >= 12) {
      setError("Можно создать не более 12 подборок");
      return;
    }

    setEditingId(null);
    setTitle("");
    setDescription("");
    selectedIdsRef.current = [];
    setSelectedIds([]);
    setEditing(true);
    setFieldErrors({});
    if (!productsLoading && (productsPage < 0 || appliedProductQuery)) {
      void loadProducts(0, "", true);
    }
  }

  function editCollection(collection: SellerStorefrontCollection) {
    if (saving || editing) return;
    const productIds = collection.products.map(product => product.id);
    setEditingId(collection.id);
    setTitle(collection.title);
    setDescription(collection.description ?? "");
    selectedIdsRef.current = productIds;
    setSelectedIds(productIds);
    setProducts(current => mergeProducts(collection.products.map(product => ({
      id: product.id,
      title: product.title,
      brand: product.brandName,
      coverImage: product.coverImage,
      status: product.status ?? null,
      minPrice: product.minPrice,
    })), current));
    setFieldErrors({});
    setError(null);
    setEditing(true);
    if (!productsLoading && (productsPage < 0 || appliedProductQuery)) {
      void loadProducts(0, "", true);
    }
  }

  function moveProduct(productId: number, direction: -1 | 1) {
    if (saving) return;
    setSelectedIds(current => {
      const index = current.indexOf(productId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveCollection() {
    if (saving || collectionsLoading || (editingId === null && collections.length >= 12)) return;
    const errors = {
      title: title.trim() ? undefined : "Введите название подборки",
      products: selectedIds.length ? undefined : "Выберите хотя бы один товар",
    };
    setFieldErrors(errors);
    if (errors.title || errors.products) {
      scrollToFirstValidationError({ root: editorRef.current });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        active: true,
        productIds: selectedIds,
      };
      const saved = editingId === null
        ? await createSellerStorefrontCollection(brandId, payload)
        : await updateSellerStorefrontCollection(brandId, editingId, payload);
      setCollections((current) => editingId === null
        ? [...current, saved]
        : current.map(collection => collection.id === saved.id ? saved : collection));
      setTitle("");
      setDescription("");
      selectedIdsRef.current = [];
      setSelectedIds([]);
      setEditingId(null);
      setEditing(false);
      toast.success(editingId === null ? "Подборка создана" : "Подборка сохранена", { position: "bottom-center", duration: 1500 });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать подборку");
    } finally {
      setSaving(false);
    }
  }

  async function removeCollection(collectionId: number) {
    if (removingId !== null) return;
    setRemovingId(collectionId);
    setError(null);
    try {
      await deleteSellerStorefrontCollection(brandId, collectionId);
      setCollections((current) =>
        current.filter((collection) => collection.id !== collectionId)
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить подборку");
    } finally {
      setRemovingId(null);
    }
  }

  async function updateSelectedCollections(active: boolean) {
    if (bulkBusy || !selectedCollectionIds.size) return;
    const selectedCollections = collections.filter(collection => selectedCollectionIds.has(collection.id));
    setBulkBusy(true);
    setError(null);
    try {
      const updated = await Promise.all(selectedCollections.map(collection =>
        updateSellerStorefrontCollection(brandId, collection.id, {
          title: collection.title,
          description: collection.description ?? "",
          active,
          productIds: collection.products.map(product => product.id),
        })
      ));
      const byId = new Map(updated.map(collection => [collection.id, collection]));
      setCollections(current => current.map(collection => byId.get(collection.id) ?? collection));
      setSelectedCollectionIds(new Set());
      toast.success(active ? "Подборки опубликованы" : "Подборки скрыты");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось обновить подборки");
    } finally {
      setBulkBusy(false);
    }
  }

  async function removeSelectedCollections() {
    if (bulkBusy || !selectedCollectionIds.size) return;
    const ids = [...selectedCollectionIds];
    setBulkBusy(true);
    setError(null);
    try {
      await Promise.all(ids.map(id => deleteSellerStorefrontCollection(brandId, id)));
      setCollections(current => current.filter(collection => !selectedCollectionIds.has(collection.id)));
      setSelectedCollectionIds(new Set());
      toast.success("Подборки удалены");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить подборки");
    } finally {
      setBulkBusy(false);
    }
  }

  const addCollectionAction = (
        <Button type="button" variant="primary"
          title={collections.length >= 12 ? "Можно создать не более 12 подборок" : undefined}
          onClick={() => void openEditor()}
        ><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><DesignSystemIcon name="plus" role="utility" />Добавить подборку</span></Button>
  );
  return renderPanel(null,
    <section className={`${styles.section} ${selectedCollectionIds.size ? styles.hasSelection : ""}`}>
      {error ? <div className={pageStyles.error} role="alert">{error}</div> : null}
      {editing ? (
        <EditorSurface compact title={editingId === null ? "Создание подборки" : "Редактирование подборки"} busy={saving}
          dirty={Boolean(title.trim() || description.trim() || selectedIds.length)}
          onClose={() => { setEditing(false); setEditingId(null); setTitle(""); setDescription(""); selectedIdsRef.current = []; setSelectedIds([]); setError(null); }}
          actions={<Button type="button" variant="primary"
            disabled={collectionsLoading || (editingId === null && collections.length >= 12)}
            loading={saving} onClick={() => void saveCollection()}>{editingId === null ? "Создать подборку" : "Сохранить"}</Button>}>
        <div className={styles.editor} ref={editorRef}>
          {error ? <div className={pageStyles.error} role="alert">{error}</div> : null}
          <div className={styles.fields}>
              <TextInput label="Название подборки"
                value={title}
                onChange={(event) => { setTitle(event.target.value); setFieldErrors((current) => ({ ...current, title: undefined })); }}
                placeholder="Например, Новая коллекция"
                maxLength={80}
                error={fieldErrors.title}
                disabled={saving}
              />
              <TextInput label="Короткое описание"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                hint="Необязательно"
                maxLength={160}
                disabled={saving}
              />
          </div>

          <div className={styles.productPicker}>
            {productsLoading && products.length === 0 ? (
              <div className={pageStyles.loading} role="status" aria-label="Загружаем товары" aria-busy="true"><span className="buttonLoader" aria-hidden="true" /></div>
            ) : products.length > 0 ? <FormMultiSelect<number>
              label="Товары"
              placeholder="Выберите товары"
              required
              values={selectedIds}
              disabled={saving}
              options={products.map(product => ({
                value: product.id,
                label: product.title,
                disabled: !selectedIds.includes(product.id) && selectedIds.length >= 12,
              }))}
              onChange={values => {
                const next = values.slice(0, 12);
                selectedIdsRef.current = next;
                setSelectedIds(next);
                setFieldErrors(current => ({ ...current, products: undefined }));
              }}
            /> : (
              <p className={styles.empty}>Нет опубликованных товаров для подборки</p>
            )}
            {fieldErrors.products ? <div className="fieldError" data-validation-error="true" tabIndex={-1} role="alert">{fieldErrors.products}</div> : null}
            {selectedIds.length > 0 ? <div className={styles.collectionPreview}>
              <div className={styles.previewHeading}>
                <strong>Предпросмотр подборки</strong>
                <span>Порядок слева направо</span>
              </div>
              <ul className={styles.previewRail}>
                {selectedIds.map((productId, index) => {
                  const product = products.find(item => item.id === productId);
                  return <li key={productId}>
                    <div className={styles.previewCover}>
                      {product?.coverImage ? <Image src={product.coverImage} alt="" fill sizes="180px" />
                        : <DesignSystemIcon name="package" role="empty" />}
                    </div>
                    <span className={styles.previewName}>{product?.title?.trim() || `Товар №${productId}`}</span>
                    {product?.minPrice != null ? <Price amount={product.minPrice} className={styles.previewPrice} /> : null}
                    <span className={styles.orderActions}>
                      <Button type="button" variant="ghost" aria-label={`Переместить ${product?.title || "товар"} влево`}
                        disabled={saving || index === 0} onClick={() => moveProduct(productId, -1)}><DesignSystemIcon name="chevron-left" role="utility" /></Button>
                      <Button type="button" variant="ghost" aria-label={`Переместить ${product?.title || "товар"} вправо`}
                        disabled={saving || index === selectedIds.length - 1} onClick={() => moveProduct(productId, 1)}><DesignSystemIcon name="chevron-right" role="utility" /></Button>
                    </span>
                  </li>;
                })}
              </ul>
            </div> : null}
            {collectionProductId && selectedIds.includes(collectionProductId) && !products.some((product) => product.id === collectionProductId) ? (
              <p className={styles.preselectedProduct}>Добавлен товар: {collectionProductTitle || `№${collectionProductId}`}</p>
            ) : null}
            {productsHasMore ? (
              <Button
                type="button"
                variant="secondary"
                className={styles.loadMore}
                disabled={saving}
                loading={productsLoading}
                reserveLabelSpace
                onClick={() =>
                  void loadProducts(productsPage + 1, appliedProductQuery, false)
                }
              >
                Загрузить ещё товары
              </Button>
            ) : null}
          </div>

        </div>
        </EditorSurface>
      ) : null}

        <div className={styles.collectionToolbar}>
          <div className={styles.toolbarAction}>{addCollectionAction}</div>
          <TextInput label="Название подборки" hideLabel type="search" placeholder="Название подборки"
            value={collectionQuery} disabled={bulkBusy || removingId !== null}
            onChange={event => { setCollectionQuery(event.target.value); setSelectedCollectionIds(new Set()); }} />
        </div>

      {collectionsLoading ? (
        <div className={pageStyles.loading} role="status" aria-label="Загружаем подборки" aria-busy="true"><span className="buttonLoader" aria-hidden="true" /></div>
      ) : collections.length > 0 ? (
        <>
        {filteredCollections.length > 0 ? (
        <div className={styles.collectionList} role="region" aria-label="Подборки товаров" tabIndex={0}>
          <table className={styles.collectionTable}>
            <thead><tr>
              <th scope="col"><label className={styles.checkboxTarget}>
                <input ref={selectAllCollectionsRef} type="checkbox" className={styles.checkbox}
                  aria-label="Выбрать все показанные подборки" checked={allVisibleCollectionsSelected}
                  disabled={bulkBusy || removingId !== null}
                  onChange={() => setSelectedCollectionIds(allVisibleCollectionsSelected
                    ? new Set() : new Set(filteredCollections.map(collection => collection.id)))} />
              </label></th>
              <th scope="col">Фото</th>
              <th scope="col"><button type="button" className={styles.sortButton}
                aria-label={`Название: ${collectionTitleSort === "asc" ? "по возрастанию" : collectionTitleSort === "desc" ? "по убыванию" : "без сортировки"}. Сортировать ${collectionTitleSort === "asc" ? "по убыванию" : "по возрастанию"}`}
                onClick={() => setCollectionTitleSort(current => current === "asc" ? "desc" : "asc")}>
                Название
                {collectionTitleSort ? <DesignSystemIcon name={collectionTitleSort === "asc" ? "chevron-up" : "chevron-down"} role="utility" /> : null}
              </button></th>
              <th scope="col">Статус</th>
              <th scope="col">Товары</th>
              <th scope="col"><span className="visuallyHidden">Действия</span></th>
            </tr></thead>
            <tbody>
          {filteredCollections.map((collection) => (
            <tr key={collection.id}>
              <td><label className={styles.checkboxTarget}>
                <input type="checkbox" className={styles.checkbox} aria-label={`Выбрать подборку ${collection.title}`}
                  checked={selectedCollectionIds.has(collection.id)} disabled={bulkBusy || removingId !== null}
                  onChange={() => setSelectedCollectionIds(current => {
                    const next = new Set(current);
                    if (next.has(collection.id)) next.delete(collection.id); else next.add(collection.id);
                    return next;
                  })} />
              </label></td>
              <td><div className={styles.collectionProducts}>
                {collection.products.slice(0, 4).map((product) => (
                  <span key={product.id}>
                    {product.coverImage ? (
                      <Image src={product.coverImage} alt="" fill sizes="72px" />
                    ) : (
                      <DesignSystemIcon name="package" role="utility" />
                    )}
                  </span>
                ))}
                {!collection.products.length ? <span><DesignSystemIcon name="package" role="utility" /></span> : null}
              </div></td>
              <th scope="row" className={styles.collectionName}>
                {collection.title}
                {collection.description ? <p>{collection.description}</p> : null}
              </th>
              <td className={styles.collectionStatus}><StatusBadge size="regular" tone={collection.active ? "success" : "default"}>{collection.active ? "Опубликована" : "Скрыта"}</StatusBadge></td>
              <td className={styles.collectionCount}>{formatProductCount(collection.products.length)}</td>
              <td>
              <Button type="button" variant="ghost" className={styles.editButton}
                aria-label={`Редактировать подборку ${collection.title}`}
                onClick={() => editCollection(collection)} disabled={removingId !== null || editing}>
                <DesignSystemIcon name="pencil" role="utility" />
              </Button>
              <ConfirmActionButton
                type="button"
                variant="ghost"
                className={styles.deleteButton}
                aria-label={`Удалить подборку ${collection.title}`}
                confirmTitle={`Удалить подборку «${collection.title}»?`}
                confirmText="Подборка исчезнет с витрины, сами товары останутся"
                onConfirm={() => removeCollection(collection.id)}
                disabled={removingId !== null}
                loading={removingId === collection.id}
                reserveLabelSpace
              >
                <DesignSystemIcon name="trash" role="utility" />
              </ConfirmActionButton>
              </td>
            </tr>
          ))}
            </tbody>
          </table>
        </div>
        ) : <div className={pageStyles.emptyState}><DesignSystemIcon name="search" role="empty" /><strong>Подборки не найдены</strong></div>}
        </>
      ) : !editing ? (
        <div className={pageStyles.emptyState}>
          <DesignSystemIcon name="package" role="empty" />
          <strong>Подборок пока нет</strong>
        </div>
      ) : null}
      {selectedCollectionIds.size > 0 ? <section className={styles.selectionBar} aria-label="Действия с выбранными подборками">
        <strong>{`Выбрано: ${selectedCollectionIds.size}`}</strong>
        <div className={styles.selectionActions}>
          <Button type="button" variant="secondary" disabled={bulkBusy} onClick={() => void updateSelectedCollections(true)}>Опубликовать</Button>
          <Button type="button" variant="tertiary" disabled={bulkBusy} onClick={() => void updateSelectedCollections(false)}>Скрыть</Button>
          <ConfirmActionButton type="button" variant="ghost" className={styles.deleteButton}
            aria-label="Удалить выбранные подборки" confirmTitle="Удалить выбранные подборки?"
            confirmText="Подборки исчезнут с витрины, сами товары останутся"
            disabled={bulkBusy} loading={bulkBusy} onConfirm={removeSelectedCollections}>
            <DesignSystemIcon name="trash" role="utility" />
          </ConfirmActionButton>
        </div>
        <Button type="button" variant="ghost" className={styles.clearSelection} aria-label="Снять выделение"
          disabled={bulkBusy} onClick={() => setSelectedCollectionIds(new Set())}>
          <DesignSystemIcon name="x" role="utility" />
        </Button>
      </section> : null}
    </section>
  );
}

function formatProductCount(count: number) {
  const form = new Intl.PluralRules("ru").select(count);
  return `${count} ${form === "one" ? "товар" : form === "few" ? "товара" : "товаров"}`;
}

function mergeProducts(
  first: SellerStorefrontProduct[],
  second: SellerStorefrontProduct[]
) {
  const products = new Map<number, SellerStorefrontProduct>();
  [...first, ...second].forEach((product) => products.set(product.id, product));
  return [...products.values()];
}

function parseProductId(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const productId = Number(value);
  return Number.isSafeInteger(productId) && productId > 0 ? productId : null;
}
