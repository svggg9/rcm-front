"use client";

import { useRef } from "react";
import type { AuthModalMode } from "./useAuthModal";
import styles from "./AuthTabs.module.css";

const tabs = [{ value: "login", label: "Войти" }, { value: "register", label: "Создать аккаунт" }] as const;

export function AuthTabs({ value, onChange, disabled = false }: {
  value: AuthModalMode;
  onChange: (value: AuthModalMode) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  return <div className={styles.tabs} role="tablist" aria-label="Вход и регистрация">
    {tabs.map((tab, index) => <button key={tab.value} ref={node => { refs.current[index] = node; }}
      type="button" role="tab" id={`auth-dialog-tab-${tab.value}`} aria-controls="auth-dialog-panel"
      aria-selected={value === tab.value} tabIndex={value === tab.value ? 0 : -1} disabled={disabled}
      className={styles.tab} onClick={() => { if (value !== tab.value) onChange(tab.value); }}
      onKeyDown={event => {
        if (disabled) return;
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
          : event.key === "ArrowRight" ? (index + 1) % tabs.length
          : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : null;
        if (next === null) return;
        event.preventDefault();
        refs.current[next]?.focus();
        if (tabs[next].value !== value) onChange(tabs[next].value);
      }}>{tab.label}</button>)}
  </div>;
}
