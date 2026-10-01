"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  ensureGuestCartId,
  getGuestCartId,
} from "../../lib/auth";
import { loginWithPassword } from "../../lib/authRequests";
import { startYandexAuth } from "../../lib/yandexAuth";
import { completeAuth } from "../../lib/completeAuth";
import { AuthPageSwitch } from "../../components/Auth/AuthPageSwitch";
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
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useAutoFocusFirstField(formRef, []);

  async function finishAuth(cartId: string) {
    await completeAuth(cartId);
    router.refresh();
    router.replace(next);
  }

  async function handleYandexLogin() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await startYandexAuth(next);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось открыть вход через Яндекс"
      );
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);
    setEmailError(null);
    setPasswordError(null);
    if (!email.trim()) {
      setEmailError("Введите электронную почту");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Проверьте адрес электронной почты");
      return;
    }
    if (!password) {
      setPasswordError("Введите пароль");
      return;
    }
    setSubmitting(true);

    try {
      const cartId = getGuestCartId() || await ensureGuestCartId();
      const data = await loginWithPassword(email, password, cartId);
      await finishAuth(data.cartId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Ошибка входа");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Вход</h1>

          <form ref={formRef} onSubmit={handleSubmit} className={styles.form} autoComplete="on" noValidate>
            <button
              type="button"
              className={styles.oauthButton}
              onClick={handleYandexLogin}
              disabled={submitting}
            >
              Войти с Яндекс ID
            </button>

            <TextInput
              label="Электронная почта"
              name="email"
              id="login-email"
              fieldVariant="boxed"
              type="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setEmailError(null); setFormError(null); }}
              error={emailError}
              required
              autoComplete="email"
            />

            <div className={styles.passwordFieldWrap}>
              <TextInput
                label="Пароль"
                name="password"
                id="login-password"
                fieldVariant="boxed"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => { setPassword(event.target.value); setPasswordError(null); setFormError(null); }}
                error={passwordError}
                required
                autoComplete="current-password"
                className={styles.passwordInput}
              />
              <button
                type="button"
                className={styles.passwordVisibilityButton}
                onClick={() => setPasswordVisible((visible) => !visible)}
                aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
                disabled={submitting}
              >
                {passwordVisible ? "Скрыть" : "Показать"}
              </button>
            </div>

            {formError ? <p className="fieldError" role="alert">{formError}</p> : null}

            <Link
              href={`/auth/password/reset?next=${encodeURIComponent(next)}`}
              className={styles.forgot}
              aria-disabled={submitting || undefined}
              onClick={(event) => { if (submitting) event.preventDefault(); }}
            >
              Забыли пароль?
            </Link>

            <Button type="submit" variant="primaryShimmer" className={styles.button} disabled={submitting}>
              Войти
            </Button>
          </form>
          <AuthPageSwitch mode="login" next={next} disabled={submitting} />
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
