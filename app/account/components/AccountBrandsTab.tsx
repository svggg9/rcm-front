"use client";

import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

import { EmptyState } from "../../components/ui/EmptyState";
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

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h2>Мои бренды</h2>
        {!loading ? <span>{brands.length}</span> : null}
      </header>

      {!loading && brands.length === 0 ? (
        <EmptyState
          icon="heart"
          tone="gold"
          title="Сохранённых брендов пока нет"
          text="Нажимайте на сердце на странице бренда, чтобы добавить его сюда."
        />
      ) : (
        <ul className={styles.grid}>
          {brands.map((brand) => (
            <li className={styles.card} key={brand.id}>
              <Link href={`/brand/${brand.slug}`} className={styles.link}>
                <span className={styles.logo}>
                  {brand.logoUrl ? (
                    <Image
                      src={brand.logoUrl}
                      alt=""
                      fill
                      sizes="160px"
                      className={styles.logoImage}
                    />
                  ) : (
                    <span>{brand.name.slice(0, 1)}</span>
                  )}
                </span>
                <strong>{brand.name}</strong>
                {brand.country ? <small>{brand.country}</small> : null}
              </Link>

              <button
                type="button"
                className={styles.remove}
                onClick={() => void removeBrand(brand)}
                aria-label={`Убрать ${brand.name} из сохранённых`}
              >
                <Image
                  src="/icons/like-filled.svg"
                  alt=""
                  width={18}
                  height={18}
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
