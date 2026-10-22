"use client";

import { toast } from "@/app/components/ui/toast";
import { LikeButton } from "../../components/ui/LikeButton";
import { Button } from "../../components/ui/Button";

import {
  type FavoriteBrand,
  useFavoriteBrands,
} from "../../lib/favoriteBrands";

export function BrandFavoriteButton({ brand }: { brand: FavoriteBrand }) {
  const { isFavorite, loading, error, pendingIds, reload, toggle } = useFavoriteBrands();
  const active = isFavorite(brand.id);

  if (error) return <Button variant="ghost" loading={loading} disabled={pendingIds.length > 0}
    title={error.message} aria-label={`${error.message} — повторить загрузку`}
    onClick={() => void reload()}>Повторить загрузку</Button>;

  return (
    <LikeButton
      liked={active}
      onClick={async () => {
        try {
          const result = await toggle(brand);
          if (result !== undefined) toast.dismiss(`favorite-brand-${brand.id}`);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Не удалось обновить избранные бренды",
            { id: `favorite-brand-${brand.id}` },
          );
        }
      }}
      disabled={loading}
      pending={pendingIds.includes(brand.id)}
      aria-label={
        active ? "Убрать бренд из сохранённых" : "Сохранить бренд"
      }
    />
  );
}
