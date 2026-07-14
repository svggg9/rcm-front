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

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("login");
  const [placement, setPlacement] =
    useState<NonNullable<AuthModalOptions["placement"]>>("modal");
  const [returnPath, setReturnPath] = useState("/");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [registerStep, setRegisterStep] = useState<"email" | "code">("email");
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

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {
      if (registerStep === "email") {
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
        setRegisterStep("code");
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
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthModalMode) {
    setMode(nextMode);
    setRegisterStep("email");
    setCode("");
    setPassword("");
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
                <form className={styles.form} onSubmit={handleLogin}>
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
                    fieldVariant="boxed"
                    hideLabel
                    placeholder="Электронная почта"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
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
                        <Icon name={passwordVisible ? "eye-off" : "eye"} size={17} strokeWidth={1.6} />
                      </button>
                    </div>
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
              ) : (
                <form className={styles.form} onSubmit={handleRegister}>
                  {registerStep === "email" ? (
                    <>
                      <TextInput
                        label="Электронная почта"
                        fieldVariant="boxed"
                        hideLabel
                        placeholder="Электронная почта"
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
                          <Icon name={passwordVisible ? "eye-off" : "eye"} size={17} strokeWidth={1.6} />
                        </button>
                      </div>

                      
                    </>
                  ) : null}

                  {registerStep === "code" ? (
                    <TextInput
                      label="Код из письма"
                      fieldVariant="boxed"
                      hideLabel
                      placeholder="Код из письма"
                      value={code}
                      onChange={(event) =>
                        setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      inputMode="numeric"
                      required
                    />
                  ) : null}

                  <p className={styles.legal}>
                    Регистрируясь, вы соглашаетесь с условиями пользования и политикой конфиденциальности
                  </p>

                  <Button
                    type="submit"
                    variant="primaryShimmer"
                    className={styles.submit}
                    disabled={submitting}
                  >
                    {registerStep === "email" ? "Получить код" : "Создать аккаунт"}
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

