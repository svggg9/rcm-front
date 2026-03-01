"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./Header.module.css";
import { apiFetch, API_URL } from "../../lib/api"; // если API_URL не экспортится — убери и верни хардкод
import { clearAuth } from "../../lib/auth";
import { useClientAuth } from "../../lib/useClientAuth";
import { useCartCount } from "../../lib/useCartCount";
import { useUserRole } from "../../lib/useUserRole";

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

  useEffect(() => {
    apiFetch(`${API_URL}/api/categories`) // если нет API_URL — замени на "http://localhost:9696/api/categories"
      .then((r: Response) => r.json())
      .then((data: Category[]) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function logout() {
    clearAuth();
    router.push("/");
  }

  return (
    <header className={styles.header}>
      {/* TOP BANNER */}
<div className={styles.topBanner}>
  <img src="/icons/111.svg" alt="" className={styles.topBannerImg} />
</div>
      {/* TOP ROW */}
      <div className={styles.topRow}>
        <div />

        <Link href="/" className={styles.logo}>
          RC MARKET
        </Link>

        <div className={styles.actions}>
          {/* Seller cabinet */}
          {isAuth === true && role === "ROLE_SELLER" && (
            <Link
              href="/seller"
              title="Кабинет продавца"
              className={styles.iconButton}
            >
              <img src="/icons/seller.svg" alt="Seller" />
            </Link>
          )}

          {/* CART */}
          <Link href="/cart" title="Корзина" className={styles.iconButton}>
            <span className={styles.cart}>
              <img src="/icons/bag.svg" alt="Cart" />
              {cartCount > 0 && (
                <span className={styles.cartBadge}>{cartCount}</span>
              )}
            </span>
          </Link>

          {/* PROFILE — всегда показываем */}
          <Link
            href={
              isAuth === true
                ? "/account"
                : "/auth/login?next=/account"
            }
            title="Профиль"
            className={styles.iconButton}
          >
            <img src="/icons/profile.svg" alt="Profile" />
          </Link>

          {/* AUTH */}
          {isAuth === null ? null : isAuth ? (
            <button
              onClick={logout}
              title="Выйти"
              className={styles.iconButton}
              type="button"
            >
              <img src="/icons/login.svg" alt="Logout" />
            </button>
          ) : (
            <Link href="/auth/login" title="Войти" className={styles.iconButton}>
              <img src="/icons/login.svg" alt="Login" />
            </Link>
          )}
        </div>
      </div>

      {/* CATEGORIES */}
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
