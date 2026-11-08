"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CabinetSkeleton } from "../../components/ui/CabinetSkeleton";
import { Icon } from "../../components/ui/Icon";
import { Price } from "../../components/ui/Price";
import { RequestError } from "../../components/ui/RequestError";
import { toApiError } from "../../lib/apiErrors";
import { formatRussianPhone } from "../../lib/phone";
import { productPath } from "../../lib/productUrls";
import {
  getAdminSellerBrandPreview,
  type AdminSellerBrandPreview,
} from "../lib/adminSellerBrandPreview";
import type { SellerApplicationStatus } from "../types";

import styles from "./AdminSellerBrandProfile.module.css";

type Props = {
  userId: number;
  brandName: string;
  brandId?: number;
  status: SellerApplicationStatus;
};

export function AdminSellerBrandProfile({ userId, brandName, brandId, status }: Props) {
  const [retryKey, setRetryKey] = useState(0);
  const identity = `${userId}:${brandId??""}:${brandName}:${status}`;
  const requestKey = `${identity}:${retryKey}`;
  const [result, setResult] = useState<{ identity: string; requestKey: string; preview: AdminSellerBrandPreview | null; error?: string }>();
  const current = result?.identity === identity ? result : undefined;
  const preview = current?.preview ?? null;
  const loading = current?.requestKey !== requestKey;
  const error = loading ? undefined : current?.error;
  const retry = () => setRetryKey(value => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    void getAdminSellerBrandPreview({
      userId,
      brandName,
      brandId,
      allowNameFallback: status === "APPROVED",
      signal: controller.signal,
    })
      .then((preview) => {
        if (active) setResult({ identity, requestKey, preview });
      })
      .catch((reason: unknown) => {
        if (!active || controller.signal.aborted) return;
        setResult(previous => ({ identity, requestKey,
          preview: previous?.identity === identity ? previous.preview : null,
          error: toApiError(reason, "Не удалось загрузить данные бренда — попробуйте ещё раз").message,
        }));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [brandId, brandName, identity, requestKey, status, userId]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          (preview?.products ?? [])
            .map((product) => product.category.trim())
            .filter(Boolean)
        )
      ),
    [preview?.products]
  );

  if (loading && !preview) {
    return (
      <section className={styles.loadingSection} aria-label="Данные бренда">
        <CabinetSkeleton variant="grid" rows={4} />
      </section>
    );
  }

  if (error && !preview) {
    return (
      <section className={styles.emptySection}>
        <RequestError message={error} onRetry={retry} loading={loading} />
      </section>
    );
  }

  if (!preview) {
    return (
      <section className={styles.emptySection}>
        <div className={styles.emptyIcon} aria-hidden="true">
          <Icon name="store" size={22} strokeWidth={1.4} />
        </div>
        <div>
          <h2>Публичный профиль бренда ещё не создан</h2>
          <p>
            {status === "NEW"
              ? "Галерея и товары появятся здесь после одобрения заявки и создания бренда"
              : "У заявки пока нет надёжно связанного бренда"}
          </p>
        </div>
      </section>
    );
  }

  const { reference, brand, products, totalProducts } = preview;
  const publicSlug = brand?.slug ?? reference.slug;
  const visibleProducts = products.slice(0, 12);

  return (
    <div className={styles.panel}>
      {error && <RequestError variant="inline" message={error} text="Показаны ранее загруженные данные бренда" onRetry={retry} loading={loading} />}
      <section className={styles.profileSection}>
        <div className={styles.profileHeader}>
          <div className={styles.brandIdentity}>
            {brand?.wordmarkUrl || reference.wordmarkUrl ? (
              <div className={styles.wordmark}>
                <Image
                  src={brand?.wordmarkUrl || reference.wordmarkUrl || ""}
                  alt={brand?.name ?? reference.name}
                  fill
                  sizes="260px"
                />
              </div>
            ) : (
              <h2>{brand?.name ?? reference.name}</h2>
            )}
            <span>Публичный профиль бренда</span>
          </div>

          {reference.isActive ? (
            <Link href={`/brand/${publicSlug}`} className={styles.publicLink}>
              Открыть страницу
              <Icon name="arrow-up-right" size={16} strokeWidth={1.45} />
            </Link>
          ) : null}
        </div>

        {brand?.description ? (
          <p className={styles.publicDescription}>{brand.description}</p>
        ) : null}

        <div className={styles.profileFacts}>
          <ProfileFact label="ID бренда" value={String(reference.id)} />
          <ProfileFact
            label="Публичный статус"
            value={reference.isActive ? "Включён" : "Выключен"}
          />
          <ProfileFact
            label="Товары"
            value={totalProducts.toLocaleString("ru-RU")}
          />
          <ProfileFact
            label="Подборки"
            value={String(brand?.collectionsCount ?? 0)}
          />
          <ProfileFact label="Страна" value={brand?.country || "—"} />
          <ProfileFact
            label="Год основания"
            value={brand?.foundationYear ? String(brand.foundationYear) : "—"}
          />
          <ProfileFact label="Slug" value={publicSlug} />
          <ProfileFact label="Сайт" value={brand?.website || "—"} />
          <ProfileFact label="Telegram" value={brand?.telegram || "—"} />
          <ProfileFact label="VK" value={brand?.vk || "—"} />
        </div>

        <div className={styles.ownerFacts}>
          <ProfileFact
            label="Владелец"
            value={
              reference.ownerDisplayName || reference.ownerUsername || "Не указан"
            }
          />
          <ProfileFact label="Почта владельца" value={reference.ownerEmail || "—"} />
          <ProfileFact
            label="Телефон владельца"
            value={
              reference.ownerPhone
                ? formatRussianPhone(reference.ownerPhone)
                : "—"
            }
          />
          <ProfileFact
            label="Категории товаров"
            value={categories.length ? categories.join(", ") : "—"}
          />
        </div>
      </section>

      {brand?.images.length ? (
        <section className={styles.mediaSection}>
          <div className={styles.sectionHeader}>
            <h2>Медиагалерея бренда</h2>
            <span>{brand.images.length}</span>
          </div>
          <div className={styles.brandGallery}>
            {brand.images.map((image) => (
              <div className={styles.brandImage} key={image.id}>
                <Image
                  src={image.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 720px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.productsSection}>
        <div className={styles.sectionHeader}>
          <h2>Товары бренда</h2>
          <span>{totalProducts.toLocaleString("ru-RU")}</span>
        </div>

        {visibleProducts.length ? (
          <div className={styles.productGrid}>
            {visibleProducts.map((product) => (
              <Link
                href={productPath(product)}
                className={styles.productCard}
                key={product.id}
              >
                <span className={styles.productImage}>
                  {product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.title}
                      fill
                      sizes="(max-width: 560px) 50vw, (max-width: 1100px) 25vw, 220px"
                    />
                  ) : (
                    <span className={styles.noImage}>Нет изображения</span>
                  )}
                </span>
                <span className={styles.productCategory}>
                  {product.category || "Без категории"}
                </span>
                <strong>{product.title}</strong>
                <span className={styles.productPrice}>
                  {product.minPrice > 0 ? (
                    <Price amount={product.minPrice} />
                  ) : (
                    "Цена по запросу"
                  )}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className={styles.productsEmpty}>
            На публичной странице пока нет активных товаров
          </p>
        )}

        {reference.isActive && totalProducts > visibleProducts.length ? (
          <Link href={`/brand/${publicSlug}`} className={styles.allProductsLink}>
            Посмотреть все товары
            <Icon name="chevron-right" size={16} strokeWidth={1.45} />
          </Link>
        ) : null}
      </section>
    </div>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.profileFact}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
