import Link from "next/link";

import styles from "./AuthPageSwitch.module.css";

type Props = {
  mode: "login" | "register";
  next: string;
  disabled?: boolean;
};

export function AuthPageSwitch({ mode, next, disabled = false }: Props) {
  const target = mode === "login" ? "register" : "login";
  const href = `/auth/${target}?next=${encodeURIComponent(next)}`;

  return (
    <p className={styles.switch}>
      {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
      <Link
        href={href}
        className={styles.link}
        aria-disabled={disabled || undefined}
        onClick={(event) => { if (disabled) event.preventDefault(); }}
      >
        {mode === "login" ? "Зарегистрироваться" : "Войти"}
      </Link>
    </p>
  );
}
