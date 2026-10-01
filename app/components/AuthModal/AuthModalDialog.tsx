"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MutableRefObject,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  completeEmailRegistration,
  loginWithPassword,
  startEmailRegistration,
} from "../../lib/authRequests";
import { startYandexAuth } from "../../lib/yandexAuth";
import { safeReturnPath } from "../../lib/safeReturnPath";
import {
  ensureGuestCartId,
  getGuestCartId,
} from "../../lib/auth";
import { completeAuth } from "../../lib/completeAuth";
import { validateAuthFields } from "../../lib/authValidation";
import { scrollToFirstValidationError } from "../../lib/formValidation";

import { Button } from "../ui/Button";
import { AuthTabs } from "./AuthTabs";
import { Icon } from "../ui/Icon";
import { TextInput } from "../ui/TextInput";
import type { AuthModalMode, AuthModalOptions } from "./useAuthModal";
import styles from "./AuthModal.module.css";

type Props = {
  initialMode: AuthModalMode;
  placement: NonNullable<AuthModalOptions["placement"]>;
  returnPath: string;
  onClose: () => void;
};

export default function AuthModalDialog({
  initialMode,
  placement,
  returnPath,
  onClose,
}: Props) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const submittingRef = useRef(false);

  const [mode, setMode] = useState<AuthModalMode>(initialMode);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [registerStep, setRegisterStep] = useState<"email" | "code">("email");
  const [submitting, setSubmitting] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const resendSeconds = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    if (registerStep !== "code" || !resendAvailableAt) return;
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= resendAvailableAt) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [registerStep, resendAvailableAt]);

  useEffect(() => {
    const modal = modalRef.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    function getFocusableElements() {
      return Array.from(
        modal?.querySelectorAll<HTMLElement>(
          'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]'
        ) ?? []
      ).filter(
        (element) =>
          element.tabIndex >= 0 &&
          !element.matches(":disabled") &&
          element.getClientRects().length > 0
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submittingRef.current) {
        onClose();
      }

      if (event.key !== "Tab" || !modal) return;

      const focusableElements = getFocusableElements();
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!firstElement || !lastElement) {
        event.preventDefault();
        modal.focus({ preventScroll: true });
      } else if (!focusableElements.some((element) => element === activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    const focusableElements = getFocusableElements();
    const initialFocus =
      focusableElements.find((element) => element.matches("input")) ??
      focusableElements[0] ??
      modal;
    initialFocus?.focus({ preventScroll: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [onClose]);

  const finishAuth = useCallback(
    async (cartId: string) => {
      await completeAuth(cartId);

      onClose();
      if (returnPath !== "/") {
        router.refresh();
        router.push(safeReturnPath(returnPath));
      } else {
        router.refresh();
      }
    },
    [onClose, returnPath, router]
  );

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setFormError(null);
    const errors = validateAuthFields(email, password, false);
    setEmailError(errors.emailError);
    setPasswordError(errors.passwordError);
    if (errors.emailError || errors.passwordError) {
      scrollToFirstValidationError({ root: modalRef.current });
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

  async function handleYandexLogin() {
    if (submitting) return;

    setSubmitting(true);
    try {
      await startYandexAuth(returnPath);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось открыть вход через Яндекс"
      );
      setSubmitting(false);
    }
  }

  async function handleRegisterStart(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (submitting || (registerStep === "code" && resendSeconds > 0)) return;

    setFormError(null);
    const errors = validateAuthFields(email, password, true);
    setEmailError(errors.emailError);
    setPasswordError(errors.passwordError);
    if (errors.emailError || errors.passwordError) {
      scrollToFirstValidationError({ root: modalRef.current });
      return;
    }
    setSubmitting(true);

    try {
      await startEmailRegistration(email, password, firstName);
      setCode("");
      setRegisterStep("code");
      const time = Date.now();
      setNow(time);
      setResendAvailableAt(time + 60_000);
      window.setTimeout(() => codeInputRefs.current[0]?.focus(), 0);
      toast.success("Код подтверждения отправлен на почту");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Ошибка регистрации");
    } finally {
      setSubmitting(false);
    }
  }

  const completeRegistration = useCallback(async (value: string) => {
    if (submittingRef.current || value.length !== 6) return;
    submittingRef.current = true;
    setFormError(null);
    setSubmitting(true);

    try {
      const cartId = getGuestCartId() || await ensureGuestCartId();

      const data = await completeEmailRegistration(email, value, cartId);
      await finishAuth(data.cartId);
    } catch (error) {
      setCode("");
      window.setTimeout(() => codeInputRefs.current[0]?.focus(), 0);
      setFormError(error instanceof Error ? error.message : "Ошибка регистрации");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [email, finishAuth]);

  useEffect(() => {
    if (mode === "register" && registerStep === "code" && code.length === 6) {
      void completeRegistration(code);
    }
  }, [code, completeRegistration, mode, registerStep]);

  function switchMode(nextMode: AuthModalMode) {
    if (submitting) return;
    setMode(nextMode);
    setRegisterStep("email");
    setCode("");
    setPassword("");
    setFirstName("");
    setPasswordVisible(false);
    setFormError(null);
    setEmailError(null);
    setPasswordError(null);
  }

  return (
    <div
          className={`${styles.overlay} ${
            placement === "anchored" ? styles.overlayAnchored : ""
          }`}
          role="presentation"
          onMouseDown={() => { if (!submitting) onClose(); }}
        >
          <div
            ref={modalRef}
            className={`${styles.modal} ${
              placement === "anchored" ? styles.modalAnchored : ""
            }`}
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
            aria-label="Вход или регистрация"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.header}>
              <div className={styles.headerTop}>
                <h2 className={styles.title}>Войдите или создайте аккаунт</h2>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={onClose}
                  disabled={submitting}
                  aria-label="Закрыть"
                >
                  <Icon name="x" size={24} strokeWidth={1} aria-hidden={true} />
                </button>
              </div>

                <AuthTabs
                  value={mode}
                  onChange={switchMode}
                  disabled={submitting}
                />
            </div>

            <div
              className={styles.body}
              role="tabpanel"
              id="auth-dialog-panel"
              aria-labelledby={`auth-dialog-tab-${mode}`}
              tabIndex={0}
            >
              {mode === "login" ? (
                <form className={`${styles.form} ${styles.loginForm}`} onSubmit={handleLogin} autoComplete="on" noValidate>
                  <TextInput
                    label="Электронная почта"
                    name="email"
                    id="auth-modal-login-email"
                    fieldVariant="boxed"
                    type="email"
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); setEmailError(null); setFormError(null); }}
                    error={emailError}
                    required
                    autoComplete="email"
                  />

                    <div className={styles.passwordLoginGroup}>
                        <div className={styles.passwordFieldWrap}>
                          <TextInput
                            label="Пароль"
                            name="password"
                            id="auth-modal-login-password"
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
                            onClick={() =>
                              setPasswordVisible((visible) => !visible)
                            }
                            aria-label={
                              passwordVisible
                                ? "Скрыть пароль"
                                : "Показать пароль"
                            }
                            title={
                              passwordVisible
                                ? "Скрыть пароль"
                                : "Показать пароль"
                            }
                          >
                            <Icon
                              name={passwordVisible ? "eye-off" : "eye"}
                              size={17}
                              strokeWidth={1.6}
                            />
                          </button>
                        </div>
                      </div>

                      {formError ? <p className="fieldError" role="alert">{formError}</p> : null}

                      <Link
                        href={`/auth/password/reset?next=${encodeURIComponent(safeReturnPath(returnPath))}`}
                        className={styles.forgotInline}
                        onClick={(event) => {
                          if (submitting) {
                            event.preventDefault();
                            return;
                          }
                          onClose();
                        }}
                        aria-disabled={submitting || undefined}
                      >
                        Забыли пароль?
                      </Link>

                      <Button
                        type="submit"
                        variant="primaryShimmer"
                        className={styles.submit}
                        disabled={submitting}
                      >
                        Войти
                      </Button>

                      <button
                        type="button"
                        className={styles.oauthButton}
                        onClick={handleYandexLogin}
                        disabled={submitting}
                      >
                        Войти через Яндекс
                      </button>
                </form>
              ) : (
                <form
                  key={registerStep}
                  className={styles.form}
                  autoComplete="on"
                  noValidate
                  onSubmit={
                    registerStep === "email"
                      ? handleRegisterStart
                      : (event) => event.preventDefault()
                  }
                >
                  {registerStep === "email" ? (
                    <>
                      <TextInput
                        label="Имя"
                        name="given-name"
                        id="auth-modal-register-first-name"
                        fieldVariant="boxed"
                        type="text"
                        value={firstName}
                        onChange={(event) => { setFirstName(event.target.value); setFormError(null); }}
                        maxLength={120}
                        autoComplete="given-name"
                      />

                      <TextInput
                        label="Электронная почта"
                        name="email"
                        id="auth-modal-register-email"
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
                          id="auth-modal-register-password"
                          fieldVariant="boxed"
                          type={passwordVisible ? "text" : "password"}
                          value={password}
                          onChange={(event) => { setPassword(event.target.value); setPasswordError(null); setFormError(null); }}
                          error={passwordError}
                          required
                          autoComplete="new-password"
                          className={styles.passwordInput}
                        />
                        <button
                          type="button"
                          className={styles.passwordVisibilityButton}
                          onClick={() => setPasswordVisible((visible) => !visible)}
                          aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
                          title={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
                        >
                          <Icon name={passwordVisible ? "eye-off" : "eye"} size={17} strokeWidth={1.6} />
                        </button>
                      </div>
                      {formError ? <p className="fieldError" role="alert">{formError}</p> : null}
                    </>
                  ) : null}

                  {registerStep === "code" ? (
                    <>
                      <p className={styles.codeHint}>
                        Введите код, отправленный на {email}
                      </p>
                      <CodeInputs
                        code={code}
                        setCode={(value) => { setCode(value); setFormError(null); }}
                        inputRefs={codeInputRefs}
                        disabled={submitting}
                      />
                      {formError ? <p className="fieldError" role="alert">{formError}</p> : null}
                      {submitting ? <p className={styles.codeHint} role="status">Проверяем код…</p> : null}
                      <div className={styles.codeActions}>
                        <button
                          type="button"
                          className={styles.textAction}
                          onClick={() => { setCode(""); setFormError(null); setRegisterStep("email"); }}
                          disabled={submitting}
                        >
                          Изменить почту
                        </button>
                        <button
                          type="button"
                          className={styles.textAction}
                          onClick={() => void handleRegisterStart()}
                          disabled={submitting || resendSeconds > 0}
                        >
                          {resendSeconds > 0 ? `Повторить через ${resendSeconds} с` : "Отправить код ещё раз"}
                        </button>
                      </div>
                    </>
                  ) : null}

                  {registerStep === "email" ? (
                    <>
                      <p className={styles.legal}>
                        Регистрируясь, вы вступаете в программу лояльности и
                        соглашаетесь с документами «
                        <Link href="/legal/terms" target="_blank">Условия пользования</Link>
                        » и «
                        <Link href="/legal/privacy" target="_blank">Политика конфиденциальности</Link>
                        ».
                      </p>
                      <Button
                        type="submit"
                        variant="primaryShimmer"
                        className={styles.submit}
                        disabled={submitting}
                      >
                        Получить код
                      </Button>
                      <button
                        type="button"
                        className={styles.oauthButton}
                        onClick={handleYandexLogin}
                        disabled={submitting}
                      >
                        Войти через Яндекс
                      </button>
                    </>
                  ) : null}
                </form>
              )}
            </div>
          </div>
        </div>
  );
}

function CodeInputs({
  code,
  setCode,
  inputRefs,
  disabled,
}: {
  code: string;
  setCode: (value: string) => void;
  inputRefs: MutableRefObject<Array<HTMLInputElement | null>>;
  disabled: boolean;
}) {
  function setDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const digits = code.split("");
    if (digit) {
      digits[index] = digit;
    } else {
      digits.splice(index, 1);
    }
    setCode(digits.filter(Boolean).join("").slice(0, 6));

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function pasteCode(value: string) {
    const nextCode = value.replace(/\D/g, "").slice(0, 6);
    if (!nextCode) return;
    setCode(nextCode);
    inputRefs.current[Math.min(nextCode.length, 5)]?.focus();
  }

  return (
    <div className={styles.codeInputs} onPaste={(event) => {
      event.preventDefault();
      pasteCode(event.clipboardData.getData("text"));
    }}>
      {Array.from({ length: 6 }, (_, index) => (
        <input
          key={index}
          ref={(node) => {
            inputRefs.current[index] = node;
          }}
          className={styles.codeInput}
          value={code[index] ?? ""}
          onChange={(event) => setDigit(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !code[index] && index > 0) {
              inputRefs.current[index - 1]?.focus();
            }
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Цифра кода ${index + 1}`}
          maxLength={1}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
