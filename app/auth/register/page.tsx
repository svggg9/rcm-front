"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { apiFetch, API_URL } from "../../lib/api";
import { ensureCartId, setAuth } from "../../lib/auth";
import {
  getGuestFavoriteIds,
  syncFavoritesAfterLogin,
  clearGuestFavoriteIds,
} from "../../lib/favorites";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { useAutoFocusFirstField } from "../../lib/useAutoFocusFirstField";

import styles from "./Register.module.css";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");

  useAutoFocusFirstField(formRef, [step]);

  async function finishAuth(cartId: string) {
    const guestFavoriteIds = getGuestFavoriteIds();

    setAuth(cartId);

    if (guestFavoriteIds.length > 0) {
      await syncFavoritesAfterLogin(guestFavoriteIds);
      clearGuestFavoriteIds();
    }

    window.dispatchEvent(new Event("auth-changed"));
    router.refresh();
    router.replace(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      if (step === "email") {
        if (!password.trim()) {
          throw new Error("Введите пароль");
        }

        if (password.length < 8) {
          throw new Error("Пароль должен быть от 8 символов");
        }

        const response = await apiFetch(`${API_URL}/api/auth/email/register/start`, {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || "Не удалось отправить код");
        }

        await response.json().catch(() => null);
        setCode("");
        setStep("code");
        return;
      }

      const cartId = await ensureCartId();

      const response = await apiFetch(`${API_URL}/api/auth/email/register/complete`, {
        method: "POST",
        body: JSON.stringify({ email, code, cartId }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось создать аккаунт");
      }

      const data: { cartId: string } = await response.json();
      await finishAuth(data.cartId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка регистрации");
    }
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Регистрация</h1>

          <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
            {step === "email" ? (
              <>
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

                
              </>
            ) : null}

            {step === "code" ? (
              <TextInput
                label="Код из письма"
                fieldVariant="boxed"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                required
              />
            ) : null}

            <Button type="submit" variant="primaryShimmer" className={styles.button}>
              {step === "email" ? "Получить код" : "Создать аккаунт"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}

