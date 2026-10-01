"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { completeEmailRegistration, startEmailRegistration } from "../../lib/authRequests";
import {
  ensureGuestCartId,
  getGuestCartId,
} from "../../lib/auth";
import { completeAuth } from "../../lib/completeAuth";
import { AuthPageSwitch } from "../../components/Auth/AuthPageSwitch";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { useAutoFocusFirstField } from "../../lib/useAutoFocusFirstField";
import { safeReturnPath } from "../../lib/safeReturnPath";

import styles from "./Register.module.css";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);

  const next = safeReturnPath(searchParams.get("next"));

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [submitting, setSubmitting] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const resendSeconds = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));

  useEffect(() => {
    if (step !== "code" || !resendAvailableAt) return;
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= resendAvailableAt) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step, resendAvailableAt]);

  useAutoFocusFirstField(formRef, [step]);

  useEffect(() => {
    if (step !== "code" || code.length !== 6 || submittingRef.current) return;
    submittingRef.current = true;
    setFormError(null);
    setSubmitting(true);

    async function verifyCode() {
      try {
        const cartId = getGuestCartId() || await ensureGuestCartId();
        const data = await completeEmailRegistration(email, code, cartId);
        await completeAuth(data.cartId);
        router.refresh();
        router.replace(next);
      } catch (error) {
        setCode("");
        formRef.current?.querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]')?.focus();
        setFormError(error instanceof Error ? error.message : "Ошибка регистрации");
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }

    void verifyCode();
  }, [code, email, next, router, step]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || step !== "email") return;
    setFormError(null);
    setSubmitting(true);

    try {
      await requestCode();
      setCode("");
      setStep("code");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Ошибка регистрации");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestCode() {
    if (!firstName.trim()) throw new Error("Введите имя");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new Error("Проверьте адрес электронной почты");
    }
    if (password.length < 8) throw new Error("Пароль должен быть от 8 символов");
    await startEmailRegistration(email, password, firstName);
    const time = Date.now();
    setNow(time);
    setResendAvailableAt(time + 60_000);
  }

  async function resendCode() {
    if (submitting || resendSeconds > 0) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await requestCode();
      setCode("");
      toast.success("Новый код отправлен на почту");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Не удалось отправить код");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pageContainer">
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Регистрация</h1>

          <form ref={formRef} onSubmit={handleSubmit} className={styles.form} autoComplete="on" noValidate>
            {step === "email" ? (
              <>
                <TextInput
                  label="Имя"
                  name="given-name"
                  id="register-first-name"
                  fieldVariant="boxed"
                  type="text"
                  value={firstName}
                  onChange={(event) => { setFirstName(event.target.value); setFormError(null); }}
                  required
                  maxLength={120}
                  autoComplete="given-name"
                />

                <TextInput
                  label="Электронная почта"
                  name="email"
                  id="register-email"
                  fieldVariant="boxed"
                  type="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setFormError(null); }}
                  required
                  autoComplete="email"
                />

                <div className={styles.passwordFieldWrap}>
                  <TextInput
                    label="Пароль"
                    name="password"
                    id="register-password"
                    fieldVariant="boxed"
                    type={passwordVisible ? "text" : "password"}
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); setFormError(null); }}
                    required
                    autoComplete="new-password"
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

              </>
            ) : null}

            {step === "code" ? (
              <>
                <p className={styles.hint}>Код отправлен на {email.trim()}.</p>
                <TextInput
                  label="Код из письма"
                  name="one-time-code"
                  id="register-code"
                  fieldVariant="boxed"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setFormError(null);
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  disabled={submitting}
                />
                {formError ? <p className="fieldError" role="alert">{formError}</p> : null}
                {submitting ? <p className={styles.hint} role="status">Проверяем код…</p> : null}
                <div className={styles.codeActions}>
                  <button
                    type="button"
                    className={styles.textAction}
                    onClick={() => { setStep("email"); setCode(""); setFormError(null); }}
                    disabled={submitting}
                  >
                    Изменить почту
                  </button>
                  <button
                    type="button"
                    className={styles.textAction}
                    onClick={() => void resendCode()}
                    disabled={submitting || resendSeconds > 0}
                  >
                    {resendSeconds > 0 ? `Повторить через ${resendSeconds} с` : "Отправить код ещё раз"}
                  </button>
                </div>
              </>
            ) : null}

            {step === "email" ? (
              <Button type="submit" variant="primaryShimmer" className={styles.button} disabled={submitting}>
                Получить код
              </Button>
            ) : null}
          </form>
          <AuthPageSwitch mode="register" next={next} disabled={submitting} />
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
