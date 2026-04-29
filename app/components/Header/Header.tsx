"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "./Header.module.css";
import { apiFetch, API_URL } from "../../lib/api";
import { useCartCount } from "../../lib/useCartCount";
import { useClientAuth } from "../../lib/useClientAuth";
import { useFavorites } from "../../lib/FavoritesContext";
import { useUserRole } from "../../lib/useUserRole";

type Category = {
  id: number;
  name: string;
};

const banners = [
  {
    text: "Новая коллекция SS26 уже доступна",
    link: "/catalog",
    linkText: "Начать шопинг",
  },
  {
    text: "Бесплатная доставка от 5000 ₽ и возврат 30 дней",
  },
];

const audienceItems = [
  { key: "all", label: "Для всех" },
  { key: "men", label: "Для него" },
  { key: "women", label: "Для нее" },
];

function isSellerRole(role: string | null) {
  return role === "SELLER" || role === "ROLE_SELLER";
}

function HeaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category");
  const activeAudience = searchParams.get("audience") || "all";
  const activeSearch = searchParams.get("q") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [search, setSearch] = useState(activeSearch);
  const [bannerIndex, setBannerIndex] = useState(0);

  const isAuth = useClientAuth();
  const cartCount = useCartCount();
  const role = useUserRole();
  const { count: favoritesCount } = useFavorites();

  useEffect(() => {
    setSearch(activeSearch);
  }, [activeSearch]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoadingCategories(true);

      try {
        const response = await apiFetch(`${API_URL}/api/categories`);

        if (!response.ok) {
          throw new Error("Failed to load categories");
        }

        const data: unknown = await response.json();

        if (!cancelled) {
          setCategories(Array.isArray(data) ? (data as Category[]) : []);
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingCategories(false);
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % banners.length);
    }, 4000);

    return () => window.clearInterval(id);
  }, []);

  function buildCatalogUrl(params: {
    category?: string | null;
    audience?: string | null;
    q?: string | null;
  }) {
    const qs = new URLSearchParams();

    const category =
      params.category === undefined ? activeCategory : params.category;
    const audience =
      params.audience === undefined ? activeAudience : params.audience;
    const q = params.q === undefined ? activeSearch : params.q;

    if (category) qs.set("category", category);
    if (audience && audience !== "all") qs.set("audience", audience);
    if (q) qs.set("q", q);

    const query = qs.toString();
    return query ? `/catalog?${query}` : "/catalog";
  }

  function handleAudienceClick(audience: string) {
    router.push(buildCatalogUrl({ audience }));
  }

  function handleCategoryClick(category: string) {
    const isSame = activeCategory === category;
    router.push(buildCatalogUrl({ category: isSame ? null : category }));
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = search.trim();

    router.push(
      buildCatalogUrl({
        q: trimmed || null,
      })
    );
  }

  const activeBanner = banners[bannerIndex];

  return (
    <header className={styles.header}>
      <div className={styles.banner}>
        <div className={styles.inner}>
          <div className={styles.bannerText}>
            {activeBanner.text}{" "}
            {activeBanner.link ? (
              <Link href={activeBanner.link} className={styles.bannerLink}>
                {activeBanner.linkText}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.top}>
        <div className={styles.inner}>
          <nav className={styles.audience} aria-label="Разделы">
            {audienceItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`${styles.audienceBtn} ${
                  activeAudience === item.key ? styles.audienceBtnActive : ""
                }`}
                onClick={() => handleAudienceClick(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <Link href="/" className={styles.logo} aria-label="РЦМ">
            <Image
              src="/icons/logo-rcm.webp"
              alt="РЦМ"
              width={132}
              height={44}
              className={styles.logoImg}
              priority
            />
          </Link>

          <div className={styles.actions}>
            {isAuth === true && isSellerRole(role) ? (
              <Link href="/seller?tab=orders" className={styles.iconBtn}>
                <Image
                  src="/icons/seller.svg"
                  alt="Seller"
                  width={22}
                  height={22}
                />
              </Link>
            ) : null}

            <Link href="/favorites" className={styles.iconBtn}>
              <span className={styles.iconWrap}>
                <Image
                  src="/icons/like.svg"
                  alt="Favorites"
                  width={22}
                  height={22}
                />
                {favoritesCount > 0 ? (
                  <span className={styles.badge}>{favoritesCount}</span>
                ) : null}
              </span>
            </Link>

            <Link href="/cart" className={styles.iconBtn}>
              <span className={styles.iconWrap}>
                <Image
                  src="/icons/bag.svg"
                  alt="Cart"
                  width={22}
                  height={22}
                />
                {cartCount > 0 ? (
                  <span className={styles.badge}>{cartCount}</span>
                ) : null}
              </span>
            </Link>

            <Link
              href={
                isAuth === true ? "/account?tab=orders" : "/auth/login?next=/account"
              }
              className={styles.iconBtn}
            >
              <Image
                src="/icons/user.svg"
                alt="Profile"
                width={22}
                height={22}
              />
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.inner}>
          <nav className={styles.categories} aria-label="Категории">
            {loadingCategories ? (
              <span className={styles.loading}>Загрузка…</span>
            ) : null}

            {!loadingCategories
              ? categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`${styles.category} ${
                      activeCategory === category.name
                        ? styles.categoryActive
                        : ""
                    }`}
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    {category.name}
                  </button>
                ))
              : null}
          </nav>

          <form className={styles.search} onSubmit={handleSearchSubmit}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Что вы ищете?"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit" className={styles.searchBtn}>
              Поиск
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function Header() {
  return (
    <Suspense fallback={null}>
      <HeaderContent />
    </Suspense>
  );
}