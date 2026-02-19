"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, API_URL } from "../../lib/api";
import { getCartId, setAuth } from "../../lib/auth";
import styles from "./Register.module.css";

export default function RegisterPage() {
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
      // 1) register
      const reg = await apiFetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (!reg.ok) {
        const text = await reg.text().catch(() => "");
        throw new Error(text || "Ошибка регистрации");
      }

      // 2) autologin (важно: передаём guest cartId, чтобы бэк сделал merge)
      const cartId = getCartId();

      const login = await apiFetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ username, password, cartId }),
      });

      if (!login.ok) {
        const text = await login.text().catch(() => "");
        throw new Error(text || "Регистрация успешна, но вход не выполнен");
      }

      const data: { token: string; cartId: string } = await login.json();

      // 3) сохранить auth + userCartId, триггернуть события
      setAuth(data.token, data.cartId);

      // 4) go next
      router.replace(next);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Регистрация</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Логин
            <input
              className={styles.input}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.button}>
            Зарегистрироваться
          </button>

          <div className={styles.hint}>
            Уже есть аккаунт?{" "}
            <a
              className={styles.link}
              href={`/auth/login?next=${encodeURIComponent(next)}`}
            >
              Войти
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
