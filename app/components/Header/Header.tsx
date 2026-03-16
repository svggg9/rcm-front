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

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const isAuth = useClientAuth();
  const cartCount = useCartCount();
  const role = useUserRole();

  const { count } = useFavorites();

  useEffect(() => {
    apiFetch(`${API_URL}/api/categories`)
      .then((r: Response) => r.json())
      .then((data: Category[]) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.topBanner}>
        <img src="/icons/111.svg" alt="" className={styles.topBannerImg} />
      </div>

      <div className={styles.topRow}>
        <div />

        {/* <Link href="/" className={styles.logo}>
          RC MARKET
        </Link> */}

        <div className={styles.actions}>
          {isAuth === true && role === "ROLE_SELLER" && (
            <Link href="/seller" className={styles.iconButton}>
              <img src="/icons/seller.svg" alt="Seller" />
            </Link>
          )}

          <Link href="/cart" className={styles.iconButton}>
            <span className={styles.cart}>
              <img src="/icons/bag.svg" alt="Cart" />
              {cartCount > 0 && (
                <span className={styles.cartBadge}>{cartCount}</span>
              )}
            </span>
          </Link>

          <Link href="/favorites" className={styles.iconButton}>
            <span className={styles.cart}>
              <img src="/icons/like.svg" alt="Favorites" />
              {count > 0 && <span className={styles.cartBadge}>{count}</span>}
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

      <nav className={styles.categories}>
        {loading && <span className={styles.loading}>Загрузка…</span>}

        <span
          className={`${styles.category} ${!activeCategory ? styles.active : ""}`}
          onClick={() => router.push("/")}
        >
          Все
        </span>

        {!loading &&
          categories.map((cat) => (
            <span
              key={cat.id}
              className={`${styles.category} ${
                activeCategory === cat.name ? styles.active : ""
              }`}
              onClick={() =>
                router.push(`/?category=${encodeURIComponent(cat.name)}`)
              }
            >
              {cat.name}
            </span>
          ))}
      </nav>
    </header>
  );
}