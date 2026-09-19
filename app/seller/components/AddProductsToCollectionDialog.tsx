"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { FormMultiSelect } from "../../components/ui/FormMultiSelect";
import { getSellerBrands, getSellerStorefrontCollections } from "../lib/sellerBrandApi";
import { apiFetch, API_URL } from "../../lib/api";
import type { SellerProductListItem } from "../types";

type CollectionOption = { id: number; brandId: number; key: string; label: string };

export function AddProductsToCollectionDialog({ products, onClose, onSuccess }: {
  products: SellerProductListItem[];
  onClose: () => void;
  onSuccess: (collectionCount: number) => void;
}) {
  const router = useRouter();
  const [options, setOptions] = useState<CollectionOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    void getSellerBrands().then(async brands => {
      const groups = await Promise.all(brands.map(async brand => {
        const collections = await getSellerStorefrontCollections(brand.id);
        return collections.map(collection => ({ id: collection.id, brandId: brand.id, key: `${brand.id}:${collection.id}`,
          label: brands.length > 1 ? `${brand.name}: ${collection.title}` : collection.title }));
      }));
      if (mounted) setOptions(groups.flat());
    }).catch(() => { if (mounted) setError("Не удалось загрузить подборки"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [retry]);

  async function add() {
    if (pending.current) return;
    const collections = options.filter(option => selected.includes(option.key));
    if (!collections.length) { setError("Выберите хотя бы одну подборку"); return; }
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      const productIds = [...new Set(products.map(product => product.id))];
      const responses = await Promise.all(collections.map(collection =>
        apiFetch(`${API_URL}/api/seller/brands/${collection.brandId}/collections/${collection.id}/products`, {
          method: "POST", body: JSON.stringify({ productIds }),
        })
      ));
      const failedResponse = responses.find(response => !response.ok);
      if (failedResponse) {
        const body = await failedResponse.json().catch(() => null);
        throw new Error(typeof body?.message === "string" ? body.message : "Не удалось добавить товары в подборки");
      }
      onSuccess(collections.length);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось добавить товары в подборку");
    } finally { pending.current = false; setSaving(false); }
  }

  return <Dialog title="Добавить в подборку" busy={saving} onClose={onClose} actions={<>
    <Button variant="secondary" disabled={saving} onClick={onClose}>Отмена</Button>
    {options.length > 0 ? <Button variant="primary" loading={saving} disabled={loading} onClick={() => void add()}>Добавить</Button>
      : !loading ? <Button variant="secondary" onClick={() => router.push("/seller?tab=products&section=collections")}>Создать подборку</Button> : null}
  </>}>
    {loading ? <div role="status" aria-label="Загрузка подборок"><span className="buttonLoader" style={{ display: "inline-block" }} aria-hidden="true" /></div>
      : options.length ? <FormMultiSelect<string> label="Подборки" placeholder="Выберите подборки" required
          values={selected} disabled={saving} options={options.map(option => ({ value: option.key, label: option.label }))}
          onChange={values => { setSelected(values); setError(null); }} />
        : !error ? <p>Подборок пока нет</p> : null}
    {error ? <div className="alertDanger" role="alert">{error}
      {!options.length && !loading ? <Button variant="tertiary" onClick={() => setRetry(value => value + 1)}>Повторить</Button> : null}
    </div> : null}
  </Dialog>;
}
