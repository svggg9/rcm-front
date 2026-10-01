import Link from "next/link";
import type { CatalogProduct } from "../../components/Catalog/catalogTypes";
import { ProductTile } from "../../components/ProductTile/ProductTile";
import styles from "./BrandPage.module.css";
import catalog from "../../components/Catalog/Catalog.module.css";

export type BrandFilters = { category: string; collection: string; sort: string; minPrice: string; maxPrice: string; page: number };

export function brandHref(slug: string, filters: BrandFilters, changes: Partial<BrandFilters> = {}) {
  const values = { ...filters, ...changes };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== "" && !(key === "page" && value === 1)) query.set(key, String(value));
  return `/brand/${encodeURIComponent(slug)}${query.size ? `?${query}` : ""}#brand-products`;
}

export function BrandCatalog({ products, brandSlug, totalPages, totalProducts, categories, collections, filters, error }: {
  products: CatalogProduct[]; brandSlug: string; totalPages: number; totalProducts: number;
  categories: string[]; collections: { id: number; title: string; description: string | null }[];
  filters: BrandFilters; error?: boolean;
}) {
  const selected = collections.find(c => String(c.id) === filters.collection);
  const filtered = Boolean(filters.category || filters.collection || filters.minPrice || filters.maxPrice || filters.sort);
  return <section className={styles.results} id="brand-products" aria-label="Каталог бренда">
    <nav className={catalog.subcategories} aria-label="Категории бренда">
      <Link href={brandHref(brandSlug, filters, { category: "", collection: "", page: 1 })} data-active={!filters.category && !filters.collection ? "true" : undefined}>Все товары</Link>
      {categories.map(category => <Link key={category} href={brandHref(brandSlug, filters, { category, collection: "", page: 1 })}
        data-active={category === filters.category && !filters.collection ? "true" : undefined}>{category}</Link>)}
      {collections.map(collection => <Link key={collection.id} href={brandHref(brandSlug, filters, { collection: String(collection.id), category: "", page: 1, sort: "" })}
        data-active={String(collection.id) === filters.collection ? "true" : undefined}>{collection.title}</Link>)}
    </nav>
    <div className={styles.catalogHeader}><h2>{selected?.title ?? "Товары"}</h2><span className={styles.count}>{error ? "" : totalProducts.toLocaleString("ru-RU")}</span></div>
    {selected?.description && <p className={styles.collectionDescription}>{selected.description}</p>}
    <form className={styles.filterBar} action={`/brand/${encodeURIComponent(brandSlug)}#brand-products`}>
      {filters.category && <input type="hidden" name="category" value={filters.category} />}
      {filters.collection && <input type="hidden" name="collection" value={filters.collection} />}
      <div className={catalog.priceFields}><label>Цена от, ₽<input name="minPrice" type="number" min="0" step="0.01" defaultValue={filters.minPrice} placeholder="От" /></label><span>—</span>
      <label>Цена до, ₽<input name="maxPrice" type="number" min="0" step="0.01" defaultValue={filters.maxPrice} placeholder="До" /></label></div>
      {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}
      <button className={catalog.applyButton} type="submit">Применить</button>
      <details className={catalog.sortWrap}>
        <summary className={catalog.sortButton}>Сортировка ▾</summary>
        <div className={catalog.sortMenu}>
          {[{ value: "", label: selected ? "Порядок в подборке" : "По умолчанию" },
            ...(!selected ? [{ value: "newest", label: "Сначала новинки" }] : []),
            { value: "price-asc", label: "Сначала дешевле" }, { value: "price-desc", label: "Сначала дороже" }].map(option =>
            <Link key={option.value} data-active={filters.sort === option.value} href={brandHref(brandSlug, filters, { sort: option.value, page: 1 })}>{option.label}</Link>)}
        </div>
      </details>
      {filtered && <Link href={`/brand/${encodeURIComponent(brandSlug)}#brand-products`} className={catalog.clearFilters}>Сбросить</Link>}
    </form>
    {selected && <p className={styles.collectionDescription}>Фильтр цены в подборке учитывает стоимость «от», указанную на карточке.</p>}
    {error ? <p className={styles.catalogEmpty} role="alert">Не удалось загрузить товары. <Link href={brandHref(brandSlug, filters)}>Повторить</Link></p>
      : products.length === 0 ? <div className={styles.catalogEmpty}><p>{filtered ? "По выбранным условиям товаров нет" : "У бренда пока нет опубликованных товаров"}</p>
        {filtered && <Link href={`/brand/${encodeURIComponent(brandSlug)}#brand-products`}>Показать все товары</Link>}</div>
      : <ul className={catalog.grid}>{products.map(product => <ProductTile key={product.id} product={{
        id: product.id, publicId: product.publicId, title: product.title, brand: product.brand,
        brandSlug: product.brandSlug, images: product.images, minPrice: product.minPrice,
      }} />)}</ul>}
    {totalPages > 1 && <nav className={`${catalog.pagination} ${styles.brandPagination}`} aria-label="Страницы товаров бренда">
      {filters.page > 1 ? <Link className={catalog.pageLink} href={brandHref(brandSlug, filters, { page: filters.page - 1 })}>Назад</Link> : <span>Назад</span>}
      <span>{filters.page} / {totalPages}</span>
      {filters.page < totalPages ? <Link className={catalog.pageLink} href={brandHref(brandSlug, filters, { page: filters.page + 1 })}>Далее</Link> : <span>Далее</span>}
    </nav>}
  </section>;
}
