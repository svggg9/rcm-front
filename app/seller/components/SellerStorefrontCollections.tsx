"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Icon } from "../../components/ui/Icon";
import {
  createSellerStorefrontCollection,
  deleteSellerStorefrontCollection,
  getSellerStorefrontCollections,
} from "../lib/sellerBrandApi";
import type {
  SellerProductListItem,
  SellerStorefrontCollection,
} from "../types";

import styles from "./SellerStorefrontCollections.module.css";

type Props = {
  brandId: number;
  products: SellerProductListItem[];
};

export function SellerStorefrontCollections({ brandId, products }: Props) {
  const [collections, setCollections] = useState<SellerStorefrontCollection[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getSellerStorefrontCollections(brandId)
      .then(setCollections)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Не удалось загрузить подборки")
      );
  }, [brandId]);

  const availableProducts = products.filter((product) => product.status === "ACTIVE");

  function toggleProduct(productId: number) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  async function createCollection() {
    if (!title.trim() || selectedIds.length === 0 || saving) return;
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
        <div>
          <span className={styles.kicker}>Товарные блоки</span>
          <h2>Подборки на витрине</h2>
          <p>Объединяйте товары в тематические коллекции на публичной странице.</p>
        </div>
        <button type="button" onClick={() => setEditing((current) => !current)}>
          <Icon name={editing ? "x" : "plus"} size={16} />
          <span>{editing ? "Закрыть" : "Новая подборка"}</span>
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

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
              <span>{selectedIds.length} выбрано</span>
            </div>
            {availableProducts.length > 0 ? (
              <div className={styles.productGrid}>
                {availableProducts.map((product) => {
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
          </div>

          <div className={styles.editorActions}>
            <button
              type="button"
              className={styles.saveButton}
              disabled={!title.trim() || selectedIds.length === 0 || saving}
              onClick={() => void createCollection()}
            >
              {saving ? "Сохранение…" : "Создать подборку"}
            </button>
          </div>
        </div>
      ) : null}

      {collections.length > 0 ? (
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
