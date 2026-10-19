"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useFavorites } from "../lib/FavoritesContext";
import { productPath } from "../lib/productUrls";
import { resolveCartId } from "../lib/cartAuthority";
import { emitCartChanged } from "../lib/cartEvents";
import { apiFetch, API_URL } from "../lib/api";
import { addVariantToCart } from "../product/[id]/lib/productPageApi";
import { CartActionError } from "../cart/lib/cartApi";
import type { Variant } from "../product/[id]/lib/types";
import { LikeButton } from "../components/ui/LikeButton";
import { Button } from "../components/ui/Button";
import { SizeOptions } from "../components/ui/SizeOptions";
import { FormSelect } from "../components/ui/FormSelect";
import { Loader } from "../components/ui/Loader";
import { toast } from "../components/ui/toast";
import styles from "./Favorites.module.css";

type Product = { id: number; publicId?: string | null; title: string; brand: string | null; images: string[]; minPrice: number };

export function FavoriteCard({ product, onRemove }: { product: Product; onRemove: (id: number, liked: boolean) => void }) {
  const { isFavorite, toggle } = useFavorites();
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [color, setColor] = useState("");
  const root = useRef<HTMLLIElement>(null);
  const panelId = useId();
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const request = useRef(0);
  const addErrorToastId = `favorite-cart-add-${product.id}`;
  const href = productPath(product);
  const available = variants.filter(v => v.availableQuantity === null || v.availableQuantity > 0);
  const colors = [...new Set(variants.map(v => v.color?.trim() || ""))];
  const visible = variants.filter(v => (v.color?.trim() || "") === color);
  useEffect(() => () => { toast.dismiss(addErrorToastId); }, [addErrorToastId]);
  useEffect(() => {
    if (open && !loading) root.current?.querySelector<HTMLButtonElement>('[role="group"] button:not(:disabled)')?.focus({ preventScroll: true });
  }, [open, loading]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!inFlight.current && !root.current?.contains(event.target as Node)) { request.current++; setLoading(false); setOpen(false); } };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  async function choose() {
    const current = ++request.current;
    setLoading(true); setError(null); setVariants([]); setColor("");
    try {
      const response = await apiFetch(`${API_URL}/api/products/${product.id}`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (current !== request.current) return;
      const next: Variant[] = Array.isArray(data.variants) ? data.variants : [];
      setVariants(next);
      const stocked = next.filter(v => v.availableQuantity === null || v.availableQuantity > 0);
      setColor(stocked[0]?.color?.trim() || next[0]?.color?.trim() || "");
      if (stocked.length === 1 && !stocked[0].size?.trim()) {
        setOpen(false);
        await add(stocked[0], false);
      } else {
        toast.dismiss(addErrorToastId);
        setOpen(true);
      }
    } catch {
      if (current === request.current) {
        const message = "Не удалось загрузить варианты — попробуйте ещё раз";
        if (open) setError(message); else toast.error(message, { id: addErrorToastId });
      }
    } finally { if (current === request.current) setLoading(false); }
  }

  async function add(choice: Variant, inlineError = true) {
    if (inFlight.current) return;
    inFlight.current = true; setAdding(true); setError(null);
    try {
      const cartId = await resolveCartId();
      await addVariantToCart({ cartId, variantId: choice.id });
      toast.dismiss(addErrorToastId);
      emitCartChanged(); setOpen(false); toast.success("Товар добавлен в корзину");
    } catch (cause) {
      const message = cause instanceof CartActionError ? cause.message : "Не удалось добавить товар в корзину — попробуйте ещё раз";
      if (inlineError) setError(message); else toast.error(message, { id: addErrorToastId });
    } finally { inFlight.current = false; setAdding(false); }
  }

  return <li ref={root} className={styles.card} onBlur={event => {
    if (!adding && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) { request.current++; setLoading(false); setOpen(false); }
  }} onKeyDown={event => {
    if (event.key === "Escape" && !adding) { event.stopPropagation(); request.current++; setLoading(false); setOpen(false); root.current?.querySelector<HTMLButtonElement>("[data-size-trigger]")?.focus(); }
  }}>
    <article>
      <div className={styles.mediaContainer}>
      <Link href={href} className={styles.media} prefetch={false} aria-label={`Открыть ${product.title}`}>
        {product.images[0] && !imageFailed ? <Image src={product.images[0]} alt={product.title} fill sizes="(max-width: 899px) 50vw, 340px" className={styles.image} onError={() => setImageFailed(true)} /> : <span className={styles.noImage}>Нет изображения</span>}
      </Link>
      {open && <div id={panelId} className={styles.sizePanel} aria-label="Выбор варианта">
        {loading ? <Loader label="Загрузка вариантов" /> : <>
          {colors.length > 1 && <div className={styles.colorSelect}><FormSelect<string> label="Цвет" value={color} options={colors.map(value => ({ value, label: value || "Без цвета" }))} disabled={adding} onChange={setColor} /></div>}
          {visible.some(v => v.size?.trim()) ? <SizeOptions options={visible} value={null} disabled={adding} onChange={id => { const variant = visible.find(v => v.id === id); if (variant) void add(variant); }} /> : available.length > 0 && <Button variant="primary" className={styles.add} loading={adding} disabled={!visible.some(v => v.availableQuantity === null || v.availableQuantity > 0)} onClick={() => { const variant = visible.find(v => v.availableQuantity === null || v.availableQuantity > 0); if (variant) void add(variant); }}>В корзину</Button>}
          {!available.length && !error && <p className={styles.panelMessage}>Товар закончился</p>}
        </>}
        {adding && <Loader inline label="Добавление в корзину" />}
        {error && <div className={styles.error} role="alert"><p>{error}</p>{!variants.length && <Button variant="secondary" onClick={() => void choose()}>Повторить</Button>}</div>}
      </div>}
      </div>
      <div className={styles.info}>
        <Link href={href} className={styles.productTitle}>{product.title}</Link>
        <LikeButton className={styles.like} liked={isFavorite(product.id)} aria-label={`Убрать из избранного: ${product.title}`}
          onClick={async () => { try { const next = !isFavorite(product.id); await toggle(product.id); onRemove(product.id, next); } catch { toast.error("Не удалось обновить избранное"); } }} />
        <div className={styles.price}>{product.minPrice > 0 ? `${product.minPrice.toLocaleString("ru-RU")} ₽` : "Цена по запросу"}</div>
      </div>
      <Button data-size-trigger variant={open ? "secondary" : "primary"} className={styles.add} loading={loading || adding} disabled={loading || adding}
        aria-expanded={open} aria-controls={panelId} onClick={() => { if (open) { request.current++; setOpen(false); } else void choose(); }}>{open ? visible.some(v => v.size?.trim()) ? "Выберите размер" : "Выберите вариант" : "В корзину"}</Button>
    </article>
  </li>;
}
