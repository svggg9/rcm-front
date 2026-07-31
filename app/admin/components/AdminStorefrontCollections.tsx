"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Icon } from "../../components/ui/Icon";
import {
  createAdminStorefrontCollection,
  deleteAdminStorefrontCollection,
  getAdminStorefrontProducts,
  reorderAdminStorefrontCollections,
  updateAdminStorefrontCollection,
} from "../lib/adminApi";
import type {
  AdminStorefrontCollection,
  AdminStorefrontProduct,
} from "../types";

import styles from "./AdminStorefrontCollections.module.css";

type Props = {
  initialCollections: AdminStorefrontCollection[];
  loading: boolean;
};

type Draft = {
  id: number | null;
  title: string;
  description: string;
  active: boolean;
  productIds: number[];
};

const EMPTY_DRAFT: Draft = {
  id: null,
  title: "",
  description: "",
  active: false,
  productIds: [],
};

export function AdminStorefrontCollections({ initialCollections, loading }: Props) {
  const [collections, setCollections] = useState(initialCollections);
  const [products, setProducts] = useState<AdminStorefrontProduct[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setCollections(initialCollections), [initialCollections]);

  useEffect(() => {
    void getAdminStorefrontProducts()
      .then(setProducts)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Не удалось загрузить товары")
      );
  }, []);

  function edit(collection: AdminStorefrontCollection) {
    setDraft({
      id: collection.id,
      title: collection.title,
      description: collection.description ?? "",
      active: collection.active,
      productIds: collection.products.map((product) => product.id),
    });
    setError(null);
  }

  function toggleProduct(id: number) {
    setDraft((current) => {
      if (!current) return current;
      const selected = current.productIds.includes(id);
      if (!selected && current.productIds.length >= 16) return current;
      return {
        ...current,
        productIds: selected
          ? current.productIds.filter((productId) => productId !== id)
          : [...current.productIds, id],
      };
    });
  }

  async function save() {
    if (!draft || !draft.title.trim() || draft.productIds.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        active: draft.active,
        productIds: draft.productIds,
      };
      const saved = draft.id
        ? await updateAdminStorefrontCollection(draft.id, payload)
        : await createAdminStorefrontCollection(payload);
      setCollections((current) =>
        draft.id
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved]
      );
      setDraft(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить подборку");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(collection: AdminStorefrontCollection) {
    try {
      const updated = await updateAdminStorefrontCollection(collection.id, {
        title: collection.title,
        description: collection.description ?? "",
        active: !collection.active,
        productIds: collection.products.map((product) => product.id),
      });
      setCollections((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось изменить статус");
    }
  }

  async function remove(id: number) {
    try {
      await deleteAdminStorefrontCollection(id);
      setCollections((current) => current.filter((item) => item.id !== id));
      if (draft?.id === id) setDraft(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить подборку");
    }
  }

  async function move(id: number, direction: -1 | 1) {
    const index = collections.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= collections.length) return;
    const next = [...collections];
    [next[index], next[target]] = [next[target], next[index]];
    setCollections(next);
    try {
      setCollections(await reorderAdminStorefrontCollections(next.map((item) => item.id)));
    } catch (reason) {
      setCollections(collections);
      setError(reason instanceof Error ? reason.message : "Не удалось изменить порядок");
    }
  }

  return (
    <section className={styles.section} aria-busy={loading || saving}>
      <div className={styles.header}>
        <div>
          <span>Главная страница</span>
          <h2>Глобальные подборки</h2>
          <p>Активные подборки заменяют автоматические товарные блоки на главной.</p>
        </div>
        <button type="button" onClick={() => setDraft({ ...EMPTY_DRAFT })}>
          <Icon name="plus" size={16} />
          Новая подборка
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {draft ? (
        <div className={styles.editor}>
          <div className={styles.editorHead}>
            <h3>{draft.id ? "Редактирование подборки" : "Новая подборка"}</h3>
            <button type="button" aria-label="Закрыть редактор" onClick={() => setDraft(null)}>
              <Icon name="x" size={18} />
            </button>
          </div>
          <div className={styles.fields}>
            <label>
              <span>Название</span>
              <input
                value={draft.title}
                maxLength={100}
                placeholder="Например, Выбор редакции"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </label>
            <label>
              <span>Описание</span>
              <input
                value={draft.description}
                maxLength={240}
                placeholder="Короткое описание подборки"
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>
          </div>
          <label className={styles.activeField}>
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
            />
            <span>
              <strong>Показывать на главной</strong>
              <small>Можно сохранить подборку выключенной как черновик.</small>
            </span>
          </label>
          <div className={styles.pickerHead}>
            <strong>Товары</strong>
            <span>{draft.productIds.length} из 16</span>
          </div>
          <div className={styles.productGrid}>
            {products.map((product) => {
              const selected = draft.productIds.includes(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  className={selected ? styles.productSelected : undefined}
                  onClick={() => toggleProduct(product.id)}
                >
                  <span className={styles.productImage}>
                    {product.coverImage ? (
                      <Image src={product.coverImage} alt="" fill sizes="140px" />
                    ) : (
                      <Icon name="package" size={20} />
                    )}
                  </span>
                  <strong>{product.brand || "Без бренда"}</strong>
                  <span>{product.title}</span>
                  <i>{selected ? <Icon name="check" size={13} /> : null}</i>
                </button>
              );
            })}
          </div>
          <div className={styles.editorActions}>
            <button type="button" onClick={() => setDraft(null)}>Отмена</button>
            <button
              type="button"
              disabled={!draft.title.trim() || draft.productIds.length === 0 || saving}
              onClick={() => void save()}
            >
              {saving ? "Сохранение…" : "Сохранить подборку"}
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.list}>
        {collections.map((collection, index) => (
          <article key={collection.id} className={styles.card}>
            <div className={styles.orderActions}>
              <button disabled={index === 0} onClick={() => void move(collection.id, -1)} aria-label="Поднять">
                <Icon name="chevron-up" size={16} />
              </button>
              <button disabled={index === collections.length - 1} onClick={() => void move(collection.id, 1)} aria-label="Опустить">
                <Icon name="chevron-down" size={16} />
              </button>
            </div>
            <div className={styles.cardCopy}>
              <span className={collection.active ? styles.published : styles.draft}> 
                {collection.active ? "На главной" : "Черновик"}
              </span>
              <h3>{collection.title}</h3>
              <p>{collection.products.length} товаров</p>
            </div>
            <div className={styles.thumbs}>
              {collection.products.slice(0, 4).map((product) => (
                <span key={product.id}>
                  {product.coverImage ? <Image src={product.coverImage} alt="" fill sizes="54px" /> : null}
                </span>
              ))}
            </div>
            <div className={styles.cardActions}>
              <button type="button" onClick={() => void toggleActive(collection)}>
                {collection.active ? "Скрыть" : "Опубликовать"}
              </button>
              <button type="button" onClick={() => edit(collection)}>Изменить</button>
              <button type="button" aria-label="Удалить" onClick={() => void remove(collection.id)}>
                <Icon name="x" size={16} />
              </button>
            </div>
          </article>
        ))}
        {!loading && collections.length === 0 ? (
          <div className={styles.empty}>Подборок пока нет</div>
        ) : null}
      </div>
    </section>
  );
}
