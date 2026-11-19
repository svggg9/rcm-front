"use client";

import { useState } from "react";
import { AccountProfileTab, type AccountProfileUpdate } from "../account/components/AccountProfileTab";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import type { changeEmail } from "../lib/emailChange";
import styles from "./AccountProfileExample.module.css";

type Mode = "filled" | "empty" | "busy";
const modes: { value: Mode; label: string }[] = [
  { value: "filled", label: "Заполнен" },
  { value: "empty", label: "Пустой" },
  { value: "busy", label: "Сохранение" },
];
const demoEmailChange: typeof changeEmail = async (action, body = {}) => {
  if (action === "confirm-current") return { changeToken: "demo-token" };
  if (action === "complete") return { email: body.email, emailVerified: true };
  return { resendAfterSeconds: 0 };
};

export function AccountProfileExample() {
  const [mode, setMode] = useState<Mode>("filled");
  return <div className={styles.example}>
    <p>Рабочий профиль покупателя на условных данных. Сохранение и коды выполняются только в примере; для подтверждения подойдут любые шесть цифр</p>
    <SegmentedControl items={modes} value={mode} onChange={setMode} ariaLabel="Состояние профиля в примере" />
    <ProfileDemo key={mode} mode={mode} />
  </div>;
}

function ProfileDemo({ mode }: { mode: Mode }) {
  const [profile, setProfile] = useState<AccountProfileUpdate>(() => mode === "empty"
    ? { firstName: "", lastName: "", phone: "" }
    : { firstName: "Алексей", lastName: "Иванов", phone: "79000000000" });
  const [email, setEmail] = useState("buyer@example.test");
  const [message, setMessage] = useState("");
  return <div className={styles.profile}>
    <AccountProfileTab {...profile} email={email} emailVerified saving={mode === "busy"} initialEditing={mode === "busy"}
      onSave={async value => { setProfile(value); setMessage("Данные примера сохранены"); return true; }}
      onEmailChanged={value => { setEmail(value); setMessage("Почта изменена только в примере"); }}
      requestPasswordReset={async () => { setMessage("Письмо не отправлялось — это пример"); return { ttlSeconds: 600, resendAfterSeconds: 0 }; }}
      requestEmailChange={demoEmailChange} />
    <p className={styles.note} role="status">{message || "Данные профиля не отправляются на сервер"}</p>
  </div>;
}
