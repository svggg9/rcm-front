"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "@/app/components/ui/toast";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { ChoiceMark } from "../../components/ui/ChoiceMark";
import { SectionLoader } from "../../components/ui/SectionLoader";
import { TextInput } from "../../components/ui/TextInput";
import { TelegramConnection } from "../../components/TelegramConnection";
import { useTelegramConnection } from "../../lib/useTelegramConnection";
import {
  getSellerNotificationPreferences,
  notificationDraft,
  notificationEmailError,
  saveSellerNotificationPreferences,
  type SellerNotificationDraft,
  type SellerNotificationPreferences,
} from "../lib/sellerNotificationApi";
import styles from "./SellerNotificationChannels.module.css";

const EMPTY_DRAFT: SellerNotificationDraft = { email: "", emailEnabled: false, telegramEnabled: false };
function requestError(reason: unknown, fallback: string) {
  return reason instanceof Error && !(reason instanceof TypeError) && !(reason instanceof SyntaxError) ? reason.message : fallback;
}

export function useSellerNotificationChannels() {
  const emailId = useId();
  const [preferences, setPreferences] = useState<SellerNotificationPreferences | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<"save" | "link" | "unlink" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const mutationPending = useRef(false);
  const telegram = useTelegramConnection();
  const linked = telegram.status?.linked ?? Boolean(preferences?.telegramLinked);
  const busy = action !== null || telegram.busy;

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await getSellerNotificationPreferences();
      setPreferences(loaded);
      setDraft(notificationDraft(loaded));
    } catch (reason) {
      setLoadError(requestError(reason, "Не удалось загрузить каналы уведомлений"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPreferences(); }, [loadPreferences]);

  const validate = useCallback(() => {
    if (!preferences) return true;
    const error = notificationEmailError(draft);
    setEmailError(error);
    return !error;
  }, [draft, preferences]);

  const savePreferences = useCallback(async () => {
    if (!preferences) return false;
    const validationError = notificationEmailError(draft);
    setEmailError(validationError);
    if (validationError) {
      document.getElementById(emailId)?.focus();
      throw new Error(validationError);
    }
    if (mutationPending.current) throw new Error("Дождитесь завершения текущего действия");
    mutationPending.current = true;
    setAction("save");
    setActionError(null);
    try {
      const saved = await saveSellerNotificationPreferences(draft);
      setPreferences(saved);
      setDraft(notificationDraft(saved));
      return true;
    } catch (reason) {
      setActionError(requestError(reason, "Не удалось сохранить каналы уведомлений"));
      throw reason;
    } finally {
      mutationPending.current = false;
      setAction(null);
    }
  }, [draft, emailId, preferences]);

  async function connectTelegram() {
    if (mutationPending.current) return;
    mutationPending.current = true;
    try {
      await telegram.connect();
    } finally {
      mutationPending.current = false;
    }
  }

  async function disconnectTelegram() {
    if (mutationPending.current) return;
    mutationPending.current = true;
    try {
      const status = await telegram.disconnect();
      if (status) {
        setPreferences(current => current ? { ...current, telegramLinked: false, telegramUsername: null } : current);
        toast.success(linked ? "Аккаунт Telegram отвязан" : "Подключение Telegram отменено");
      }
    } finally {
      mutationPending.current = false;
    }
  }

  return {
    dirty: Boolean(preferences && JSON.stringify(draft) !== JSON.stringify(notificationDraft(preferences))),
    reset() {
      if (preferences) setDraft(notificationDraft(preferences));
      setEmailError(null);
      setActionError(null);
    },
    emailId,
    preferences,
    draft,
    loading,
    loadError,
    action: action ?? telegram.action,
    actionError,
    emailError,
    telegram,
    linked,
    busy,
    validate,
    savePreferences,
    loadPreferences,
    connectTelegram,
    disconnectTelegram,
    setEmailEnabled(value: boolean) {
      setDraft(current => ({ ...current, emailEnabled: value }));
      setEmailError(null);
      setActionError(null);
    },
    setTelegramEnabled(value: boolean) {
      setDraft(current => ({ ...current, telegramEnabled: value }));
      setActionError(null);
    },
    setEmail(value: string) {
      setDraft(current => ({ ...current, email: value }));
      setEmailError(null);
      setActionError(null);
    },
  };
}

export type SellerNotificationChannelsController = ReturnType<typeof useSellerNotificationChannels>;

export function SellerNotificationChannels({ controller, disabled = false }: {
  controller: SellerNotificationChannelsController;
  disabled?: boolean;
}) {
  const headingId = useId();
  const controlsDisabled = disabled || controller.busy || controller.loading;
  async function save() {
    try {
      if (await controller.savePreferences()) toast.success("Настройки уведомлений сохранены");
    } catch { /* Inline validation and request errors stay in this section. */ }
  }

  return <section className={styles.card} aria-labelledby={headingId}>
    <div className={styles.header}>
      <h3 id={headingId}>Уведомления</h3>
      <p>Email и Telegram можно включить одновременно</p>
    </div>

    {controller.loading && !controller.preferences ? <SectionLoader label="Загрузка каналов уведомлений" compact /> : controller.loadError ? <Banner tone="danger" actions={
      <Button type="button" variant="utility" disabled={controlsDisabled}
        onClick={() => void controller.loadPreferences()}>Повторить</Button>
    }>{controller.loadError}</Banner> : <>
      <div className={styles.notificationRows} role="group" aria-label="Каналы доставки уведомлений">
        <div className={styles.emailRow}>
          <label className={`${styles.channel} ${controller.draft.emailEnabled ? styles.selected : ""}`}>
            <input type="checkbox" checked={controller.draft.emailEnabled} disabled={controlsDisabled}
              onChange={event => controller.setEmailEnabled(event.target.checked)} />
            <ChoiceMark checked={controller.draft.emailEnabled} appearance="outline-check" />
            <span>Email</span>
          </label>
          <TextInput id={controller.emailId} label="Email для уведомлений" hideLabel fieldVariant="boxed"
            type="email" autoComplete="email" enterKeyHint="done" maxLength={254} value={controller.draft.email}
            disabled={controlsDisabled} required={controller.draft.emailEnabled} error={controller.emailError}
            hint="Этот адрес не меняет почту для входа"
            onKeyDown={event => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (!controlsDisabled && controller.dirty) void save();
              }
            }}
            onChange={event => controller.setEmail(event.target.value)} />
        </div>

        <div className={styles.telegramRow}>
          <label className={`${styles.channel} ${controller.draft.telegramEnabled ? styles.selected : ""} ${!controller.linked && !controller.draft.telegramEnabled ? styles.unavailable : ""}`}>
            <input type="checkbox" checked={controller.draft.telegramEnabled}
              disabled={controlsDisabled || (!controller.linked && !controller.draft.telegramEnabled)}
              onChange={event => controller.setTelegramEnabled(event.target.checked)} />
            <ChoiceMark checked={controller.draft.telegramEnabled} appearance="outline-check" />
            <Image src="/icons/telegram.svg" alt="" width={18} height={18} aria-hidden="true" />
            <span>Telegram</span>
          </label>

          <TelegramConnection controller={controller.telegram} disabled={disabled || controller.action === "save"}
            onConnect={() => void controller.connectTelegram()} onDisconnect={() => void controller.disconnectTelegram()} />
        </div>
        {!controller.linked && controller.draft.telegramEnabled && <p className={styles.hint}>Выбор Telegram сохранён — уведомления возобновятся после подключения аккаунта</p>}
      </div>

      {controller.actionError ? <Banner tone="danger">{controller.actionError}</Banner> : null}
      <div className={styles.preferenceActions}>
        <Button type="button" variant="secondary" disabled={controlsDisabled || !controller.dirty} onClick={controller.reset}>Отменить изменения</Button>
        <Button type="button" variant="primary" disabled={disabled || !controller.dirty || (controller.busy && controller.action !== "save")}
          loading={controller.action === "save"} onClick={() => void save()}>Сохранить уведомления</Button>
      </div>
      <p className={styles.hint}>Настройки уведомлений сохраняются отдельно от реквизитов, подключение аккаунта применяется сразу</p>
    </>}
  </section>;
}
