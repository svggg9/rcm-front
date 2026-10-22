"use client";

import { Loader } from "../../components/ui/Loader";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "@/app/components/ui/toast";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "./SellerProductsTab.module.css";
import { EmptyState } from "../../components/ui/EmptyState";
import { SectionLoader } from "../../components/ui/SectionLoader";
import Link from "next/link";
import { getSellerProductCatalogueClient } from "../lib/sellerClientDataApi";
import { Banner } from "../../components/ui/Banner";
import Image from "next/image";
import { Price } from "../../components/ui/Price";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatProductCreatedAt } from "../lib/sellerProductSort";
import { ListLoadMore } from "../../components/ui/ListLoadMore";
import { FormSelect } from "../../components/ui/FormSelect";
import { TextInput } from "../../components/ui/TextInput";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { PopoverPanel } from "../../components/ui/PopoverPanel";
import { SegmentedControl, type SegmentedControlItem } from "../../components/ui/SegmentedControl";
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
import { ProductFailureGroups } from "./ProductFailureGroups";
import {
  executeProductAction, getProductActionSelection, productActionBlockedReason,
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
  | "ARCHIVED"
  | "BLOCKED";

export function SellerProductsTab({
  brands = [],
  products,
  totalElements = products.length,
  loading,
  error,
  loadingMore = false,
  creatingProduct = false,
  onCreateProduct,
  onProductsChanged,
  sort: initialSort,
  sorting = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSort = searchParams.get("sort");
  const sort = useMemo<ProductSort>(() => {
    const [key, direction] = (requestedSort ?? "").split(",");
    return ["title", "minPrice", "variantsCount", "totalStock", "status", "createdAt"].includes(key) && ["asc", "desc"].includes(direction)
      ? { key: key as ProductSortKey, direction: direction as "asc" | "desc" }
      : initialSort ?? { key: "createdAt", direction: "desc" };
  }, [requestedSort, initialSort]);
  function onSort(key: ProductSortKey) {
    updateQuery("sort", `${key},${sort.key === key && sort.direction === "asc" ? "desc" : "asc"}`);
    setSelected(new Set());
  }
  const section = searchParams.get("section") === "collections" ? "collections" : "products";
  const [actionReport, setActionReport] = useState<ProductActionResult | null>(null);
  const [items, setItems] = useState(products);
  const requestedStatus = searchParams.get("status");
  const filter = (requestedStatus === "all" ? "" : ["ACTIVE", "MODERATION", "NEEDS_REVISION", "DRAFT", "ARCHIVED", "BLOCKED", "attention"].includes(requestedStatus ?? "") ? requestedStatus : "ACTIVE") as ProductFilter | "";
  function setFilter(value: ProductFilter | "") {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ACTIVE") params.delete("status"); else params.set("status", value || "all");
    window.history.replaceState(null, "", `/seller/products?${params.toString()}`);
  }
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") ?? "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [searchOpen, setSearchOpen] = useState(Boolean(searchParams.get("q")));
  const searchInput = useRef<HTMLInputElement>(null);
  const searchToggle = useRef<HTMLButtonElement>(null);
  const filterToggle = useRef<HTMLButtonElement>(null);
  const filtersId = useId();
  const searchId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [visibleCount, setVisibleCount] = useState(() => Math.max(50, Math.min(5000, Number(searchParams.get("shown")) || 50)));
  function updateQuery(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value); else params.delete(key);
    window.history.replaceState(null, "", `/seller/products${params.size ? `?${params}` : ""}`);
  }
  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
    setCategoryFilter(searchParams.get("category") ?? "");
    setSelected(new Set());
  }, [searchParams]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{ action: ProductAction; products: SellerProductListItem[]; targets: SellerProductListItem[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(0);
  const pending = useRef(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setItems(products);
    setCatalogError(false);
    const initialOrderMatches = sort.key === (initialSort?.key ?? "createdAt") && sort.direction === (initialSort?.direction ?? "desc");
    if (loading || section !== "products" || (products.length >= totalElements && initialOrderMatches)) {
      setCatalogLoading(false);
      return () => controller.abort();
    }
    setCatalogLoading(true);
    void getSellerProductCatalogueClient(sort, controller.signal).then(all => {
      if (!controller.signal.aborted) setItems(all);
    }).catch(() => {
      if (!controller.signal.aborted) setCatalogError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setCatalogLoading(false);
    });
    return () => controller.abort();
  }, [products, totalElements, sort, initialSort, loading, section, retry]);

  useEffect(() => {
    if (loading || catalogLoading) return;
    const key = `seller-product-scroll:/seller/products${searchParams.size ? `?${searchParams}` : ""}`;
    let position = 0;
    try { position = Number(sessionStorage.getItem(key)) || 0; } catch { return; }
    if (!position) return;
    const frame = requestAnimationFrame(() => window.scrollTo({ top: position, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [loading, catalogLoading, searchParams]);

  const productStatusOptions = [
    { value: "attention", label: "Требуют внимания" },
    { value: "ACTIVE", label: "Опубликованы" },
    { value: "MODERATION", label: "На модерации" },
    { value: "NEEDS_REVISION", label: "Нужны исправления" },
    { value: "DRAFT", label: "Черновики" },
    { value: "ARCHIVED", label: "В архиве" },
    { value: "BLOCKED", label: "Заблокированные" },
  ] satisfies { value: ProductFilter; label: string }[];

  const statusSegments: SegmentedControlItem<ProductFilter | "">[] = [
    { value: "", label: "Все" },
    { value: "ACTIVE", label: "Опубликованы" },
    { value: "DRAFT", label: "Черновики" },
    { value: "attention", label: "Требуют внимания" },
  ];
  if (filter && !statusSegments.some(item => item.value === filter)) {
    statusSegments.push({ value: filter, label: productStatusOptions.find(item => item.value === filter)!.label });
  }

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
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const selectedProducts = visibleProducts.filter(product => selected.has(product.id));
  const allSelected = filteredProducts.length > 0 && selectedProducts.length === visibleProducts.length;
  const controlsDisabled = busy || loading || loadingMore || sorting || catalogLoading || catalogError || Boolean(error);
  const initialLoading = (loading || catalogLoading) && items.length === 0;
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedProducts.length > 0 && !allSelected;
  }, [selectedProducts.length, allSelected, loading]);

  function selectAll() { setSelected(new Set(visibleProducts.map(product => product.id))); }
  function requestAction(action: ProductAction, targets = selectedProducts) {
    if (pending.current || controlsDisabled || targets.length === 0) return;
    setCompleted(0);
    const selection = getProductActionSelection(action, targets);
    setConfirmation({ action, products: selection.products, targets: selection.allowed });
  }
  async function confirmAction() {
    if (!confirmation || pending.current || !confirmation.targets.length) return;
    pending.current = true;
    setBusy(true);
    try {
      const outcome = await executeProductAction(confirmation.action, confirmation.targets, setCompleted);
      const changes = new Map(outcome.changes.map(change => [change.id, change.status]));
      setItems(current => current.flatMap(product => changes.get(product.id) === "DELETED" ? []
        : [{ ...product, status: changes.get(product.id) ?? product.status }]));
      setSelected(current => new Set([...current].filter(id => !changes.has(id))));
      onProductsChanged?.(outcome.changes);
      const feedback = productFeedback(confirmation.action, outcome);
      const toastId = "seller-product-action-result";
      if (!outcome.failures.length) {
        toast.success(feedback.title, { id: toastId, description: undefined, action: undefined });
      } else {
        const failure = feedback.singleFailure;
        const destination = failure ? productFailureDestination(failure) : null;
        const notify = outcome.changes.length ? toast.warning : toast.error;
        notify(feedback.title, {
          id: toastId,
          description: failure
            ? `${failure.product.title.trim() || "Без названия"} — ${failure.reason}`
            : `Не выполнено для ${outcome.failures.length} товаров — откройте список причин`,
          action: {
            label: destination?.label ?? "Посмотреть ошибки",
            onClick: () => {
              toast.dismiss(toastId);
              if (destination?.refresh) router.refresh();
              else if (destination) router.push(destination.href);
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

  const sectionPanel = (action: ReactNode, content: ReactNode) => <>
    <SectionHeader title={section === "collections" ? "Подборки" : "Товары"} large className={styles.pageHeader}
      actions={action ? <div className={styles.headerActions}>{action}</div> : undefined} />
    {content}
  </>;

  if (section === "collections") return <div className={styles.productsPage}>
    <SellerCollectionsTab brands={brands} renderPanel={sectionPanel} />
  </div>;

  const createProductAction = onCreateProduct ? (
    <Button
      type="button"
      variant="primary"
      aria-label="Добавить товар"
      loading={creatingProduct}
      onClick={() => {
        if (!pending.current && !creatingProduct) onCreateProduct();
      }}
    ><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><DesignSystemIcon name="plus" role="utility" />Добавить товар</span></Button>
  ) : null;

  return (
    <div className={`${styles.productsPage} ${selectedProducts.length ? styles.hasSelection : ""}`}>
      {actionReport ? <Dialog title="Не удалось выполнить действие" onClose={() => setActionReport(null)}
        actions={<Button variant="secondary" onClick={() => setActionReport(null)}>Закрыть</Button>}>
        <ProductFailureGroups failures={actionReport.failures} onNavigate={() => setActionReport(null)} />
      </Dialog> : null}
      {sectionPanel(createProductAction, <>
      <div className={styles.productsToolbar}>
        <div className={styles.statusControl}>
          <SegmentedControl items={statusSegments} value={filter} ariaLabel="Статус товара"
            disabled={controlsDisabled} onChange={next => {
              if (!pending.current) { setFilter(next); setSelected(new Set()); }
            }} />
        </div>
        <div className={styles.toolbarTools}>
          <Button ref={filterToggle} variant="secondary" className={`${styles.toolButton} ${filtersOpen || categoryFilter || filter !== "ACTIVE" || sort.key !== "createdAt" || sort.direction !== "desc" ? styles.toolActive : ""}`}
            aria-label="Фильтры товаров" title="Фильтры" aria-expanded={filtersOpen} aria-controls={filtersId}
            onClick={() => { setSearchOpen(false); setFiltersOpen(value => !value); }}><DesignSystemIcon name="sliders" role="utility" /></Button>
          <Button ref={searchToggle} variant="secondary" className={`${styles.toolButton} ${searchOpen || searchQuery ? styles.toolActive : ""}`}
            aria-label="Поиск товаров" title={searchQuery ? `Поиск: ${searchQuery}` : "Поиск"} aria-expanded={searchOpen} aria-controls={searchId}
            onClick={() => { setFiltersOpen(false); setSearchOpen(value => !value); }}><DesignSystemIcon name="search" role="utility" /></Button>
        </div>
        <PopoverPanel id={searchId} title="Поиск товаров" open={searchOpen} onClose={() => setSearchOpen(false)} anchorRef={searchToggle} initialFocusRef={searchInput}>
        <div className={styles.productSearch}>
          <TextInput
            ref={searchInput}
            label="Название товара или артикул"
            hideLabel
            type="search"
            maxLength={200}
            placeholder="Название товара или артикул"
            value={searchQuery}
            disabled={busy || loadingMore || sorting}
            onChange={(event) => {
              if (!pending.current) {
                setSearchQuery(event.target.value);
                updateQuery("q", event.target.value);
                setSelected(new Set());
              }
            }}
          />
        </div>
        </PopoverPanel>
        <PopoverPanel id={filtersId} title="Фильтры товаров" open={filtersOpen} onClose={() => setFiltersOpen(false)} anchorRef={filterToggle}>
        <div className={styles.filters}>
        <FormSelect<ProductFilter>
          label="Статус товара"
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
          label="Категория"
          ariaLabel="Категория товара"
          placeholder="Категория"
          emptyOptionLabel="Все категории"
          options={categoryOptions}
          value={categoryFilter}
          disabled={busy || loadingMore || sorting || categoryOptions.length === 0}
          onChange={next => {
            if (!pending.current) {
              setCategoryFilter(next);
              updateQuery("category", next);
              setSelected(new Set());
            }
          }}
        />
        <FormSelect<ProductSortKey> label="Сортировка" ariaLabel="Сортировка товаров" placeholder="Сортировка"
          value={sort?.key ?? "createdAt"} disabled={controlsDisabled}
          options={[{ value: "createdAt", label: "По дате" }, { value: "title", label: "По названию" }, { value: "minPrice", label: "По цене" }, { value: "totalStock", label: "По остатку" }, { value: "variantsCount", label: "По числу вариантов" }, { value: "status", label: "По статусу" }]}
          onChange={key => { if (key) { setSelected(new Set()); onSort(key); } }} />
        <Button variant="tertiary" disabled={controlsDisabled} aria-label={`Сортировка ${sort.direction === "asc" ? "по возрастанию" : "по убыванию"} — изменить направление`}
          onClick={() => onSort(sort?.key ?? "createdAt")}>{sort?.direction === "asc" ? "По возрастанию ↑" : "По убыванию ↓"}</Button>
        </div>
        </PopoverPanel>
      </div>
      <div className={styles.listSummary}>
        {loading || catalogLoading ? initialLoading ? null : <Loader inline label="Обновление товаров" /> : <span role="status">{catalogError ? `Загружено ${items.length} из ${totalElements}` : `Найдено ${filteredProducts.length}`}</span>}
      </div>

      {catalogError ? <Banner tone="warning" title="Список загружен не полностью">
        <p>Поиск пока учитывает только загруженные товары</p>
        <Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Повторить</Button>
      </Banner> : null}
      {error && items.length > 0 ? error : null}
      {initialLoading ? (
        <SectionLoader compact label="Загрузка товаров" />
      ) : error && items.length === 0 ? error : items.length === 0 ? (
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
                catalogError ? "Повторите загрузку, чтобы проверить все товары" : "Попробуйте другой запрос или сбросьте фильтры"
              }
            />
          ) : (
            <div className={styles.productsList}>
              <div className={styles.listHeader}>
                <label className={styles.checkboxTarget}>
                  <input ref={selectAllRef} type="checkbox" className={styles.checkbox}
                    aria-label={`Выбрать все показанные товары (${visibleProducts.length})`}
                    checked={allSelected} disabled={controlsDisabled}
                    onChange={() => allSelected ? setSelected(new Set()) : selectAll()} />
                </label>
                <div className={styles.headerColumns}><span /><span>Товар</span><span>Цена</span><span>Остаток</span><span>Добавлен</span></div><span />
              </div>
              {visibleProducts.map((product) => (
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
            loaded={Math.min(visibleCount, filteredProducts.length)}
            total={filteredProducts.length}
            onLoadMore={controlsDisabled || visibleCount >= filteredProducts.length ? undefined : () => { const next = visibleCount + 50; setVisibleCount(next); updateQuery("shown", String(next)); }}
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

  const params = useSearchParams();
  const returnTo = `/seller/products${params.size ? `?${params}` : ""}`;
  const editParams = new URLSearchParams(params.toString());
  editParams.set("returnTo", returnTo);
  const editHref = `/seller/products/${product.id}/edit?${editParams}`;

  return <article className={`${styles.productRow} ${selected ? styles.rowSelected : ""}`}>
    <label className={styles.checkboxTarget}>
      <input type="checkbox" className={styles.checkbox} aria-label={`Выбрать товар «${product.title.trim() || "Без названия"}»`}
        checked={selected} disabled={disabled} onChange={onSelect} />
    </label>
    <Link href={editHref} scroll={false} className={styles.productLink} onClick={() => {
      try { sessionStorage.setItem(`seller-product-scroll:${returnTo}`, String(window.scrollY)); } catch { /* Storage may be unavailable */ }
    }}>
      <span className={styles.productImage}>{product.coverImage ? <Image src={product.coverImage} alt="" fill sizes="56px" /> : <span>Нет фото</span>}</span>
      <span className={styles.productIdentity}>
        <span className={styles.productTitleLine}>
          <strong>{product.title.trim() || "Без названия"}</strong>
          <StatusBadge tone={getProductStatusTone(product.status)}>{formatProductStatus(product.status)}</StatusBadge>
        </span>
        <span className={styles.productMeta}>{[product.brandName, product.article, product.categoryName].filter(Boolean).join(" | ")}</span>
      </span>
      <span className={styles.productFacts}><span className={styles.productPrice}>{product.minPrice == null ? "Без цены" : <Price amount={product.minPrice} />}</span>
      <span className={styles.productStock} aria-label={`Остаток: ${product.totalStock == null ? "без учёта" : `${product.totalStock} шт`}`}>{product.totalStock == null ? "Без учёта" : `${product.totalStock} шт`}</span>
      </span><span className={styles.productDate} aria-label={`Добавлен ${formatProductCreatedAt(product.createdAt)}`}>{formatProductCreatedAt(product.createdAt)}</span>
    </Link>
    <ProductActionsMenu label={`Действия с товаром «${product.title.trim() || "Без названия"}»`} disabled={disabled}
      items={(["publish", product.status === "ARCHIVED" ? "draft" : "archive", "delete"] as ProductAction[])
        .map(action => ({ action, reason: productActionBlockedReason(action, product.status) }))}
      collectionReason={product.status === "ACTIVE" ? null : "В подборку можно добавить только активный товар"}
      onCreateCollection={() => router.push(`/seller/products?section=collections&collectionProductId=${product.id}&collectionProductTitle=${encodeURIComponent(product.title.trim() || "Без названия")}`)}
      onAction={onAction} />
  </article>;
}
