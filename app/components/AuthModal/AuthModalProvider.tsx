"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { apiFetch, API_URL } from "../../lib/api";
import { ensureCartId, setAuth } from "../../lib/auth";
import {
  clearGuestFavoriteIds,
  getGuestFavoriteIds,
  syncFavoritesAfterLogin,
} from "../../lib/favorites";
import { useAutoFocusFirstField } from "../../lib/useAutoFocusFirstField";
import { toast } from "sonner";

import { Button } from "../ui/Button";
import { PhoneInput } from "../ui/PhoneInput";
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

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1.8 8.5C3.05 5.95 5.42 4.25 8.5 4.25s5.45 1.7 6.7 4.25c-1.25 2.55-3.62 4.25-6.7 4.25s-5.45-1.7-6.7-4.25Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 10.4a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {visible ? (
        <path
          d="M3.4 13.6 13.6 3.4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

export function AuthModalProvider({ children }: Props) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("login");
  const [placement, setPlacement] =
    useState<NonNullable<AuthModalOptions["placement"]>>("modal");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmationVisible, setPasswordConfirmationVisible] =
    useState(false);
  const [registerStep, setRegisterStep] = useState<"phone" | "code" | "password">("phone");
  const [resetStep, setResetStep] = useState<"phone" | "code" | "password">("phone");
  const [resetActive, setResetActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useAutoFocusFirstField(modalRef, [open, mode, registerStep, resetStep, resetActive]);

  function focusFirstFieldSoon() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const field = modalRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          "input:not([type='hidden']):not(:disabled), textarea:not(:disabled), select:not(:disabled)"
        );
        field?.focus({ preventScroll: true });
      });
    });
  }

  const openAuth = useCallback((
    nextMode: AuthModalMode = "login",
    nextPath = "/",
    options?: AuthModalOptions
  ) => {
    void nextPath;
    setMode(nextMode);
    setPlacement(options?.placement ?? "modal");
    setResetActive(false);
    setPasswordConfirmation("");
    setPasswordVisible(false);
    setPasswordConfirmationVisible(false);
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

  async function finishAuth(cartId: string) {
    await applyAuth(cartId);

    closeAuth();
    router.refresh();
  }

  async function applyAuth(cartId: string) {
    const guestFavoriteIds = getGuestFavoriteIds();

    setAuth(cartId);

    if (guestFavoriteIds.length > 0) {
      await syncFavoritesAfterLogin(guestFavoriteIds);
      clearGuestFavoriteIds();
    }

    window.dispatchEvent(new Event("auth-changed"));
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

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
      toast.error(error instanceof Error ? error.message : "Ошибка входа");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {
      if (registerStep === "phone") {
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
        setRegisterStep("code");
        return;
      }

      if (registerStep === "code") {
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
        await applyAuth(data.cartId);
        router.refresh();
        setPassword("");
        setPasswordConfirmation("");
        setRegisterStep("password");
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

      closeAuth();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка входа");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

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
      toast.error(error instanceof Error ? error.message : "Не удалось восстановить пароль");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthModalMode) {
    setMode(nextMode);
    setRegisterStep("phone");
    setResetStep("phone");
    setResetActive(false);
    setCode("");
    setPassword("");
    setPasswordConfirmation("");
    setPasswordVisible(false);
    setPasswordConfirmationVisible(false);
    focusFirstFieldSoon();
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
              <div className={styles.tabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "login"}
                  className={`${styles.tab} ${
                    mode === "login" ? styles.tabActive : ""
                  }`}
                  onClick={() => {
                    switchMode("login");
                  }}
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
                  onClick={() => {
                    switchMode("register");
                  }}
                >
                  Создать аккаунт
                </button>
              </div>
            </div>

            <div className={styles.body}>
              {mode === "login" && !resetActive ? (
                <form className={styles.form} onSubmit={handleLogin}>
                  <PhoneInput
                    label="Телефон"
                    fieldVariant="boxed"
                    hideLabel
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                  />

                  <div className={styles.passwordLoginGroup}>
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
                        aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
                        title={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
                      >
                        <PasswordVisibilityIcon visible={passwordVisible} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className={styles.forgotInline}
                      onClick={() => {
                        setResetActive(true);
                        setResetStep("phone");
                        setCode("");
                        setPassword("");
                        setPasswordConfirmation("");
                        focusFirstFieldSoon();
                      }}
                    >
                      Забыли пароль?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="primaryShimmer"
                    className={styles.submit}
                    disabled={submitting}
                  >
                    Войти
                  </Button>

                </form>
              ) : mode === "login" ? (
                <form className={styles.form} onSubmit={handlePasswordReset}>
                  <p className={styles.formHint}>
                    Введите телефон, чтобы восстановить пароль
                  </p>

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
                          aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
                          title={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
                        >
                          <PasswordVisibilityIcon visible={passwordVisible} />
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
                          aria-label={
                            passwordConfirmationVisible ? "Скрыть пароль" : "Показать пароль"
                          }
                          title={
                            passwordConfirmationVisible ? "Скрыть пароль" : "Показать пароль"
                          }
                        >
                          <PasswordVisibilityIcon visible={passwordConfirmationVisible} />
                        </button>
                      </div>
                    </>
                  ) : null}

                  <Button
                    type="submit"
                    variant="primaryShimmer"
                    className={styles.submit}
                    disabled={submitting}
                  >
                    {resetStep === "phone"
                      ? "Получить код"
                      : resetStep === "code"
                        ? "Продолжить"
                        : "Восстановить пароль"}
                  </Button>
                </form>
              ) : (
                <form className={styles.form} onSubmit={handleRegister}>
                  {registerStep === "phone" ? (
                    <PhoneInput
                      label="Телефон"
                      fieldVariant="boxed"
                      hideLabel
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      required
                    />
                  ) : null}

                  {registerStep === "code" ? (
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

                  {registerStep === "password" ? (
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
                          aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
                          title={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
                        >
                          <PasswordVisibilityIcon visible={passwordVisible} />
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
                          aria-label={
                            passwordConfirmationVisible ? "Скрыть пароль" : "Показать пароль"
                          }
                          title={
                            passwordConfirmationVisible ? "Скрыть пароль" : "Показать пароль"
                          }
                        >
                          <PasswordVisibilityIcon visible={passwordConfirmationVisible} />
                        </button>
                      </div>
                    </>
                  ) : null}

                  {registerStep !== "password" ? (
                    <>
                      <p className={styles.legal}>
                        Регистрируясь, вы соглашаетесь с условиями пользования и
                        политикой конфиденциальности
                      </p>

                    </>
                  ) : null}

                  <Button
                    type="submit"
                    variant="primaryShimmer"
                    className={styles.submit}
                    disabled={submitting}
                  >
                    {registerStep === "phone"
                      ? "Получить код"
                      : registerStep === "code"
                        ? "Создать аккаунт"
                        : "Сохранить пароль"}
                  </Button>

                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AuthModalContext.Provider>
  );
}
