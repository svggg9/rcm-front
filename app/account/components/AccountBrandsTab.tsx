"use client";

import Image from "next/image";
import Link from "next/link";
import { toast } from "@/app/components/ui/toast";

import { AccountSkeleton } from "./AccountSkeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { LikeButton } from "../../components/ui/LikeButton";
import { useFavoriteBrands } from "../../lib/favoriteBrands";

import styles from "./AccountBrandsTab.module.css";

export function AccountBrandsTab() {
  const { brands, loading, toggle } = useFavoriteBrands();

  async function removeBrand(brand: (typeof brands)[number]) {
    try {
      await toggle(brand);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось удалить бренд из сохранённых"
      );
    }
  }

  if (loading) return <AccountSkeleton variant="brands" />;

  return (
    <section className={styles.page}>
      {brands.length === 0 ? (
        <EmptyState
          title="Сохранённых брендов пока нет"
          text="Нажмите на сердце на странице бренда"
          actions={<Link href="/catalog" className="buttonPrimary">Перейти в каталог</Link>}
        />
      ) : (
        <ul className={styles.grid}>
          {brands.map((brand) => (
            <li className={styles.card} key={brand.id}>
              <Link href={`/brand/${brand.slug}`} className={styles.link}>
                <span className={styles.logo}>
                  {brand.images?.[0]?.imageUrl || brand.logoUrl ? (
                    <Image
                      src={brand.images?.[0]?.imageUrl ?? brand.logoUrl!}
                      alt=""
                      fill
                      sizes="160px"
                      className={
                        brand.images?.[0]?.imageUrl
                          ? styles.brandPhoto
                          : styles.logoImage
                      }
                    />
                  ) : (
                    <span>{brand.name.slice(0, 1)}</span>
                  )}
                </span>
                <strong>{brand.name}</strong>
                {brand.country ? <small>{brand.country}</small> : null}
              </Link>

              <LikeButton
                liked
                className={styles.remove}
                onClick={() => removeBrand(brand)}
                aria-label={`Убрать ${brand.name} из сохранённых`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
