"use client";

import { useState, type ReactNode } from "react";
import { FormSelect } from "../../components/ui/FormSelect";
import { EmptyState } from "../../components/ui/EmptyState";
import { SellerStorefrontCollections } from "./SellerStorefrontCollections";
import type { SellerBrand } from "../types";

export function SellerCollectionsTab({ brands, renderPanel }: { brands: SellerBrand[]; renderPanel: (action: ReactNode, content: ReactNode) => ReactNode }) {
  const [brandId, setBrandId] = useState<number | "">(brands[0]?.id ?? "");
  const brand = brands.find(item => item.id === brandId) ?? brands[0];
  if (!brand) return renderPanel(null, <EmptyState title="Магазин пока не создан" />);
  return <SellerStorefrontCollections key={brand.id} brandId={brand.id} renderPanel={(action, content) => renderPanel(action, <>
    {brands.length > 1 ? <FormSelect<number> label="Бренд" required value={brand.id}
      options={brands.map(item => ({ value: item.id, label: item.name }))} onChange={setBrandId} /> : null}
    {content}
  </>)} />;
}
