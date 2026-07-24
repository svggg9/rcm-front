"use client";

import Image from "next/image";
import { toast } from "sonner";

import {
  type FavoriteBrand,
  useFavoriteBrands,
} from "../../lib/favoriteBrands";

import styles from "./BrandPage.module.css";

export function BrandFavoriteButton({ brand }: { brand: FavoriteBrand }) {
  const { isFavorite, loading, toggle } = useFavoriteBrands();
  const active = isFavorite(brand.id);

  return (
    <button
      type="button"
      className={`${styles.favoriteButton} ${
        active ? styles.favoriteButtonActive : ""
      }`}
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
      aria-pressed={active}
      aria-label={
        active ? "Убрать бренд из сохранённых" : "Сохранить бренд"
      }
    >
      <Image
        src={active ? "/icons/like-filled.svg" : "/icons/like.svg"}
        alt=""
        width={22}
        height={22}
        aria-hidden="true"
      />
    </button>
  );
}
