"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useFieldValidation } from "../../../lib/useFieldValidation";
import { scrollToFirstValidationError } from "../../../lib/formValidation";
import { Button } from "../../../components/ui/Button";
import { TextInput } from "../../../components/ui/TextInput";
import { OneTimeCodeInput } from "../../../components/ui/OneTimeCodeInput";
import { clearStoredUserCartId } from "../../../lib/auth";
import { emitAuthChanged } from "../../../lib/authEvents";
import { emitCartChanged } from "../../../lib/cartEvents";
import { safeReturnPath } from "../../../lib/safeReturnPath";
import {
  completePasswordReset,
  isValidResetEmail,
  normalizeResetEmail,
  PasswordResetError,
  passwordResetValidationError,
  requestPasswordResetCode,
} from "../../../lib/passwordReset";

import styles from "./PasswordReset.module.css";

type Step = "email" | "code" | "success";
type PendingAction = "start" | "resend" | "complete" | null;

function PasswordResetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginHref = "/auth/login?next=" + encodeURIComponent(safeReturnPath(searchParams.get("next")));
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingRequest = useRef<AbortController | null>(null);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [ttlSeconds, setTtlSeconds] = useState(600);
  const [cooldownEmail, setCooldownEmail] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);

  const validation = useFieldValidation({ email, code, newPassword, confirmPassword }, values => {
    const errors: Partial<Record<"email" | "code" | "newPassword" | "confirmPassword", string>> = {};
    if (!isValidResetEmail(values.email)) errors.email = "Введите корректный адрес электронной почты";
    if (step === "code") {
      if (!/^[0-9]{6}$/.test(values.code.trim())) errors.code = "Введите 6 цифр из последнего письма";
      const passwordError = passwordResetValidationError(values.newPassword, values.newPassword);
      if (passwordError) errors.newPassword = passwordError;
      if (!values.confirmPassword) errors.confirmPassword = "Повторите новый пароль";
      else if (values.newPassword !== values.confirmPassword) errors.confirmPassword = "Пароли не совпадают";
    }
    return errors;
  });
  const submitting = pendingAction !== null;
  const secondsUntilResend = cooldownEmail === normalizeResetEmail(email)
    ? Math.max(0, Math.ceil((resendAt - now) / 1000))
    : 0;

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => () => pendingRequest.current?.abort(), []);

  useEffect(() => {
    if (!resendAt || step === "success") return;
    const interval = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= resendAt) window.clearInterval(interval);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [resendAt, step]);

  function validateEmail(): boolean {
    if (isValidResetEmail(email)) return true;
    validation.touch("email");
    scrollToFirstValidationError({ root: formRef.current });
    return false;
  }

  async function sendCode() {
    if (pendingRequest.current || secondsUntilResend > 0 || !validateEmail()) return;
    const normalizedEmail = normalizeResetEmail(email);
    const controller = new AbortController();
    pendingRequest.current = controller;
    setPendingAction(step === "code" ? "resend" : "start");
    setError(null);
    setNotice("");

    try {
      const result = await requestPasswordResetCode(normalizedEmail, controller.signal);
      if (controller.signal.aborted) return;
      const time = Date.now();
      setNow(time);
      setCooldownEmail(normalizedEmail);
      setResendAt(time + result.resendAfterSeconds * 1000);
      setTtlSeconds(result.ttlSeconds);
      setEmail(normalizedEmail);
      setCode("");
      setStep("code");
      setNotice("Если для этой почты доступно восстановление, мы отправим код. Используйте код из последнего письма.");
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(failure instanceof PasswordResetError
        ? failure.message
        : "Не удалось получить ответ сервера. Если письмо пришло, используйте код из него; иначе попробуйте позже.");
      if (failure instanceof PasswordResetError && failure.status === 429) {
        const time = Date.now();
        setNow(time);
        setCooldownEmail(normalizedEmail);
        setResendAt(time + 60_000);
      }
    } finally {
      if (pendingRequest.current === controller) pendingRequest.current = null;
      if (!controller.signal.aborted) setPendingAction(null);
    }
  }

  function handleExistingCode() {
    if (pendingRequest.current || !validateEmail()) return;
    setEmail(normalizeResetEmail(email));
    setError(null);
    setNotice("");
    setStep("code");
  }

  function changeEmail() {
    if (pendingRequest.current) return;
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setNotice("");
    validation.reset();
    setStep("email");
  }

  async function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRequest.current) return;
    if (Object.keys(validation.validate()).length) {
      scrollToFirstValidationError({ root: formRef.current });
      return;
    }

    const controller = new AbortController();
    pendingRequest.current = controller;
    setPendingAction("complete");
    setError(null);
    try {
      await completePasswordReset(email, code, newPassword, controller.signal);
      if (controller.signal.aborted) return;
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("");
      setStep("success");
      // The backend clears the auth cookie. Preserve the guest cart/favorites;
      // only discard the stale authenticated cart pointer and refresh consumers.
      try {
        clearStoredUserCartId();
      } catch {
        // Restricted browser storage must not turn a successful reset into an error.
      }
      emitAuthChanged();
      emitCartChanged();
      router.refresh();
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(failure instanceof PasswordResetError
        ? failure.message
        : "Не удалось получить ответ сервера. Пароль мог измениться — попробуйте войти с новым паролем. При необходимости запросите новый код.");
    } finally {
      if (pendingRequest.current === controller) pendingRequest.current = null;
      if (!controller.signal.aborted) setPendingAction(null);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="password-reset-title">
        <header className={styles.header}>
          <h1 id="password-reset-title" ref={headingRef} tabIndex={-1}>
            {step === "success" ? "Пароль изменён" : "Восстановление пароля"}
          </h1>
          {step === "email" ? <p>Укажите почту, которую вы подтвердили при регистрации</p> : null}
          {step === "code" ? <p>Введите код из письма и придумайте новый пароль</p> : null}
        </header>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        {step === "email" ? (
          <form
            className={styles.form} ref={formRef} noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void sendCode();
            }}
          >
            <TextInput
              label="Электронная почта"
              fieldVariant="boxed"
              type="email"
              name="email"
              value={email} error={validation.errors.email} onBlur={() => validation.touch("email")}
              onChange={(event) => {
                setEmail(event.target.value); validation.changed("email");
                setError(null);
              }}
              autoComplete="email"
              autoCapitalize="none"
              enterKeyHint="next"
              spellCheck={false}
              maxLength={254}
              disabled={submitting}
              required
            />
            <Button
              type="submit"
              variant="primary"
              aria-label="Получить код восстановления"
              loading={pendingAction === "start"}
              disabled={submitting || secondsUntilResend > 0}
            >
              {secondsUntilResend > 0 ? "Повторить через " + secondsUntilResend + " с" : "Получить код"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleExistingCode} disabled={submitting}>
              У меня уже есть код
            </Button>
            <p className={styles.hint}>Если вы регистрировались через Яндекс, можно вернуться ко входу и использовать Яндекс ID</p>
          </form>
        ) : null}

        {step === "code" ? (
          <>
            <div className={styles.recipient}>
              <span>{email}</span>
              <button type="button" className={styles.textButton} onClick={changeEmail} disabled={submitting}>Изменить почту</button>
            </div>
            {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
            <form className={styles.form} ref={formRef} noValidate onSubmit={handleComplete}>
              <OneTimeCodeInput
                label="Код из письма"
                value={code}
                error={validation.errors.code}
                disabled={submitting}
                enterKeyHint="next"
                onBlur={() => validation.touch("code")}
                onChange={value => { setCode(value); validation.changed("code"); setError(null); }}
                hint={"Код действует " + Math.ceil(ttlSeconds / 60) + " минут. После 5 неверных попыток потребуется новый код."}
              />
              <TextInput
                label="Новый пароль"
                fieldVariant="boxed"
                type="password"
                name="newPassword"
                value={newPassword} error={validation.errors.newPassword} onBlur={() => validation.touch("newPassword")}
                onChange={(event) => { setNewPassword(event.target.value); validation.changed("newPassword"); setError(null); }}
                autoComplete="new-password"
                enterKeyHint="next"
                minLength={8}
                disabled={submitting}
                required
                hint="От 8 символов, максимум 72 байта UTF-8. Кириллица и эмодзи занимают больше одного байта."
              />
              <TextInput
                label="Повторите новый пароль"
                fieldVariant="boxed"
                type="password"
                name="confirmPassword"
                value={confirmPassword} error={validation.errors.confirmPassword} onBlur={() => validation.touch("confirmPassword")}
                onChange={(event) => { setConfirmPassword(event.target.value); validation.changed("confirmPassword"); setError(null); }}
                autoComplete="new-password"
                enterKeyHint="done"
                minLength={8}
                disabled={submitting}
                required
              />
              <p className={styles.hint}>После смены пароля потребуется заново войти на всех устройствах.</p>
              <Button
                type="submit"
                variant="primary"
                aria-label="Сохранить новый пароль"
                loading={pendingAction === "complete"}
                disabled={submitting}
              >
                Сохранить новый пароль
              </Button>
              <Button
                type="button"
                variant="secondary"
                aria-label="Отправить новый код"
                onClick={() => void sendCode()}
                loading={pendingAction === "resend"}
                disabled={submitting || secondsUntilResend > 0}
              >
                {secondsUntilResend > 0 ? "Отправить снова через " + secondsUntilResend + " с" : "Отправить новый код"}
              </Button>
              <p className={styles.hint}>Не пришло письмо? Проверьте адрес и папку «Спам». Новый запрос отменяет предыдущий код.</p>
            </form>
          </>
        ) : null}

        {step === "success" ? (
          <p className={styles.successBanner} role="status">Новый пароль сохранён. Прежние сессии завершены — войдите заново.</p>
        ) : null}

        <Link className={styles.backLink} href={loginHref}>
          {step === "success" ? "Войти с новым паролем" : "Вернуться ко входу"}
        </Link>
      </section>
    </main>
  );
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={null}>
      <PasswordResetContent />
    </Suspense>
  );
}
