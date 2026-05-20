"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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
import { toast } from "sonner";

import { AuthModalContext, type AuthModalMode } from "./useAuthModal";
import styles from "./AuthModal.module.css";

type Props = {
  children: ReactNode;
};

export function AuthModalProvider({ children }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("login");
  const [next, setNext] = useState("/");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const openAuth = useCallback((nextMode: AuthModalMode = "login", nextPath = "/") => {
    setMode(nextMode);
    setNext(nextPath);
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
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, closeAuth]);

  async function finishAuth(cartId: string) {
    const guestFavoriteIds = getGuestFavoriteIds();

    setAuth(cartId);

    if (guestFavoriteIds.length > 0) {
      await syncFavoritesAfterLogin(guestFavoriteIds);
      clearGuestFavoriteIds();
    }

    window.dispatchEvent(new Event("auth-changed"));
    closeAuth();
    toast.success(mode === "login" ? "Вы вошли в аккаунт" : "Аккаунт создан");
    router.replace(next);
    router.refresh();
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {
      const cartId = await ensureCartId();

      const response = await apiFetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ username, password, cartId }),
      });

      if (!response.ok) {
        throw new Error("Неверный логин или пароль");
      }

      const data: { cartId: string } = await response.json();
      await finishAuth(data.cartId);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Ошибка входа"
        );
      } finally {
        setSubmitting(false);
      }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {
      const registerResponse = await apiFetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (!registerResponse.ok) {
        const text = await registerResponse.text().catch(() => "");
        throw new Error(text || "Ошибка регистрации");
      }

      const cartId = await ensureCartId();

      const loginResponse = await apiFetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ username, password, cartId }),
      });

      if (!loginResponse.ok) {
        const text = await loginResponse.text().catch(() => "");
        throw new Error(text || "Регистрация успешна, но вход не выполнен");
      }

      const data: { cartId: string } = await loginResponse.json();
      await finishAuth(data.cartId);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Ошибка входа"
        );
      } finally {
        setSubmitting(false);
      }
  }

  return (
    <AuthModalContext.Provider value={value}>
      {children}

      {open ? (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={closeAuth}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Вход или регистрация"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.close}
              onClick={closeAuth}
              aria-label="Закрыть"
            >
              ×
            </button>

            <div className={styles.header}>
              <h2 className={styles.title}>Войдите или создайте аккаунт</h2>

              <div className={styles.tabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "login"}
                  className={`${styles.tab} ${
                    mode === "login" ? styles.tabActive : ""
                  }`}
                  onClick={() => {
                    setMode("login");
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
                    setMode("register");
                  }}
                >
                  Создать аккаунт
                </button>
              </div>
            </div>

            <div className={styles.body}>
              {mode === "login" ? (
                <form className={styles.form} onSubmit={handleLogin}>
                  <label className={styles.field}>
                    <span className={styles.label}>Email или логин</span>
                    <input
                      className={styles.input}
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      required
                      autoComplete="username"
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>Пароль</span>
                    <div className={styles.passwordWrap}>
                      <input
                        className={styles.input}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        autoComplete="current-password"
                      />

                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? "Скрыть" : "Показать"}
                      </button>
                    </div>
                  </label>

                  <button type="button" className={styles.forgot}>
                    Забыли пароль?
                  </button>

                  <button
                    type="submit"
                    className={styles.submit}
                    disabled={submitting}
                  >
                    {submitting ? "Входим…" : "Войти"}
                  </button>

                  <div className={styles.switchText}>
                    Нет аккаунта?{" "}
                    <button
                      type="button"
                      className={styles.switchButton}
                      onClick={() => {
                        setMode("register");
                      }}
                    >
                      Создать аккаунт
                    </button>
                  </div>
                </form>
              ) : (
                <form className={styles.form} onSubmit={handleRegister}>
                  <label className={styles.field}>
                    <span className={styles.label}>Email или логин</span>
                    <input
                      className={styles.input}
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      required
                      autoComplete="username"
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>Пароль</span>
                    <div className={styles.passwordWrap}>
                      <input
                        className={styles.input}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? "Скрыть" : "Показать"}
                      </button>
                    </div>
                  </label>

                  <p className={styles.legal}>
                    Регистрируясь, вы соглашаетесь с условиями пользования и
                    политикой конфиденциальности.
                  </p>

                  <label className={`${styles.checkbox} ${styles.newsletter}`}>
                    <input
                      type="checkbox"
                      checked={newsletter}
                      onChange={(event) => setNewsletter(event.target.checked)}
                    />
                    <span>
                      Подписаться на рассылку, чтобы не пропускать новые
                      коллекции и привилегии.
                    </span>
                  </label>

                  <button
                    type="submit"
                    className={styles.submit}
                    disabled={submitting}
                  >
                    {submitting ? "Регистрируем…" : "Зарегистрироваться"}
                  </button>

                  <div className={styles.switchText}>
                    Уже есть аккаунт?{" "}
                    <button
                      type="button"
                      className={styles.switchButton}
                      onClick={() => {
                        setMode("login");
                      }}
                    >
                      Войти
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AuthModalContext.Provider>
  );
}