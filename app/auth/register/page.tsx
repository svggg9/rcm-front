"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiFetch, API_URL } from "../../lib/api";
import { ensureCartId, setAuth } from "../../lib/auth";
import {
  getGuestFavoriteIds,
  syncFavoritesAfterLogin,
  clearGuestFavoriteIds,
} from "../../lib/favorites";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { TextInput } from "../../components/ui/TextInput";
import { useAutoFocusFirstField } from "../../lib/useAutoFocusFirstField";

import styles from "./Register.module.css";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const next = searchParams.get("next") || "/";

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmationVisible, setPasswordConfirmationVisible] =
    useState(false);
  const [step, setStep] = useState<"phone" | "code" | "password">("phone");

  useAutoFocusFirstField(formRef, [step]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      if (step === "phone") {
        const response = await apiFetch(`${API_URL}/api/auth/phone/register/start`, {
          method: "POST",
          body: JSON.stringify({ phone }),
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

      if (step === "code") {
        const cartId = await ensureCartId();

        const response = await apiFetch(`${API_URL}/api/auth/phone/register/complete`, {
          method: "POST",
          body: JSON.stringify({ phone, code, cartId }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || "Не удалось создать аккаунт");
        }

        const data: { cartId: string } = await response.json();
        const guestFavoriteIds = getGuestFavoriteIds();

        setAuth(data.cartId);

        if (guestFavoriteIds.length > 0) {
          await syncFavoritesAfterLogin(guestFavoriteIds);
          clearGuestFavoriteIds();
        }

        window.dispatchEvent(new Event("auth-changed"));
        router.refresh();
        setPassword("");
        setPasswordConfirmation("");
        setStep("password");
        return;
      }

      if (password !== passwordConfirmation) {
        throw new Error("Пароли не совпадают");
      }

      const response = await apiFetch(`${API_URL}/api/profile/password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось сохранить пароль");
      }

      toast.success("Аккаунт создан");
      router.replace(next);
    } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Ошибка регистрации"
        );
    }
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>
            {step === "password" ? "Задайте пароль" : "Регистрация"}
          </h1>

          <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
            {step === "phone" ? (
              <PhoneInput
                label="Телефон"
                fieldVariant="boxed"
                hideLabel
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            ) : null}

            {step === "code" ? (
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

            {step === "password" ? (
              <>
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
              {step === "phone"
                ? "Получить код"
                : step === "code"
                  ? "Создать аккаунт"
                  : "Сохранить пароль"}
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
