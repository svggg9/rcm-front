// app/seller/products/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SellerProductNew.module.css";
import { apiFetch } from "../../../lib/api";
import { useClientAuth } from "../../../lib/useClientAuth";

type Option = { id: number; name: string };

type CreateProductReq = {
  title: string;
  description: string;
  categoryId: number;
  brandId: number;
  variants: Array<{
    size: string;
    color: string;
    price: number;
    quantity: number;
    sku: string;
  }>;
};

export default function SellerProductNewPage() {
  const router = useRouter();
  const isAuth = useClientAuth();

  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [categoryId, setCategoryId] = useState<number | "">("");
  const [brandId, setBrandId] = useState<number | "">("");

  const [size, setSize] = useState("Стандарт");
  const [color, setColor] = useState("Black");
  const [price, setPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [sku, setSku] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdProductId, setCreatedProductId] = useState<number | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // guard
  useEffect(() => {
    if (isAuth === null) return;
    if (!isAuth) router.push("/auth/login?next=/seller/products/new");
  }, [isAuth, router]);

  // load lists
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingLists(true);
      setError(null);

      try {
        const [catsR, brandsR] = await Promise.all([
          apiFetch("http://localhost:9696/api/categories"),
          apiFetch("http://localhost:9696/api/brands"),
        ]);

        if (!catsR.ok) throw new Error("Не удалось загрузить категории");
        if (!brandsR.ok) throw new Error("Не удалось загрузить бренды");

        const cats: Option[] = await catsR.json();
        const brs: Option[] = await brandsR.json();

        if (cancelled) return;

        setCategories(cats);
        setBrands(brs);

        if (cats.length && categoryId === "") setCategoryId(cats[0].id);
        if (brs.length && brandId === "") setBrandId(brs[0].id);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Ошибка загрузки справочников");
      } finally {
        if (!cancelled) setLoadingLists(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createProduct() {
    if (submitting) return;

    setError(null);

    if (!title.trim()) return setError("Введите название");
    if (!description.trim()) return setError("Введите описание");
    if (categoryId === "") return setError("Выберите категорию");
    if (brandId === "") return setError("Выберите бренд");
    if (!sku.trim()) return setError("Введите SKU");
    if (price <= 0) return setError("Цена должна быть > 0");
    if (quantity <= 0) return setError("Кол-во должно быть > 0");

    const payload: CreateProductReq = {
      title: title.trim(),
      description: description.trim(),
      categoryId: Number(categoryId),
      brandId: Number(brandId),
      variants: [
        {
          size: size.trim(),
          color: color.trim(),
          price: Number(price),
          quantity: Number(quantity),
          sku: sku.trim(),
        },
      ],
    };

    setSubmitting(true);

    try {
      const r = await apiFetch("http://localhost:9696/api/seller/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const text = await r.text().catch(() => "");
        setError(text || `Ошибка создания товара (${r.status})`);
        return;
      }

      const id: number = await r.json();
      setCreatedProductId(id);
    } catch {
      setError("Ошибка создания товара (network)");
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadImage() {
    if (!createdProductId) return setError("Сначала создай товар");
    if (!file) return setError("Выбери файл");

    setError(null);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const r = await apiFetch(
        `http://localhost:9696/api/seller/products/${createdProductId}/images`,
        {
          method: "POST",
          body: fd,
        }
      );

      if (!r.ok) {
        const text = await r.text().catch(() => "");
        setError(text || `Ошибка загрузки фото (${r.status})`);
        return;
      }

      const url = await r.text();
      setImageUrl(url);
    } catch {
      setError("Ошибка загрузки фото (network)");
    } finally {
      setUploading(false);
    }
  }

  if (isAuth === null) return <div className={styles.page}>Загрузка…</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Новый товар</h1>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.card}>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Название</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Напр. Офтальмоскоп"
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span>SKU</span>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Напр. OPH-001-BLK"
              className={styles.input}
            />
          </label>

          <label className={styles.fieldFull}>
            <span>Описание</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Коротко, по делу"
              className={styles.textarea}
              rows={5}
            />
          </label>

          <label className={styles.field}>
            <span>Категория</span>
            <select
              disabled={loadingLists}
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className={styles.input}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Бренд</span>
            <select
              disabled={loadingLists}
              value={brandId}
              onChange={(e) => setBrandId(Number(e.target.value))}
              className={styles.input}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Размер</span>
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span>Цвет</span>
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span>Цена (₽)</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className={styles.input}
              min={0}
            />
          </label>

          <label className={styles.field}>
            <span>Кол-во</span>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className={styles.input}
              min={0}
            />
          </label>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={createProduct}
            disabled={submitting}
            className={styles.primaryBtn}
          >
            {submitting ? "Создаём…" : "Создать товар"}
          </button>

          {createdProductId && (
            <span className={styles.muted}>ID: {createdProductId}</span>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.subtitle}>Фото</h2>

        {!createdProductId ? (
          <div className={styles.muted}>Сначала создай товар</div>
        ) : (
          <>
            <div className={styles.uploadRow}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={uploadImage}
                disabled={uploading || !file}
                className={styles.secondaryBtn}
              >
                {uploading ? "Загружаем…" : "Загрузить"}
              </button>
            </div>

            {imageUrl && (
              <div className={styles.preview}>
                <img src={imageUrl} alt="" className={styles.previewImg} />
                <div className={styles.previewMeta}>
                  <div className={styles.muted}>Загружено</div>
                  <a href={imageUrl} target="_blank" className={styles.link}>
                    Открыть картинку
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
