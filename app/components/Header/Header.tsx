"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
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

function HeaderContent() {
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
      <div className={styles.banner}>
        <div className={styles.inner}>
          <div className={styles.bannerText}>
            {banners[bannerIndex].text}{" "}
            {banners[bannerIndex].link && (
              <Link href={banners[bannerIndex].link} className={styles.bannerLink}>
                {banners[bannerIndex].linkText}
              </Link>
            )}
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

          <Link href="/" className={styles.logo}>
            RCMARKET
          </Link>

          <div className={styles.actions}>
            {isAuth === true && role === "ROLE_SELLER" && (
              <Link href="/seller?tab=orders" className={styles.iconBtn}>
                <img src="/icons/seller.svg" alt="Seller" />
              </Link>
            )}

            <Link href="/favorites" className={styles.iconBtn}>
              <span className={styles.iconWrap}>
                <img src="/icons/like.svg" alt="Favorites" />
                {count > 0 && <span className={styles.badge}>{count}</span>}
              </span>
            </Link>

            <Link href="/cart" className={styles.iconBtn}>
              <span className={styles.iconWrap}>
                <img src="/icons/bag.svg" alt="Cart" />
                {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
              </span>
            </Link>

            <Link
              href={isAuth === true ? "/account?tab=orders" : "/auth/login?next=/account"}
              className={styles.iconBtn}
            >
              <img src="/icons/user.svg" alt="Profile" />
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.inner}>
          <nav className={styles.categories} aria-label="Категории">
            {loading && <span className={styles.loading}>Загрузка…</span>}

            {!loading &&
              categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.category} ${
                    activeCategory === cat.name ? styles.categoryActive : ""
                  }`}
                  onClick={() => handleCategoryClick(cat.name)}
                >
                  {cat.name}
                </button>
              ))}
          </nav>

          <form className={styles.search} onSubmit={handleSearchSubmit}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Что вы ищете?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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