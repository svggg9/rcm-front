"use client";

import { Loader } from "../ui/Loader";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthRequestError, completeEmailLogin, loginWithPassword, startEmailLogin } from "../../lib/authRequests";
import { ensureGuestCartId, getGuestCartId } from "../../lib/auth";
import { completeAuth } from "../../lib/completeAuth";
import { startYandexAuth } from "../../lib/yandexAuth";
import { safeReturnPath } from "../../lib/safeReturnPath";
import { validateAuthFields } from "../../lib/authValidation";
import { useFieldValidation } from "../../lib/useFieldValidation";
import { scrollToFirstValidationError } from "../../lib/formValidation";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { TextInput } from "../ui/TextInput";
import { OneTimeCodeInput } from "../ui/OneTimeCodeInput";
import styles from "./AuthForm.module.css";

type Step = "email" | "code" | "password";
// Keep the resend gate when switching views or reopening the shared form.
const resendDeadlines = new Map<string, number>();
const retryDeadlines = new Map<string, number>();

export function AuthForm({ next = "/", onAuthenticated, onBack, onBusyChange, disabled = false }: {
  next?: string;
  onAuthenticated: () => void | Promise<void>;
  onBack?: () => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const id = useId();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validation = useFieldValidation({ email, password }, values => {
    const checked = validateAuthFields(values.email, values.password, false);
    return { ...(checked.emailError ? { email: checked.emailError } : {}),
      ...(step === "password" && checked.passwordError ? { password: checked.passwordError } : {}) };
  });
  const { email: emailError, password: passwordError } = validation.errors;
  const [now, setNow] = useState(0);
  const identity = email.trim().toLowerCase();
  const seconds = Math.max(0, Math.ceil(((resendDeadlines.get(identity) ?? 0) - now) / 1000));
  const retrySeconds = Math.max(0, Math.ceil(((retryDeadlines.get(identity) ?? 0) - now) / 1000));
  const blocked = busy || disabled;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>(step === "code"
      ? 'input[name="code"]' : step === "password" ? 'input[name="password"]' : 'input[name="email"]')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [step]);

  function reset(nextStep: Step) {
    if (lock.current || disabled) return;
    setCode(""); setPassword(""); setPasswordVisible(false);
    setError(null); validation.reset();
    setNow(Date.now()); setStep(nextStep);
  }
  function back() {
    if (lock.current || disabled) return;
    if (step !== "email") reset("email");
    else onBack?.();
  }
  function begin() {
    if (lock.current || disabled) return false;
    lock.current = true; setBusy(true); setError(null);
    return true;
  }
  function finish() {
    lock.current = false;
    if (mounted.current) setBusy(false);
  }
  function showFailure(failure: unknown) {
    if (!mounted.current) return;
    setError(failure instanceof AuthRequestError ? failure.message : "Не удалось войти — попробуйте ещё раз");
    if (failure instanceof AuthRequestError && failure.status === 429) {
      retryDeadlines.set(identity, Date.now() + 60_000);
      setNow(Date.now());
    }
  }
  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (lock.current || disabled || retrySeconds > 0) return;
    const invalid = validation.validate().email;
    if (invalid) { scrollToFirstValidationError({ root: form.current }); return; }
    if ((resendDeadlines.get(identity) ?? 0) > Date.now()) {
      setNow(Date.now()); setStep("code"); return;
    }
    if (!begin()) return;
    try {
      const result = await startEmailLogin(identity);
      resendDeadlines.set(identity, Date.now() + result.resendAfterSeconds * 1000);
      if (!mounted.current) return;
      setNow(Date.now()); setCode(""); setStep("code");
      requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('input[name="code"]')?.focus());
    } catch (failure) { showFailure(failure); }
    finally { finish(); }
  }
  async function authenticate(value?: string) {
    if (lock.current || disabled) return;
    if (step === "password") {
      const invalid = validation.validate();
      if (invalid.email || invalid.password) {
        scrollToFirstValidationError({ root: form.current }); return;
      }
    } else if (!/^[0-9]{6}$/.test(value ?? code)) return;
    if (!begin()) return;
    try {
      const cartId = getGuestCartId() || await ensureGuestCartId();
      const result = step === "password" ? await loginWithPassword(email.trim(), password, cartId)
        : await completeEmailLogin(identity, value ?? code, cartId);
      await completeAuth(result.cartId);
      if (mounted.current) await onAuthenticated();
    } catch (failure) {
      showFailure(failure);
      if (mounted.current && step === "code") {
        setCode("");
        requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('input[name="code"]')?.focus());
      }
    } finally { finish(); }
  }
  async function yandex() {
    if (!begin()) return;
    try { await startYandexAuth(safeReturnPath(next)); }
    catch (failure) { showFailure(failure); finish(); }
  }
  const title = step === "code" ? "Введите код из письма" : step === "password" ? "Войти с паролем" : "Введите электронную почту";

  return <form ref={form} className={styles.form} noValidate autoComplete="on" aria-busy={busy || undefined}
    aria-labelledby={`${id}-title`} onSubmit={event => {
      event.preventDefault();
      if (step === "email") void sendCode(); else void authenticate();
    }}>
    {(onBack || step !== "email") && <button type="button" className={styles.back} onClick={back} disabled={blocked}>
      <Icon name="chevron-left" size={20} strokeWidth={1} />Назад
    </button>}
    <div className={styles.intro}>
      <h2 id={`${id}-title`}>{title}</h2>
      <p>{step === "code" ? <>Чтобы подтвердить <span>{identity}</span></> : step === "password"
        ? "Используйте пароль своего аккаунта" : "Отправим письмо с кодом для входа или создания аккаунта"}</p>
    </div>
    {step === "code" ? <>
      <OneTimeCodeInput value={code} disabled={blocked} error={error} enterKeyHint="done" onChange={value => {
        if (lock.current) return;
        setCode(value); setError(null);
        if (value.length === 6) void authenticate(value);
      }} />
      <div className={styles.codeActions}>
        <div className={styles.status}>{busy && <Loader inline label="Проверка кода" />}</div>
        <button type="button" className={styles.textAction} disabled={blocked || seconds > 0 || retrySeconds > 0} onClick={() => void sendCode()}>
          {Math.max(seconds, retrySeconds) > 0 ? `Отправить код ещё раз через ${Math.max(seconds, retrySeconds)} с` : "Отправить код ещё раз"}
        </button>
      </div>
      <button type="submit" className="visuallyHidden" tabIndex={-1} disabled={blocked || code.length !== 6}>Подтвердить код</button>
    </> : <>
      <TextInput label="Электронная почта" id={`${id}-email`} name="email" type="email" autoComplete="email" enterKeyHint="next" maxLength={254}
        value={email} error={emailError} disabled={blocked} required onBlur={() => validation.touch("email")} onChange={event => {
          setEmail(event.target.value); validation.changed("email"); setError(null); setNow(Date.now());
        }} />
      {step === "password" && <div className={styles.password}>
        <TextInput label="Пароль" name="password" type={passwordVisible ? "text" : "password"} autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done"
          value={password} error={passwordError} disabled={blocked} required className={styles.passwordInput}
          onBlur={() => validation.touch("password")}
          onChange={event => { setPassword(event.target.value); validation.changed("password"); setError(null); }} />
        <button type="button" className={styles.reveal} aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
          disabled={blocked} onClick={() => setPasswordVisible(!passwordVisible)}>
          <Icon name={passwordVisible ? "eye-off" : "eye"} size={18} strokeWidth={1} />
        </button>
      </div>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {step === "password" && <Link className={styles.forgot} href={`/auth/password/reset?next=${encodeURIComponent(safeReturnPath(next))}`}
        aria-disabled={blocked || undefined} onClick={event => { if (blocked) event.preventDefault(); }}>Забыли пароль?</Link>}
      <Button type="submit" variant="primary" className={styles.primary} loading={busy} disabled={disabled || !identity || (step === "password" ? !password : retrySeconds > 0)}>
        {step === "password" ? "Войти" : retrySeconds > 0 ? `Повторить через ${retrySeconds} с` : seconds > 0 ? "Ввести код" : "Получить код"}
      </Button>
    </>}
    <div className={styles.alternatives}>
      <button type="button" className={styles.textAction} disabled={blocked} onClick={() => reset(step === "password" ? "email" : "password")}>
        {step === "password" ? "Войти по коду" : "Войти с паролем"}
      </button>
      <button type="button" className={styles.textAction} disabled={blocked} onClick={() => void yandex()}>Войти через Яндекс</button>
    </div>
    {step === "email" && <p className={styles.legal}>Продолжая, вы принимаете <Link href="/legal/terms" target="_blank">условия использования</Link> и <Link href="/legal/privacy" target="_blank">политику конфиденциальности</Link></p>}
  </form>;
}
