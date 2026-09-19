"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "./SellerProductsTab.module.css";
import { EmptyState } from "../../components/ui/EmptyState";
import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { ProductListCard, ProductListHeader } from "../../components/ProductListCard";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import { FormSelect } from "../../components/ui/FormSelect";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";
import { DesignSystemIcon } from "../../components/ui/DesignSystemIcon";
import { Dialog } from "../../components/ui/Dialog";
import { productFeedback, productFailureDestination } from "../lib/sellerProductFeedback";
import {
  formatProductStatus,
  getProductStatusTone,
} from "../../lib/productStatus";

import type { SellerProductListItem, SellerBrand } from "../types";
import { SellerCollectionsTab } from "./SellerCollectionsTab";
import type { ProductSort, ProductSortKey } from "../lib/sellerProductSort";
import { ProductActionDialog, ProductActionsMenu, ProductSelectionBar } from "./SellerProductActions";
import { AddProductsToCollectionDialog } from "./AddProductsToCollectionDialog";
import {
  executeProductAction, productActionBlockedReason,
  type ProductAction, type ProductActionResult, type ProductChange,
} from "../lib/sellerProductActions";

type Props = {
  brands?: SellerBrand[];
  products: SellerProductListItem[];
  totalElements?: number;
  loading: boolean;
  error?: ReactNode;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  creatingProduct?: boolean;
  onCreateProduct?: () => void;
  onProductsChanged?: (changes: ProductChange[]) => void;
  sort: ProductSort | null;
  onSort: (key: ProductSortKey) => void;
  sorting?: boolean;
};

type ProductFilter =
  | "attention"
  | "ACTIVE"
  | "MODERATION"
  | "NEEDS_REVISION"
  | "DRAFT"
  | "ARCHIVED";

export function SellerProductsTab({
  brands = [],
  products,
  totalElements = products.length,
  loading,
  error,
  loadingMore = false,
  onLoadMore,
  creatingProduct = false,
  onCreateProduct,
  onProductsChanged,
  sort,
  onSort,
  sorting = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") === "collections" ? "collections" : "products";
  const [actionReport, setActionReport] = useState<ProductActionResult | null>(null);
  const [items, setItems] = useState(products);
  const requestedStatus = searchParams.get("status");
  const filter = (["ACTIVE", "MODERATION", "NEEDS_REVISION", "DRAFT", "ARCHIVED", "attention"].includes(requestedStatus ?? "") ? requestedStatus : "") as ProductFilter | "";
  function setFilter(value: ProductFilter | "") {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value); else params.delete("status");
    router.replace(`/seller?${params.toString()}`, { scroll: false });
  }
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{ action: ProductAction; products: SellerProductListItem[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(0);
  const pending = useRef(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(products);
  }, [products]);

  const productStatusOptions = [
    { value: "attention", label: "Требуют внимания" },
    { value: "ACTIVE", label: "Активные" },
    { value: "MODERATION", label: "На модерации" },
    { value: "NEEDS_REVISION", label: "Нужны исправления" },
    { value: "DRAFT", label: "Черновики" },
    { value: "ARCHIVED", label: "В архиве" },
  ] satisfies { value: ProductFilter; label: string }[];

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    for (const product of items) {
      const category = product.categoryName?.trim();
      if (category) categories.add(category);
    }
    return [...categories]
      .sort((left, right) => left.localeCompare(right, "ru"))
      .map((category) => ({ value: category, label: category }));
  }, [items]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ru-RU");
    return items.filter((product) => {
      const matchesStatus = !filter || (filter === "attention" ? ["NEEDS_REVISION", "BLOCKED"].includes(product.status ?? "") : product.status === filter);
      const matchesCategory = !categoryFilter || product.categoryName?.trim() === categoryFilter;
      const matchesQuery = !normalizedQuery
        || product.title.toLocaleLowerCase("ru-RU").includes(normalizedQuery)
        || product.article?.toLocaleLowerCase("ru-RU").includes(normalizedQuery);
      return matchesStatus && matchesCategory && matchesQuery;
    });
  }, [categoryFilter, filter, items, searchQuery]);

  // Selection never silently includes hidden rows after a filter change.
  const selectedProducts = filteredProducts.filter(product => selected.has(product.id));
  const allSelected = filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length;
  const controlsDisabled = busy || loadingMore || sorting;
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedProducts.length > 0 && !allSelected;
  }, [selectedProducts.length, allSelected, loading]);

  function selectAll() { setSelected(new Set(filteredProducts.map(product => product.id))); }
  function requestAction(action: ProductAction, targets = selectedProducts) {
    if (pending.current || loadingMore || sorting || targets.length === 0) return;
    setCompleted(0);
    setConfirmation({ action, products: targets });
  }
  async function confirmAction() {
    if (!confirmation || pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const outcome = await executeProductAction(confirmation.action, confirmation.products, setCompleted);
      const changes = new Map(outcome.changes.map(change => [change.id, change.status]));
      setItems(current => current.flatMap(product => changes.get(product.id) === "DELETED" ? []
        : [{ ...product, status: changes.get(product.id) ?? product.status }]));
      setSelected(current => new Set([...current].filter(id => !changes.has(id))));
      onProductsChanged?.(outcome.changes);
      const feedback = productFeedback(confirmation.action, outcome);
      const toastId = "seller-product-action-result";
      if (!outcome.failures.length) {
        toast.success(feedback.title, { id: toastId, position: "bottom-center", duration: 1500 });
      } else {
        const failure = feedback.singleFailure;
        const destination = failure ? productFailureDestination(failure) : null;
        toast.error(feedback.title, {
          id: toastId, position: "bottom-center", duration: 1500,
          description: failure
            ? `${failure.product.title.trim() || "Без названия"} — ${failure.reason}`
            : `Не выполнено для ${outcome.failures.length} товаров — откройте список причин`,
          action: {
            label: destination?.label ?? "Посмотреть ошибки",
            onClick: () => {
              toast.dismiss(toastId);
              if (destination) router.push(destination.href);
              else setActionReport(outcome);
            },
          },
        });
      }
      setConfirmation(null);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const sectionPanel = (_action: ReactNode, content: ReactNode) => <>{content}</>;

  if (section === "collections") return <div className={styles.productsPage}>
    <SellerCollectionsTab brands={brands} renderPanel={sectionPanel} />
  </div>;

  const createProductAction = onCreateProduct ? (
    <Button
      type="button"
      variant="primary"
      aria-busy={creatingProduct || undefined}
      onClick={() => {
        if (!pending.current && !creatingProduct) onCreateProduct();
      }}
    ><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><DesignSystemIcon name="plus" role="utility" />Добавить товар</span></Button>
  ) : null;

  return (
    <div className={`${styles.productsPage} ${selectedProducts.length ? styles.hasSelection : ""}`}>
      {actionReport ? <Dialog title="Не удалось выполнить действие" onClose={() => setActionReport(null)}
        actions={<Button variant="secondary" onClick={() => setActionReport(null)}>Закрыть</Button>}>
        <ul className={styles.failureList}>
          {actionReport.failures.map((failure) => {
            const destination = productFailureDestination(failure);
            return <li key={failure.product.id}>
              <strong>{failure.product.title.trim() || "Без названия"}</strong>
              <p>{failure.reason}</p>
              <Link href={destination.href} onClick={() => setActionReport(null)}>{destination.label}</Link>
            </li>;
          })}
        </ul>
      </Dialog> : null}
      {sectionPanel(createProductAction, <>
      <div className={styles.productsToolbar}>
        <div className={styles.productSearch}>
          <TextInput
            label="Название товара или артикул"
            hideLabel
            type="search"
            placeholder="Название товара или артикул"
            value={searchQuery}
            disabled={busy || loadingMore || sorting}
            onChange={(event) => {
              if (!pending.current) {
                setSearchQuery(event.target.value);
                setSelected(new Set());
              }
            }}
          />
        </div>
        <FormSelect<ProductFilter>
          ariaLabel="Статус товара"
          placeholder="Статус товара"
          emptyOptionLabel="Все товары"
          options={productStatusOptions}
          value={filter}
          disabled={busy || loadingMore || sorting}
          onChange={next => {
            if (!pending.current) {
              setFilter(next);
              setSelected(new Set());
            }
          }}
        />
        <FormSelect<string>
          ariaLabel="Категория товара"
          placeholder="Категория"
          emptyOptionLabel="Все товары"
          options={categoryOptions}
          value={categoryFilter}
          disabled={busy || loadingMore || sorting || categoryOptions.length === 0}
          onChange={next => {
            if (!pending.current) {
              setCategoryFilter(next);
              setSelected(new Set());
            }
          }}
        />
        <div className={styles.toolbarAction}>{createProductAction}</div>
      </div>

      {loading ? (
        <CabinetSkeleton variant="list" compact />
      ) : error ? error : items.length === 0 ? (
        <EmptyState
          icon="package"
          title="Товаров пока нет"
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
              <ProductListHeader sort={sort} onSort={onSort} disabled={controlsDisabled}
                leadingControl={<label className={styles.checkboxTarget}>
                  <input ref={selectAllRef} type="checkbox" className={styles.checkbox}
                    aria-label={`Выбрать все показанные товары (${filteredProducts.length})`}
                    checked={allSelected} disabled={controlsDisabled}
                    onChange={() => allSelected ? setSelected(new Set()) : selectAll()} />
                </label>} />
              {filteredProducts.map((product) => (
                <ProductRow key={product.id} product={product} selected={selected.has(product.id)} disabled={controlsDisabled}
                  onSelect={() => setSelected(current => {
                    const next = new Set(current);
                    if (next.has(product.id)) next.delete(product.id); else next.add(product.id);
                    return next;
                  })} onAction={action => requestAction(action, [product])} />
              ))}
            </div>
          )}
          <ListLoadMore
            loaded={items.length}
            total={totalElements}
            loading={loadingMore}
            onLoadMore={busy ? undefined : onLoadMore}
          />
        </>
      )}
      </>)}
      {selectedProducts.length > 0 && !loading ? <ProductSelectionBar products={selectedProducts} busy={controlsDisabled}
        onAddToCollection={() => setCollectionOpen(true)}
        allSelected={allSelected} onSelectAll={selectAll} onClear={() => setSelected(new Set())} onAction={requestAction} /> : null}
      {confirmation ? <ProductActionDialog {...confirmation} busy={busy} completed={completed}
        onConfirm={() => void confirmAction()} onClose={() => { if (!pending.current) setConfirmation(null); }} /> : null}
      {collectionOpen ? <AddProductsToCollectionDialog products={selectedProducts} onClose={() => setCollectionOpen(false)}
        onSuccess={collectionCount => { setCollectionOpen(false); setSelected(new Set()); toast.success(collectionCount > 1 ? "Товары добавлены в подборки" : "Товары добавлены в подборку"); }} /> : null}
    </div>
  );
}

function ProductRow({
  product,
  selected, disabled, onSelect, onAction,
}: {
  product: SellerProductListItem;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onAction: (action: ProductAction) => void;
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
      appearance="order-list"
      columnLabels
      createdAt={product.createdAt}
      categoryName={product.categoryName}
      minPrice={product.minPrice}
      variantsCount={product.variantsCount}
      totalStock={product.totalStock}
      statusLabel={formatProductStatus(product.status)}
      statusTone={getProductStatusTone(product.status)}
      selected={selected}
      leadingControl={<label className={styles.checkboxTarget}>
        <input type="checkbox" className={styles.checkbox} aria-label={`Выбрать товар «${product.title.trim() || "Без названия"}»`}
          checked={selected} disabled={disabled} onChange={onSelect} />
      </label>}
      trailingControl={<ProductActionsMenu label={`Действия с товаром «${product.title.trim() || "Без названия"}»`} disabled={disabled}
        items={([product.status === "ARCHIVED" ? "draft" : "archive", "delete"] as ProductAction[])
          .map(action => ({ action, reason: productActionBlockedReason(action, product.status) }))}
        collectionReason={product.status === "ACTIVE" ? null : "В подборку можно добавить только активный товар"}
        onCreateCollection={() => router.push(`/seller?tab=products&section=collections&collectionProductId=${product.id}&collectionProductTitle=${encodeURIComponent(product.title.trim() || "Без названия")}`)}
        onAction={onAction} />}
      onOpen={openProductEdit}
    />
  );
}
