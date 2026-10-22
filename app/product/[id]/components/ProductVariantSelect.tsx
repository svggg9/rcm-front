"use client";
import { useEffect, useId, useRef, useState } from "react";
import { SizeOptions } from "../../../components/ui/SizeOptions";
import { Button } from "../../../components/ui/Button";
import type { Variant } from "../lib/types";
import styles from "./ProductVariantSelect.module.css";
export function ProductVariantSelect({ variants, selectedVariantId, onChange, onAdd, adding, success, className }: {
  variants: Variant[]; selectedVariantId: number | null; onChange: (variantId: number) => void;
  onAdd: (variantId?: number) => void; adding: boolean; success: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[role="group"] button:not(:disabled)')?.focus({ preventScroll: true });
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const selected = variants.find(variant => variant.id === selectedVariantId) ?? (variants.length === 1 ? variants[0] : null);
  const available = variants.some(variant => variant.availableQuantity === null || variant.availableQuantity > 0);
  const hasSizeChoice = variants.some(variant => variant.size?.trim()) || variants.length > 1;
  return <div ref={root} className={styles.field} data-open={open || undefined} onKeyDown={event => {
    if (event.key === "Escape") { event.stopPropagation(); setOpen(false); root.current?.querySelector<HTMLButtonElement>("[data-product-size]")?.focus(); }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <Button type="button" variant="primary" className={className} loading={adding} success={success} disabled={!available}
      data-product-size aria-expanded={hasSizeChoice ? open : undefined} aria-controls={open ? id : undefined}
      onClick={() => { if (hasSizeChoice) setOpen(value => !value); else onAdd(selected?.id); }}>
      {available ? "В корзину" : "Нет в наличии"}
    </Button>
    {open && <div id={id} className={styles.dropdown}><SizeOptions options={variants} value={selected?.id ?? null} disabled={adding || success} onChange={value => { onChange(value); setOpen(false); root.current?.querySelector<HTMLButtonElement>("[data-product-size]")?.focus(); onAdd(value); }} /></div>}
  </div>;
}
