"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuth } from "../../lib/auth";
import { apiFetch } from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const res = await apiFetch(
        "http://localhost:9696/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
        }
      );

      if (!res.ok) {
        throw new Error("Ошибка регистрации");
      }

      router.push("/auth/login");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto" }}>
      <h1>Регистрация</h1>

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
          Зарегистрироваться
        </button>
      </form>
    </div>
  );
}
