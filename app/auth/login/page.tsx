"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuth, getCartId } from "../../lib/auth";
import { apiFetch, API_URL } from "../../lib/api"; // если API_URL не экспортится — убери и верни хардкод
import styles from "./Login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const cartId = getCartId();

      const res = await apiFetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ username, password, cartId }),
      });

      if (!res.ok) {
        throw new Error("Неверный логин или пароль");
      }

      const data: { token: string; cartId: string } = await res.json();

      setAuth(data.token, data.cartId);

      // важно: replace, чтобы back не возвращал на /auth/login
      router.replace(next);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
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
              onChange={(e) => setUsername(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.button}>
            Войти
          </button>

          <div className={styles.hint}>
            Нет аккаунта?{" "}
            <a className={styles.link} href={`/auth/register?next=${encodeURIComponent(next)}`}>
              Регистрация
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
