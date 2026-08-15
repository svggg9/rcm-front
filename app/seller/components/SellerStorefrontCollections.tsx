"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import {
  createSellerStorefrontCollection,
  deleteSellerStorefrontCollection,
  getSellerStorefrontCollections,
  getSellerStorefrontProducts,
} from "../lib/sellerBrandApi";
import type {
  SellerStorefrontCollection,
  SellerStorefrontProduct,
} from "../types";

import styles from "./SellerStorefrontCollections.module.css";

type Props = {
  brandId: number;
};

export function SellerStorefrontCollections({ brandId }: Props) {
  const [collections, setCollections] = useState<SellerStorefrontCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<SellerStorefrontProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [appliedProductQuery, setAppliedProductQuery] = useState("");
  const [productsPage, setProductsPage] = useState(-1);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsHasMore, setProductsHasMore] = useState(false);
  const productsRequestIdRef = useRef(0);
  const selectedIdsRef = useRef(selectedIds);
  const [error, setError] = useState<string | null>(null);

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

  async function loadProducts(page: number, query: string, reset: boolean) {
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
      setProductsTotal(result.totalElements);
      setProductsHasMore(result.number + 1 < result.totalPages);
    } catch (reason) {
      if (productsRequestIdRef.current !== requestId) return;
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить товары");
    } finally {
      if (productsRequestIdRef.current === requestId) setProductsLoading(false);
    }
  }

  async function toggleEditor() {
    if (editing) {
      setEditing(false);
      return;
    }

    setEditing(true);
    if (!productsLoading && (productsPage < 0 || appliedProductQuery)) {
      setProductQuery("");
      void loadProducts(0, "", true);
    }
  }

  function toggleProduct(productId: number) {
    setSelectedIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }
      if (current.length >= 12) return current;
      return [...current, productId];
    });
  }

  async function createCollection() {
    if (
      !title.trim() ||
      selectedIds.length === 0 ||
      saving ||
      collections.length >= 12
    ) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createSellerStorefrontCollection(brandId, {
        title: title.trim(),
        description: description.trim(),
        active: true,
        productIds: selectedIds,
      });
      setCollections((current) => [...current, created]);
      setTitle("");
      setDescription("");
      setSelectedIds([]);
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать подборку");
    } finally {
      setSaving(false);
    }
  }

  async function removeCollection(collectionId: number) {
    try {
      await deleteSellerStorefrontCollection(brandId, collectionId);
      setCollections((current) =>
        current.filter((collection) => collection.id !== collectionId)
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить подборку");
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.sectionNumber}>03</span>
          <div>
            <h2>Подборки товаров</h2>
            <p>Соберите тематические блоки для публичной страницы.</p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className={styles.collectionAction}
          disabled={!editing && collections.length >= 12}
          onClick={() => void toggleEditor()}
        >
          {editing ? "Закрыть" : "Новая подборка"}
        </Button>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      {editing ? (
        <div className={styles.editor}>
          <div className={styles.fields}>
            <label>
              <span>Название</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например, Новая коллекция"
                maxLength={80}
              />
            </label>
            <label>
              <span>Короткое описание</span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Необязательно"
                maxLength={160}
              />
            </label>
          </div>

          <div className={styles.productPicker}>
            <div className={styles.pickerHeading}>
              <strong>Выберите товары</strong>
              <span>{selectedIds.length} из 12 · найдено {productsTotal}</span>
            </div>
            <form
              className={styles.productSearch}
              onSubmit={(event) => {
                event.preventDefault();
                void loadProducts(0, productQuery, true);
              }}
            >
              <input
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="Найти товар"
                aria-label="Поиск товаров"
              />
              <button type="submit" disabled={productsLoading}>Найти</button>
            </form>
            {productsLoading && products.length === 0 ? (
              <p className={styles.empty}>Загружаем товары…</p>
            ) : products.length > 0 ? (
              <div className={styles.productGrid}>
                {products.map((product) => {
                  const selected = selectedIds.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      className={selected ? styles.productSelected : undefined}
                      onClick={() => toggleProduct(product.id)}
                    >
                      <span className={styles.productImage}>
                        {product.coverImage ? (
                          <Image
                            src={product.coverImage}
                            alt=""
                            fill
                            sizes="120px"
                          />
                        ) : (
                          <Icon name="package" size={20} />
                        )}
                      </span>
                      <span className={styles.productName}>{product.title}</span>
                      <span className={styles.check}>
                        {selected ? <Icon name="check" size={13} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className={styles.empty}>Сначала опубликуйте хотя бы один товар.</p>
            )}
            {productsHasMore ? (
              <button
                type="button"
                className={styles.loadMore}
                disabled={productsLoading}
                onClick={() =>
                  void loadProducts(productsPage + 1, appliedProductQuery, false)
                }
              >
                {productsLoading ? "Загрузка…" : "Показать ещё"}
              </button>
            ) : null}
          </div>

          <div className={styles.editorActions}>
            <Button
              type="button"
              variant="primary"
              className={styles.saveButton}
              disabled={!title.trim() || selectedIds.length === 0 || saving}
              onClick={() => void createCollection()}
            >
              {saving ? "Сохранение…" : "Создать подборку"}
            </Button>
          </div>
        </div>
      ) : null}

      {collectionsLoading ? (
        <p className={styles.empty}>Загружаем подборки…</p>
      ) : collections.length > 0 ? (
        <div className={styles.collectionList}>
          {collections.map((collection) => (
            <article key={collection.id} className={styles.collectionCard}>
              <div>
                <span>{collection.active ? "Опубликована" : "Скрыта"}</span>
                <h3>{collection.title}</h3>
                <p>{collection.products.length} товаров</p>
              </div>
              <div className={styles.collectionProducts}>
                {collection.products.slice(0, 4).map((product) => (
                  <span key={product.id}>
                    {product.coverImage ? (
                      <Image src={product.coverImage} alt="" fill sizes="72px" />
                    ) : (
                      <Icon name="package" size={18} />
                    )}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className={styles.deleteButton}
                aria-label={`Удалить подборку ${collection.title}`}
                onClick={() => void removeCollection(collection.id)}
              >
                <Icon name="x" size={17} />
              </button>
            </article>
          ))}
        </div>
      ) : !editing ? (
        <div className={styles.emptyState}>
          <Icon name="shopping-bag" size={24} />
          <strong>Подборок пока нет</strong>
          <span>Соберите первую тематическую витрину из активных товаров.</span>
        </div>
      ) : null}
    </section>
  );
}

function mergeProducts(
  first: SellerStorefrontProduct[],
  second: SellerStorefrontProduct[]
) {
  const products = new Map<number, SellerStorefrontProduct>();
  [...first, ...second].forEach((product) => products.set(product.id, product));
  return [...products.values()];
}
