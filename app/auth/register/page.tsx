"use client";

import Link from "next/link";
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    try {
      const registerResponse = await apiFetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (!registerResponse.ok) {
        const text = await registerResponse.text().catch(() => "");
        throw new Error(text || "Ошибка регистрации");
      }

      const cartId = getCartId();

      const loginResponse = await apiFetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ username, password, cartId }),
      });

      if (!loginResponse.ok) {
        const text = await loginResponse.text().catch(() => "");
        throw new Error(text || "Регистрация успешна, но вход не выполнен");
      }

      const data: { token: string; cartId: string } = await loginResponse.json();

      setAuth(data.token, data.cartId);
      router.replace(next);
    } catch (error) {
      setError((error as Error).message);
    }
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Регистрация</h1>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              Логин
              <input
                className={styles.input}
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="new-password"
              />
            </label>

            {error ? <div className={styles.error}>{error}</div> : null}

            <button type="submit" className={styles.button}>
              Зарегистрироваться
            </button>

            <div className={styles.hint}>
              Уже есть аккаунт?{" "}
              <Link
                className={styles.link}
                href={`/auth/login?next=${encodeURIComponent(next)}`}
              >
                Войти
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}