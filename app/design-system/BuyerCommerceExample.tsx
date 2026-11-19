"use client";

import { useState, type MouseEvent } from "react";
import { Button } from "../components/ui/Button";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { CatalogFiltersDrawer } from "../components/Catalog/CatalogFiltersDrawer";
import type { CatalogCategoryGroup, CatalogFilterSelection } from "../components/Catalog/catalogTypes";
import { ProductInfoPanel } from "../product/[id]/components/ProductInfoPanel";
import type { Product, Variant } from "../product/[id]/lib/types";
import styles from "./BuyerCommerceExample.module.css";

type Mode = "sizes" | "one" | "unavailable" | "loading" | "seller";
const modes: { value: Mode; label: string }[] = [
  { value: "sizes", label: "Размеры" }, { value: "one", label: "Без размера" },
  { value: "unavailable", label: "Нет в наличии" }, { value: "loading", label: "Добавление" },
  { value: "seller", label: "Вид продавца" },
];
const categories: CatalogCategoryGroup[] = [{ name: "Одежда", value: "clothing", categories: [
  { id: 1, name: "Рубашки", label: "Рубашки", parentId: null, slug: "shirts", sortOrder: 1, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
  { id: 2, name: "Футболки", label: "Футболки", parentId: null, slug: "t-shirts", sortOrder: 2, isActive: true, effectiveActive: true, productCount: 2, subtreeProductCount: 2 },
] }];
const initialFilters: CatalogFilterSelection = { categories: [], brands: [], sizes: [], audience: "all", sort: "" };
const variants: Variant[] = [
  { id: 1, colorwayId: 1, size: "S", color: "Молочный", price: 5900, availableQuantity: 5, sku: "" },
  { id: 2, colorwayId: 1, size: "M", color: "Молочный", price: 5900, availableQuantity: 3, sku: "" },
  { id: 3, colorwayId: 1, size: "L", color: "Молочный", price: 5900, availableQuantity: 0, sku: "" },
  { id: 4, colorwayId: 2, size: "M", color: "Чёрный", price: 5900, availableQuantity: 2, sku: "" },
];
const product: Product = { id: 0, sellerId: 0, title: "Рубашка из хлопка", brand: "Пример бренда", category: "Рубашки",
  description: "Рубашка свободного кроя из хлопка", composition: "Хлопок 100%", images: ["/examples/demo-shirt-front.svg"], variants,
  colorways: [{ id: 1, color: "Молочный", images: ["/examples/demo-shirt-front.svg"] }, { id: 2, color: "Чёрный", images: [] }] };

export function BuyerCommerceExample() {
  const [mode, setMode] = useState<Mode>("sizes");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState(initialFilters);
  const [filterMessage, setFilterMessage] = useState("");
  return <div className={styles.example}>
    <h3>Покупка товара</h3>
    <p>Рабочая панель товара с выбором цвета, размера и состояниями покупки. Действия выполняются только в примере</p>
    <SegmentedControl items={modes} value={mode} onChange={setMode} ariaLabel="Состояние покупки в примере" />
    <PurchaseDemo key={mode} mode={mode} />
    <h3>Фильтры каталога</h3>
    <p>Рабочая панель категорий, брендов, размеров и цены на условных данных</p>
    <div><Button type="button" variant="secondary" onClick={() => setOpen(true)}>Открыть фильтры</Button></div>
    <p className={styles.note} role="status">{filterMessage || "Фильтры применяются только к примеру"}</p>
    {open && <CatalogFiltersDrawer open categoryGroups={categories} brands={["Пример бренда", "Другой бренд"]}
      sizes={[{ id: 1, name: "S" }, { id: 2, name: "M" }, { id: 3, name: "L" }]} initialFilters={filter} pending={false}
      onClose={() => setOpen(false)} onApply={value => { setFilter(value); setOpen(false); setFilterMessage("Фильтры применены к примеру"); }} />}
  </div>;
}

function PurchaseDemo({ mode }: { mode: Mode }) {
  const [color, setColor] = useState(1);
  const [variant, setVariant] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const options = mode === "one" ? [{ ...variants[0], size: "", colorwayId: 1 }] : variants.filter(item => item.colorwayId === color)
    .map(item => mode === "unavailable" ? { ...item, availableQuantity: 0 } : item);
  const sample = mode === "one" ? { ...product, colorways: [] } : product;
  const selected = options.find(item => item.id === variant) ?? null;
  const intercept = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('button[aria-label="Поделиться товаром"]') || target?.closest("a")) {
      event.preventDefault(); event.stopPropagation(); setMessage("Действие показано только в примере");
    }
  };
  return <div className={styles.purchase}>
    <div className={styles.preview} onClickCapture={intercept} onAuxClickCapture={intercept}>
      <ProductInfoPanel product={sample} variants={options} selectedVariantId={variant} selectedVariant={selected}
        onChangeVariant={setVariant} currentPrice={selected?.price ?? 5900} adding={mode === "loading"} addSuccess={success}
        isFav={liked} favoritePending={false} onToggleFavorite={() => setLiked(current => !current)}
        onAddToCart={id => { setSuccess(true); setMessage(id ? `Размер добавлен только в пример` : "Товар добавлен только в пример"); }}
        isSellerView={mode === "seller"} onEditProduct={() => setMessage("Открытие редактора показано только в примере")}
        selectedColorwayId={color} onChangeColorway={value => { setColor(value); setVariant(null); setSuccess(false); }} />
    </div>
    {success && <div><Button type="button" variant="ghost" onClick={() => { setSuccess(false); setMessage(""); }}>Повторить пример</Button></div>}
    <p className={styles.note} role="status">{message || "Настоящие корзина и избранное не меняются"}</p>
  </div>;
}
