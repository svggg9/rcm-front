"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./Header.module.css";
import { apiFetch } from "../../lib/api";
import { isAuthenticated, clearAuth } from "../../lib/auth";

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

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);

    apiFetch("http://localhost:9696/api/categories")
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

  const isAuth = mounted && isAuthenticated();

  return (
    <header className={styles.header}>
      {/* TOP ROW */}
      <div className={styles.topRow}>
        <div />

        <Link href="/" className={styles.logo}>
          RC MARKET
        </Link>

        <div className={styles.actions}>
        <button title="Поиск">🔍</button>

        <Link href="/account" title="Личный кабинет">
            👤
        </Link>

        <Link href="/cart" title="Корзина">
            🛒
        </Link>

        {!mounted ? null : isAuth ? (
            <button onClick={logout} title="Выйти">
            🚪
            </button>
        ) : (
            <>
            <Link href="/auth/login" title="Войти">🔑</Link>
            <Link href="/auth/register" title="Регистрация">📝</Link>
            </>
        )}
        </div>
      </div>

      {/* CATEGORIES */}
      <nav className={styles.categories}>
        {loading && <span className={styles.loading}>Загрузка…</span>}

          {/* ВСЕ ТОВАРЫ */}
          <span
            className={`${styles.category} ${
              !activeCategory ? styles.active : ""
            }`}
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
