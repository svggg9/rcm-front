"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { setAuth, getCartId } from "../../lib/auth";
import { apiFetch, API_URL } from "../../lib/api";
import {
  getGuestFavoriteIds,
  syncFavoritesAfterLogin,
  clearGuestFavoriteIds,
} from "../../lib/favorites";

import styles from "./Login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    try {
      const cartId = getCartId();

      const response = await apiFetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ username, password, cartId }),
      });

      if (!response.ok) {
        throw new Error("Неверный логин или пароль");
      }

      const data: { token: string; cartId: string } = await response.json();
      const guestFavoriteIds = getGuestFavoriteIds();

      setAuth(data.token, data.cartId);

      if (guestFavoriteIds.length > 0) {
        await syncFavoritesAfterLogin(guestFavoriteIds);
        clearGuestFavoriteIds();
        window.dispatchEvent(new Event("auth-changed"));
      }

      router.replace(next);
    } catch (error) {
      setError((error as Error).message);
    }
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Вход</h1>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              Логин
              <input
                className={styles.input}
                placeholder="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoComplete="username"
              />
            </label>

            <label className={styles.label}>
              Пароль
              <input
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            {error ? <div className={styles.error}>{error}</div> : null}

            <button type="submit" className={styles.button}>
              Войти
            </button>

            <div className={styles.hint}>
              Нет аккаунта?{" "}
              <Link
                className={styles.link}
                href={`/auth/register?next=${encodeURIComponent(next)}`}
              >
                Регистрация
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}