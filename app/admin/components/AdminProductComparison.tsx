"use client";
import { DataTable } from "../../components/ui/DataTable";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getAdminProduct } from "../lib/adminApi";
import { AdminResourceState } from "./AdminWorkspaceControls";
import type { AdminProduct } from "../types";
import styles from "./AdminWorkspace.module.css";
import { PRODUCT_DETAILS_FIELDS } from "../../lib/productDetails";

export function AdminProductComparison({ product }: { product: AdminProduct }) {
  const sourceId = product.revisionSourceId;
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ id: number; data?: AdminProduct; error?: string }>();
  useEffect(() => {
    if (!sourceId) return;
    let active = true;
    void getAdminProduct(sourceId).then(data => { if (active) setResult({ id: sourceId, data }); })
      .catch(reason => { if (active) setResult({ id: sourceId, error: reason instanceof Error ? reason.message : "Не удалось загрузить опубликованную версию" }); });
    return () => { active = false; };
  }, [sourceId, retry]);
  if (!sourceId) return null;
  const original = result?.id === sourceId ? result.data : undefined;
  const fields: { label: string; value: (p: AdminProduct) => string }[] = [
    { label: "Название", value: p => p.title }, { label: "Описание", value: p => p.description },
    { label: "Состав", value: p => p.composition || "—" }, { label: "Категория", value: p => p.category || p.suggestedCategoryName || "—" },
    ...PRODUCT_DETAILS_FIELDS.map(({ key, label }) => ({ label, value: (p: AdminProduct) => p.details?.[key]?.trim() || "—" })),
    { label: "Аудитория", value: p => ({ MEN: "Для него", WOMEN: "Для неё", UNISEX: "Для всех" }[p.audience] || p.audience) },
    { label: "Фотографии", value: p => p.images.join("\n") || "—" },
    { label: "Варианты", value: p => p.variants.map(v => `${v.color || "Без цвета"} | ${v.size || "Без размера"}`).join("\n") },
  ];
  return <section className={styles.comparison}><h2>Что изменилось</h2>
    <AdminResourceState loading={!result || result.id !== sourceId} error={result?.error} onRetry={() => { setResult(undefined); setRetry(value => value + 1); }} />
    {original && <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Сравнение версий товара"><DataTable className={styles.table}><thead><tr><th scope="col">Поле</th><th scope="col">Опубликовано</th><th scope="col">На проверке</th></tr></thead><tbody>{fields.map(({ label, value }) => {
      const before = value(original), after = value(product);
      return <tr key={label} className={before !== after ? styles.changed : undefined}><th scope="row">{label}</th>
        <td>{label === "Фотографии" ? <ComparisonPhotos product={original} /> : before}</td>
        <td>{label === "Фотографии" ? <ComparisonPhotos product={product} /> : after}</td></tr>;
    })}</tbody></DataTable></div>}
  </section>;
}

function ComparisonPhotos({ product }: { product: AdminProduct }) {
  return product.images.length ? <div className={styles.comparisonPhotos}>{product.images.map((src,index) => <Image key={`${src}:${index}`} src={src} alt={`${product.title}, фото ${index+1}`} width={80} height={108} sizes="80px" />)}</div> : <span>Фото не загружены</span>;
}
