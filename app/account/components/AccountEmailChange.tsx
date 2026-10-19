"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { OneTimeCodeInput } from "../../components/ui/OneTimeCodeInput";
import { changeEmail } from "../../lib/emailChange";
import { isValidResetEmail, normalizeResetEmail } from "../../lib/passwordReset";
import styles from "./AccountProfileTab.module.css";

type Step = "start" | "current" | "email" | "new";
export function AccountEmailChange({ email, onChanged, onCancel, onBusyChange }: {
  email: string; onChanged: (email: string) => void; onCancel: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const [step, setStep] = useState<Step>("start");
  const [code, setCode] = useState("");
  const [nextEmail, setNextEmail] = useState("");
  const [proof, setProof] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const resendAt = useRef(0);
  const locked = useRef(false);
  const region = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const interval = window.setInterval(() => setSeconds(Math.max(0, Math.ceil((resendAt.current - Date.now()) / 1000))), 1000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => { region.current?.querySelector<HTMLInputElement>("input")?.focus(); }, [step]);
  function cooldown(value = 60) { resendAt.current = Date.now() + value * 1000; setSeconds(value); }

  async function submit(resend = false) {
    if (locked.current) return;
    setError(null);
    if (resend && seconds > 0) return;
    if (!resend && (step === "current" || step === "new") && code.length !== 6) { setError("Введите 6 цифр из письма"); return; }
    const normalized = normalizeResetEmail(nextEmail);
    if ((step === "email" || step === "new") && !isValidResetEmail(normalized)) { setError("Проверьте адрес электронной почты"); return; }
    locked.current = true; setBusy(true); onBusyChange(true);
    try {
      if (step === "start" || step === "current" && resend) {
        const result = await changeEmail("start");
        cooldown(result.resendAfterSeconds); setCode(""); setStep("current");
      } else if (step === "current") {
        const result = await changeEmail("confirm-current", { code });
        if (!result.changeToken) throw new Error("Не удалось подтвердить текущую почту");
        setProof(result.changeToken); setCode(""); setStep("email");
      } else if (step === "email" || resend) {
        const result = await changeEmail("new/start", { changeToken: proof, email: normalized });
        cooldown(result.resendAfterSeconds); setNextEmail(normalized); setCode(""); setStep("new");
      } else {
        const result = await changeEmail("complete", { changeToken: proof, email: normalized, code });
        if (!result.email || result.emailVerified !== true) throw new Error("Не удалось подтвердить смену почты — обновите профиль");
        onChanged(result.email);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось выполнить запрос — попробуйте ещё раз");
    } finally { locked.current = false; setBusy(false); onBusyChange(false); }
  }

  return <div className={styles.emailChange} ref={region} role="region" aria-label="Смена электронной почты" aria-busy={busy}
    onKeyDown={event => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); void submit(); } }}>
    <p className={styles.emailChangeTitle}>{step === "start" || step === "current" ? "Подтвердите текущую почту" : step === "email" ? "Укажите новую почту" : "Подтвердите новую почту"}</p>
    <p className={styles.emailChangeHint}>{step === "start" ? `Отправим код на ${email}` : step === "current" ? `Введите код из письма на ${email}` : step === "email" ? "Старый адрес продолжит работать до подтверждения нового" : `Введите код из письма на ${nextEmail}`}</p>
    {step === "email" ? <TextInput label="Новая электронная почта" fieldVariant="inline" type="email" autoComplete="email" enterKeyHint="done" value={nextEmail} disabled={busy} error={error} onChange={event => { setNextEmail(event.target.value); setError(null); }} /> :
      step !== "start" ? <OneTimeCodeInput value={code} onChange={value => { setCode(value); setError(null); }} disabled={busy} error={error} /> : error ? <p className="fieldError" role="alert">{error}</p> : null}
    <Button type="button" variant="primary" loading={busy} onClick={() => void submit()}>{step === "start" || step === "email" ? "Получить код" : step === "current" ? "Продолжить" : "Подтвердить новую почту"}</Button>
    {step === "current" || step === "new" ? <button className={styles.emailChangeLink} type="button" disabled={busy || seconds > 0} onClick={() => void submit(true)}>{seconds > 0 ? `Отправить код ещё раз через ${seconds} с` : "Отправить код ещё раз"}</button> : null}
    <button className={styles.emailChangeLink} type="button" disabled={busy} onClick={onCancel}>Отменить смену почты</button>
  </div>;
}
