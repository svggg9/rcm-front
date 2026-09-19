"use client";

import { toast } from "sonner";
import { LikeButton } from "../../components/ui/LikeButton";

import {
  type FavoriteBrand,
  useFavoriteBrands,
} from "../../lib/favoriteBrands";

export function BrandFavoriteButton({ brand }: { brand: FavoriteBrand }) {
  const { isFavorite, loading, toggle } = useFavoriteBrands();
  const active = isFavorite(brand.id);

  return (
    <LikeButton
      liked={active}
      onClick={async () => {
        try {
          await toggle(brand);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Не удалось обновить избранные бренды"
          );
        }
      }}
      disabled={loading}
      aria-label={
        active ? "Убрать бренд из сохранённых" : "Сохранить бренд"
      }
    />
  );
}
