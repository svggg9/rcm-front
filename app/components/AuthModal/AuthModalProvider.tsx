"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { apiFetch, API_URL } from "../../lib/api";
import { startYandexAuth } from "../../lib/yandexAuth";
import { ensureCartId, setAuth } from "../../lib/auth";
import {
  clearGuestFavoriteIds,
  getGuestFavoriteIds,
  syncFavoritesAfterLogin,
} from "../../lib/favorites";

import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { TextInput } from "../ui/TextInput";
import {
  AuthModalContext,
  type AuthModalMode,
  type AuthModalOptions,
} from "./useAuthModal";
import styles from "./AuthModal.module.css";

type Props = {
  children: ReactNode;
};

export function AuthModalProvider({ children }: Props) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("login");
  const [placement, setPlacement] =
    useState<NonNullable<AuthModalOptions["placement"]>>("modal");
  const [returnPath, setReturnPath] = useState("/");

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [registerStep, setRegisterStep] = useState<"email" | "code">("email");
  const [loginStep, setLoginStep] = useState<"password" | "code">("password");
  const [submitting, setSubmitting] = useState(false);

  const openAuth = useCallback((
    nextMode: AuthModalMode = "login",
    nextPath = "/",
    options?: AuthModalOptions
  ) => {
    setReturnPath(nextPath);
    setMode(nextMode);
    setPlacement(options?.placement ?? "modal");
    setPasswordVisible(false);
    setLoginStep("password");
    setRegisterStep("email");
    setCode("");
    setFirstName("");
    setOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      openAuth,
      closeAuth,
    }),
    [openAuth, closeAuth]
  );

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAuth();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    if (placement === "modal") {
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (placement === "modal") {
        document.body.style.overflow = "";
      }
    };
  }, [open, closeAuth, placement]);

  const applyAuth = useCallback(async (cartId: string) => {
    const guestFavoriteIds = getGuestFavoriteIds();

    setAuth(cartId);

    if (guestFavoriteIds.length > 0) {
      await syncFavoritesAfterLogin(guestFavoriteIds);
      clearGuestFavoriteIds();
    }

    window.dispatchEvent(new Event("auth-changed"));
  }, []);

  const finishAuth = useCallback(
    async (cartId: string) => {
      await applyAuth(cartId);

      closeAuth();
      router.refresh();
    },
    [applyAuth, closeAuth, router]
  );

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {
      const cartId = await ensureCartId();

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
    } finally {
      setSubmitting(false);
    }
  }

  async function startCodeLogin() {
    if (submitting) return;
    if (!email.trim()) {
      toast.error("Введите электронную почту");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch(`${API_URL}/api/auth/email/login/start`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось отправить код");
      }

      setCode("");
      setLoginStep("code");
      window.setTimeout(() => codeInputRefs.current[0]?.focus(), 0);
      toast.success("Код отправлен на почту");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось отправить код"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const completeCodeLogin = useCallback(
    async (value: string) => {
      if (submitting || value.length !== 6) return;

      setSubmitting(true);
      try {
        const cartId = await ensureCartId();
        const response = await apiFetch(
          `${API_URL}/api/auth/email/login/complete`,
          {
            method: "POST",
            body: JSON.stringify({
              email: email.trim(),
              code: value,
              cartId,
            }),
          }
        );

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || "Неверный или просроченный код");
        }

        const data: { cartId: string } = await response.json();
        setCode("");
        setLoginStep("password");
        await finishAuth(data.cartId);
      } catch (error) {
        setCode("");
        codeInputRefs.current[0]?.focus();
        toast.error(
          error instanceof Error ? error.message : "Не удалось войти"
        );
      } finally {
        setSubmitting(false);
      }
    },
    [email, finishAuth, submitting]
  );

  useEffect(() => {
    if (loginStep === "code" && code.length === 6) {
      void completeCodeLogin(code);
    }
  }, [code, completeCodeLogin, loginStep]);

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

  async function handleRegisterStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {
      if (!firstName.trim()) {
        throw new Error("Введите имя");
      }

      if (!password.trim()) {
        throw new Error("Введите пароль");
      }

      if (password.length < 8) {
        throw new Error("Пароль должен быть от 8 символов");
      }

      const response = await apiFetch(`${API_URL}/api/auth/email/register/start`, {
          method: "POST",
          body: JSON.stringify({ email, password, firstName: firstName.trim() }),
        });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось отправить код");
      }

      await response.json().catch(() => null);
      setCode("");
      setRegisterStep("code");
      window.setTimeout(() => codeInputRefs.current[0]?.focus(), 0);
      toast.success("Код подтверждения отправлен на почту");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Ошибка регистрации"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegisterComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;
    if (code.length !== 6) {
      toast.error("Введите шестизначный код");
      return;
    }

    setSubmitting(true);

    try {
      const cartId = await ensureCartId();

      const response = await apiFetch(`${API_URL}/api/auth/email/register/complete`, {
        method: "POST",
        body: JSON.stringify({
          email,
          code,
          cartId,
          firstName: firstName.trim(),
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось создать аккаунт");
      }

      const data: { cartId: string } = await response.json();
      await finishAuth(data.cartId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка регистрации");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthModalMode) {
    setMode(nextMode);
    setRegisterStep("email");
    setLoginStep("password");
    setCode("");
    setPassword("");
    setFirstName("");
    setPasswordVisible(false);
  }

  return (
    <AuthModalContext.Provider value={value}>
      {children}

      {open ? (
        <div
          className={`${styles.overlay} ${
            placement === "anchored" ? styles.overlayAnchored : ""
          }`}
          role="presentation"
          onMouseDown={closeAuth}
        >
          <div
            ref={modalRef}
            className={`${styles.modal} ${
              placement === "anchored" ? styles.modalAnchored : ""
            }`}
            role="dialog"
            aria-modal={placement === "modal"}
            aria-label="Вход или регистрация"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.header}>
              <div className={styles.headerTop}>
                <h2 className={styles.title}>Войдите или создайте аккаунт</h2>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={closeAuth}
                  aria-label="Закрыть"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>

              <div className={styles.tabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "login"}
                  className={`${styles.tab} ${
                    mode === "login" ? styles.tabActive : ""
                  }`}
                  onClick={() => switchMode("login")}
                >
                  Войти
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "register"}
                  className={`${styles.tab} ${
                    mode === "register" ? styles.tabActive : ""
                  }`}
                  onClick={() => switchMode("register")}
                >
                  Создать аккаунт
                </button>
              </div>
            </div>

            <div className={styles.body}>
              {mode === "login" ? (
                <form
                  className={styles.form}
                  onSubmit={
                    loginStep === "password"
                      ? handleLogin
                      : (event) => event.preventDefault()
                  }
                >
                  <TextInput
                    label="Электронная почта"
                    fieldVariant="boxed"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                  />

                  {loginStep === "password" ? (
                    <>
                      <div className={styles.passwordLoginGroup}>
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

                      <div className={styles.authActions}>
                        <Button
                          type="submit"
                          variant="primaryShimmer"
                          className={styles.submit}
                          disabled={submitting}
                        >
                          Войти
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          className={`${styles.submit} ${styles.otpButton}`}
                          onClick={() => void startCodeLogin()}
                          disabled={submitting}
                        >
                          Продолжить с OTP
                        </Button>
                      </div>

                      <div className={styles.oauthDivider}>
                        <span>ИЛИ</span>
                      </div>

                      <button
                        type="button"
                        className={styles.oauthButton}
                        onClick={handleYandexLogin}
                        disabled={submitting}
                      >
                        Войти через Яндекс
                      </button>
                    </>
                  ) : (
                    <>
                      <p className={styles.codeHint}>
                        Введите код, отправленный на {email}
                      </p>
                      <CodeInputs
                        code={code}
                        setCode={setCode}
                        inputRefs={codeInputRefs}
                        disabled={submitting}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setCode("");
                          setLoginStep("password");
                        }}
                        disabled={submitting}
                      >
                        Войти другим способом
                      </Button>
                    </>
                  )}
                </form>
              ) : (
                <form
                  key={registerStep}
                  className={styles.form}
                  onSubmit={
                    registerStep === "email"
                      ? handleRegisterStart
                      : handleRegisterComplete
                  }
                >
                  {registerStep === "email" ? (
                    <>
                      <TextInput
                        label="Имя"
                        fieldVariant="boxed"
                        type="text"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        required
                        autoComplete="given-name"
                      />

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
                          aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
                          title={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
                        >
                          <Icon name={passwordVisible ? "eye-off" : "eye"} size={17} strokeWidth={1.6} />
                        </button>
                      </div>

                      
                    </>
                  ) : null}

                  {registerStep === "code" ? (
                    <>
                      <p className={styles.codeHint}>
                        Введите код, отправленный на {email}
                      </p>
                      <CodeInputs
                        code={code}
                        setCode={setCode}
                        inputRefs={codeInputRefs}
                        disabled={submitting}
                      />
                    </>
                  ) : null}

                  <p className={styles.legal}>
                    Регистрируясь, вы вступаете в программу лояльности и
                    соглашаетесь с документами «
                    <Link href="/legal/terms" target="_blank">
                      Условия пользования
                    </Link>
                    » и «
                    <Link href="/legal/privacy" target="_blank">
                      Политика конфиденциальности
                    </Link>
                    ».
                  </p>

                  <Button
                    type="submit"
                    variant="primaryShimmer"
                    className={styles.submit}
                    disabled={submitting}
                  >
                    {registerStep === "email" ? "Получить код" : "Создать аккаунт"}
                  </Button>

                  <div className={styles.oauthDivider}>
                    <span>ИЛИ</span>
                  </div>

                  <button
                    type="button"
                    className={styles.oauthButton}
                    onClick={handleYandexLogin}
                    disabled={submitting}
                  >
                    Войти через Яндекс
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AuthModalContext.Provider>
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

