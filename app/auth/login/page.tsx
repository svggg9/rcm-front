"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuth, getCartId } from "../../lib/auth";
import { apiFetch } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      // ✅ 1️⃣ берём guestCartId (он ВСЕГДА должен существовать)
      const cartId = getCartId();

      const res = await apiFetch(
        "http://localhost:9696/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password,
            cartId, // 🔑 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Неверный логин или пароль");
      }

      const data: { token: string; cartId: string } = await res.json();

      // ✅ 2️⃣ сохраняем auth + userCartId
      setAuth(data.token, data.cartId);

      // ✅ 3️⃣ редирект
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto" }}>
      <h1>Вход</h1>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Логин"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <div style={{ color: "red", marginTop: 8 }}>
            {error}
          </div>
        )}

        <button type="submit" style={{ marginTop: 16 }}>
          Войти
        </button>
      </form>
    </div>
  );
}
