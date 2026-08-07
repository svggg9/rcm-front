"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  ensureGuestCartId,
  getGuestCartId,
  setAuth,
} from "../../lib/auth";
import { apiFetch, API_URL } from "../../lib/api";
import { startYandexAuth } from "../../lib/yandexAuth";
import {
  getGuestFavoriteIds,
  syncFavoritesAfterLogin,
  clearGuestFavoriteIds,
} from "../../lib/favorites";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { useAutoFocusFirstField } from "../../lib/useAutoFocusFirstField";
import { safeReturnPath } from "../../lib/safeReturnPath";

import styles from "./Login.module.css";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const next = safeReturnPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  useAutoFocusFirstField(formRef, []);

  async function finishAuth(cartId: string) {
    const guestFavoriteIds = getGuestFavoriteIds();

    setAuth(cartId);

    if (guestFavoriteIds.length > 0) {
      const synced = await syncFavoritesAfterLogin(guestFavoriteIds);
      if (synced) clearGuestFavoriteIds();
    }

    router.replace(next);
  }

  async function handleYandexLogin() {
    try {
      await startYandexAuth(next);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось открыть вход через Яндекс"
      );
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      const cartId = getGuestCartId() || await ensureGuestCartId();

      const response = await apiFetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ username: email, password, cartId }),
      });

      if (!response.ok) {
        throw new Error("Неверная почта или пароль");
      }

      const data: { cartId: string } = await response.json();
      await finishAuth(data.cartId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка входа");
    }
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Вход</h1>

          <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
            <button
              type="button"
              className={styles.oauthButton}
              onClick={handleYandexLogin}
            >
              Войти с Яндекс ID
            </button>

            <TextInput
              label="Электронная почта"
              fieldVariant="boxed"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />

            <div className={styles.passwordFieldWrap}>
              <TextInput
                label="Пароль"
                fieldVariant="boxed"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className={styles.passwordInput}
              />
              <button
                type="button"
                className={styles.passwordVisibilityButton}
                onClick={() => setPasswordVisible((visible) => !visible)}
              >
                {passwordVisible ? "Скрыть" : "Показать"}
              </button>
            </div>

            <Button type="submit" variant="primaryShimmer" className={styles.button}>
              Войти
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

