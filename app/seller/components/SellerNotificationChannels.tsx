"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "@/app/components/ui/toast";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { ChoiceMark } from "../../components/ui/ChoiceMark";
import { SkeletonBlock } from "../../components/ui/SkeletonBlock";
import { TextInput } from "../../components/ui/TextInput";
import {
  createSellerTelegramLink,
  getSellerNotificationPreferences,
  getSellerTelegramStatus,
  notificationDraft,
  notificationEmailError,
  saveSellerNotificationPreferences,
  unlinkSellerTelegram,
  type SellerNotificationDraft,
  type SellerNotificationPreferences,
  type SellerTelegramStatus,
} from "../lib/sellerNotificationApi";
import styles from "./SellerNotificationChannels.module.css";

const EMPTY_DRAFT: SellerNotificationDraft = { email: "", emailEnabled: false, telegramEnabled: false };

function pendingLink(status: SellerTelegramStatus): SellerTelegramStatus | null {
  return !status.linked && status.url && status.expiresAt && Date.parse(status.expiresAt) > Date.now() ? status : null;
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
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [link, setLink] = useState<SellerTelegramStatus | null>(null);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
  const mutationPending = useRef(false);
  const checkingTelegram = useRef(false);
  const awaitingConnection = useRef(false);
  const telegramRequestVersion = useRef(0);
  const linked = Boolean(preferences?.telegramLinked);
  const busy = action !== null;
  const linkUrl = link?.url ?? null;

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await getSellerNotificationPreferences();
      setPreferences(loaded);
      setDraft(notificationDraft(loaded));
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Не удалось загрузить каналы уведомлений");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPreferences(); }, [loadPreferences]);

  const applyTelegramStatus = useCallback((status: SellerTelegramStatus) => {
    const enableAfterConnection = awaitingConnection.current;
    setPreferences(current => current ? { ...current, telegramLinked: status.linked, telegramUsername: status.telegramUsername } : current);
    setLink(pendingLink(status));
    setDraft(current => ({ ...current, telegramEnabled: status.linked && (current.telegramEnabled || enableAfterConnection) }));
    if (status.linked) awaitingConnection.current = false;
  }, []);

  const refreshTelegram = useCallback(async () => {
    if (checkingTelegram.current || mutationPending.current || document.visibilityState !== "visible") return;
    checkingTelegram.current = true;
    const version = ++telegramRequestVersion.current;
    try {
      const status = await getSellerTelegramStatus();
      if (version !== telegramRequestVersion.current) return;
      applyTelegramStatus(status);
      setTelegramError(null);
    } catch (reason) {
      if (version === telegramRequestVersion.current) setTelegramError(reason instanceof Error ? reason.message : "Не удалось проверить Telegram");
    } finally {
      checkingTelegram.current = false;
    }
  }, [applyTelegramStatus]);

  useEffect(() => {
    if (!linkUrl) return;
    void refreshTelegram();
    const refresh = () => { void refreshTelegram(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(interval);
    };
  }, [linkUrl, refreshTelegram]);

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
    ++telegramRequestVersion.current;
    setAction("save");
    setActionError(null);
    try {
      const saved = await saveSellerNotificationPreferences({ ...draft, telegramEnabled: draft.telegramEnabled && linked });
      setPreferences(saved);
      setDraft(notificationDraft(saved));
      awaitingConnection.current = false;
      return true;
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Не удалось сохранить каналы уведомлений");
      throw reason;
    } finally {
      mutationPending.current = false;
      setAction(null);
    }
  }, [draft, emailId, linked, preferences]);

  async function connectTelegram() {
    if (mutationPending.current) return;
    mutationPending.current = true;
    ++telegramRequestVersion.current;
    setAction("link");
    setTelegramError(null);
    setConfirmingUnlink(false);
    try {
      awaitingConnection.current = true;
      const status = await createSellerTelegramLink();
      applyTelegramStatus(status);
      if (status.url) window.open(status.url, "_blank", "noopener,noreferrer");
    } catch (reason) {
      awaitingConnection.current = false;
      setTelegramError(reason instanceof Error ? reason.message : "Не удалось подключить Telegram");
    } finally {
      mutationPending.current = false;
      setAction(null);
    }
  }

  async function disconnectTelegram() {
    if (mutationPending.current) return;
    mutationPending.current = true;
    ++telegramRequestVersion.current;
    setAction("unlink");
    setTelegramError(null);
    try {
      applyTelegramStatus(await unlinkSellerTelegram());
      awaitingConnection.current = false;
      setConfirmingUnlink(false);
      toast.success("Аккаунт Telegram отвязан");
    } catch (reason) {
      setTelegramError(reason instanceof Error ? reason.message : "Не удалось отвязать Telegram");
    } finally {
      mutationPending.current = false;
      setAction(null);
    }
  }

  return {
    dirty: Boolean(preferences && JSON.stringify(draft) !== JSON.stringify(notificationDraft(preferences))),
    reset() {
      if (preferences) setDraft(notificationDraft(preferences));
      setEmailError(null);
      setActionError(null);
      setConfirmingUnlink(false);
    },
    emailId,
    preferences,
    draft,
    loading,
    loadError,
    action,
    actionError,
    emailError,
    telegramError,
    link,
    linked,
    busy,
    confirmingUnlink,
    validate,
    savePreferences,
    loadPreferences,
    refreshTelegram,
    connectTelegram,
    disconnectTelegram,
    setConfirmingUnlink,
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

export function SellerNotificationChannels({ controller, disabled = false, onSubmitRequest }: {
  controller: SellerNotificationChannelsController;
  disabled?: boolean;
  onSubmitRequest: () => void;
}) {
  const headingId = useId();
  const controlsDisabled = disabled || controller.busy;
  const telegramStatus = controller.linked
    ? controller.preferences?.telegramUsername ? `@${controller.preferences.telegramUsername}` : "Аккаунт подключён"
    : controller.link ? "Подтвердите подключение в боте" : "Аккаунт не подключён";

  return <section className={styles.card} aria-labelledby={headingId}>
    <div className={styles.header}>
      <h3 id={headingId}>Уведомления</h3>
      <p>Email и Telegram можно включить одновременно</p>
    </div>

    {controller.loading ? <div className={styles.loading} role="status">
      <span className="visuallyHidden">Загрузка каналов уведомлений</span>
      <SkeletonBlock className={styles.loadingControl} />
      <SkeletonBlock className={styles.loadingField} />
      <SkeletonBlock className={styles.loadingControl} />
    </div> : controller.loadError ? <Banner tone="danger" actions={
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
                onSubmitRequest();
              }
            }}
            onChange={event => controller.setEmail(event.target.value)} />
        </div>

        <div className={styles.telegramRow}>
          <label className={`${styles.channel} ${controller.draft.telegramEnabled && controller.linked ? styles.selected : ""} ${!controller.linked ? styles.unavailable : ""}`}>
            <input type="checkbox" checked={controller.draft.telegramEnabled && controller.linked}
              disabled={controlsDisabled || !controller.linked}
              onChange={event => controller.setTelegramEnabled(event.target.checked)} />
            <ChoiceMark checked={controller.draft.telegramEnabled && controller.linked} appearance="outline-check" />
            <Image src="/icons/telegram.svg" alt="" width={18} height={18} aria-hidden="true" />
            <span>Telegram</span>
          </label>

          <p className={styles.telegramStatus}>{telegramStatus}</p>

          <div className={styles.telegramActions}>
            {controller.linked ? controller.confirmingUnlink ? <div className={styles.inlineConfirm}
              role="group" aria-label="Подтвердить отвязку Telegram">
              <span>Отвязать аккаунт?</span>
              <Button type="button" variant="utility" className={styles.dangerAction}
                loading={controller.action === "unlink"} disabled={disabled}
                onClick={() => void controller.disconnectTelegram()}>Да</Button>
              <Button type="button" variant="utility" disabled={controlsDisabled}
                onClick={() => controller.setConfirmingUnlink(false)}>Нет</Button>
            </div> : <Button type="button" variant="utility" disabled={controlsDisabled}
              onClick={() => controller.setConfirmingUnlink(true)}>Отвязать</Button>
              : controller.link?.url ? <a className={`buttonUtility ${styles.botLink}`}
                href={controller.link.url} target="_blank" rel="noopener noreferrer">Открыть бота</a>
              : <Button type="button" variant="utility" disabled={controlsDisabled}
                loading={controller.action === "link"}
                onClick={() => void controller.connectTelegram()}>Подключить</Button>}
          </div>
        </div>
      </div>

      {controller.telegramError ? <Banner tone="danger" actions={
        <Button type="button" variant="utility" disabled={controlsDisabled}
          onClick={() => void controller.refreshTelegram()}>Повторить проверку</Button>
      }>{controller.telegramError}</Banner> : null}
      {controller.actionError ? <Banner tone="danger">{controller.actionError}</Banner> : null}
      <p className={styles.hint}>Каналы сохраняются вместе с контактными данными</p>
    </>}
  </section>;
}
