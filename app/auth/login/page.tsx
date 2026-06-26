"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { setAuth, ensureCartId } from "../../lib/auth";
import { apiFetch, API_URL } from "../../lib/api";
import {
  getGuestFavoriteIds,
  syncFavoritesAfterLogin,
  clearGuestFavoriteIds,
} from "../../lib/favorites";
import { Button } from "../../components/ui/Button";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { TextInput } from "../../components/ui/TextInput";
import { useAutoFocusFirstField } from "../../lib/useAutoFocusFirstField";

import styles from "./Login.module.css";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const next = searchParams.get("next") || "/";

  const [mode, setMode] = useState<"login" | "reset">("login");
  const [resetStep, setResetStep] = useState<"phone" | "code" | "password">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmationVisible, setPasswordConfirmationVisible] =
    useState(false);

  useAutoFocusFirstField(formRef, [mode, resetStep]);

  async function finishAuth(cartId: string) {
    const guestFavoriteIds = getGuestFavoriteIds();

    setAuth(cartId);

    if (guestFavoriteIds.length > 0) {
      await syncFavoritesAfterLogin(guestFavoriteIds);
      clearGuestFavoriteIds();
    }

    window.dispatchEvent(new Event("auth-changed"));
    router.replace(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();


    try {
      const cartId = await ensureCartId();

      const response = await apiFetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ phone, password, cartId }),
      });

      if (!response.ok) {
        throw new Error("Неверный телефон или пароль");
      }

      const data: { cartId: string } = await response.json();
      await finishAuth(data.cartId);
    } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Ошибка входа"
        );
    }
  }

  async function handleResetSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      if (resetStep === "phone") {
        const response = await apiFetch(`${API_URL}/api/auth/phone/password/reset/start`, {
          method: "POST",
          body: JSON.stringify({ phone }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || "Не удалось отправить код");
        }

        await response.json().catch(() => null);
        setCode("");
        setResetStep("code");
        return;
      }

      if (resetStep === "code") {
        setPassword("");
        setPasswordConfirmation("");
        setResetStep("password");
        return;
      }

      if (password !== passwordConfirmation) {
        throw new Error("Пароли не совпадают");
      }

      const cartId = await ensureCartId();
      const response = await apiFetch(`${API_URL}/api/auth/phone/password/reset/complete`, {
        method: "POST",
        body: JSON.stringify({ phone, code, password, cartId }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось сохранить пароль");
      }

      const data: { cartId: string } = await response.json();
      await finishAuth(data.cartId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось восстановить пароль"
      );
    }
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>
            {mode === "reset" ? "Восстановление пароля" : "Вход"}
          </h1>

          {mode === "login" ? (
            <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
              <PhoneInput
                label="Телефон"
                fieldVariant="boxed"
                hideLabel
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />

              <div className={styles.passwordFieldWrap}>
                <TextInput
                  label="Пароль"
                  fieldVariant="boxed"
                  hideLabel
                  placeholder="Пароль"
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

              <button
                type="button"
                className={styles.forgot}
                onClick={() => {
                  setMode("reset");
                  setResetStep("phone");
                  setCode("");
                  setPassword("");
                  setPasswordConfirmation("");
                }}
              >
                Забыли пароль?
              </button>

              <Button type="submit" variant="primaryShimmer" className={styles.button}>
                Войти
              </Button>
            </form>
          ) : (
            <form ref={formRef} onSubmit={handleResetSubmit} className={styles.form}>
              {resetStep === "phone" ? (
                <PhoneInput
                  label="Телефон"
                  fieldVariant="boxed"
                  hideLabel
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              ) : null}

              {resetStep === "code" ? (
                <>
                  <TextInput
                    label="Код из смс"
                    fieldVariant="boxed"
                    hideLabel
                    placeholder="Код из смс"
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    inputMode="numeric"
                    required
                  />
                </>
              ) : null}

              {resetStep === "password" ? (
                <>
                  <div className={styles.passwordFieldWrap}>
                    <TextInput
                      label="Новый пароль"
                      fieldVariant="boxed"
                      hideLabel
                      placeholder="Новый пароль"
                      type={passwordVisible ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      autoComplete="new-password"
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

                  <div className={styles.passwordFieldWrap}>
                    <TextInput
                      label="Повторите пароль"
                      fieldVariant="boxed"
                      hideLabel
                      placeholder="Повторите пароль"
                      type={passwordConfirmationVisible ? "text" : "password"}
                      value={passwordConfirmation}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                      required
                      autoComplete="new-password"
                      className={styles.passwordInput}
                    />
                    <button
                      type="button"
                      className={styles.passwordVisibilityButton}
                      onClick={() =>
                        setPasswordConfirmationVisible((visible) => !visible)
                      }
                    >
                      {passwordConfirmationVisible ? "Скрыть" : "Показать"}
                    </button>
                  </div>
                </>
              ) : null}

              <Button type="submit" variant="primaryShimmer" className={styles.button}>
                {resetStep === "phone"
                  ? "Получить код"
                  : resetStep === "code"
                    ? "Продолжить"
                    : "Сохранить пароль"}
              </Button>
            </form>
          )}
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
