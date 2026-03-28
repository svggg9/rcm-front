"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./Header.module.css";
import { apiFetch, API_URL } from "../../lib/api";
import { useClientAuth } from "../../lib/useClientAuth";
import { useCartCount } from "../../lib/useCartCount";
import { useUserRole } from "../../lib/useUserRole";
import { useFavorites } from "../../lib/FavoritesContext";

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

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category");
  const activeAudience = searchParams.get("audience") || "all";
  const activeSearch = searchParams.get("q") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(activeSearch);
  const [bannerIndex, setBannerIndex] = useState(0);

  const isAuth = useClientAuth();
  const cartCount = useCartCount();
  const role = useUserRole();
  const { count } = useFavorites();

  useEffect(() => {
    setSearch(activeSearch);
  }, [activeSearch]);

  useEffect(() => {
    apiFetch(`${API_URL}/api/categories`)
      .then((r: Response) => r.json())
      .then((data: Category[]) => {
        setCategories(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setBannerIndex((i) => (i + 1) % banners.length);
    }, 4000);

    return () => clearInterval(id);
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
    router.push(
      buildCatalogUrl({
        audience,
      })
    );
  }

  function handleCategoryClick(category?: string) {
    const isSame = activeCategory === category;

    router.push(
      buildCatalogUrl({
        category: isSame ? null : category || null,
      })
    );
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = search.trim();

    router.push(
      buildCatalogUrl({
        q: trimmed || null,
      })
    );
  }

  return (
    <header className={styles.header}>
      <div className={styles.topBannerBar}>
        <div className={styles.topBannerItem}>
          <span>
            {banners[bannerIndex].text}{" "}
            {banners[bannerIndex].link && (
              <a href={banners[bannerIndex].link} className={styles.topBannerLink}>
                {banners[bannerIndex].linkText}
              </a>
            )}
          </span>
        </div>
      </div>

      <div className={styles.topRow}>
        <nav className={styles.audienceNav} aria-label="Разделы">
          {audienceItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`${styles.audienceButton} ${
                activeAudience === item.key ? styles.audienceActive : ""
              }`}
              onClick={() => handleAudienceClick(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <Link href="/" className={styles.logo}>
          RC MARKET
        </Link>

        <div className={styles.actions}>
          {isAuth === true && role === "ROLE_SELLER" && (
            <Link href="/seller" className={styles.iconButton}>
              <img src="/icons/seller.svg" alt="Seller" />
            </Link>
          )}

          <Link href="/favorites" className={styles.iconButton}>
            <span className={styles.cart}>
              <img src="/icons/like.svg" alt="Favorites" />
              {count > 0 && <span className={styles.cartBadge}>{count}</span>}
            </span>
          </Link>

          <Link href="/cart" className={styles.iconButton}>
            <span className={styles.cart}>
              <img src="/icons/bag.svg" alt="Cart" />
              {cartCount > 0 && (
                <span className={styles.cartBadge}>{cartCount}</span>
              )}
            </span>
          </Link>

          <Link
            href={isAuth === true ? "/account" : "/auth/login?next=/account"}
            className={styles.iconButton}
          >
            <img src="/icons/user.svg" alt="Profile" />
          </Link>
        </div>
      </div>

      <div className={styles.bottomRow}>
        <nav className={styles.categories} aria-label="Категории">
          {loading && <span className={styles.loading}>Загрузка…</span>}

          {!loading &&
            categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.category} ${
                  activeCategory === cat.name ? styles.active : ""
                }`}
                onClick={() => handleCategoryClick(cat.name)}
              >
                {cat.name}
              </button>
            ))}
        </nav>

        <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Что вы ищете?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className={styles.searchButton}>
            Поиск
          </button>
        </form>
      </div>
    </header>
  );
}