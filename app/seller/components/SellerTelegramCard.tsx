"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiFetch, API_URL } from "../../lib/api";
import { StatusBadge } from "../../components/ui/StatusBadge";

import styles from "./SellerTelegramCard.module.css";

type TelegramStatus = {
  url: string | null;
  expiresAt: string | null;
  linked: boolean;
  telegramUsername: string | null;
};

export function SellerTelegramCard() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);

    try {
      const response = await apiFetch(`${API_URL}/api/profile/telegram`);

      if (!response.ok) {
        throw new Error("Не удалось загрузить статус Telegram");
      }

      const data = (await response.json()) as TelegramStatus;
      setStatus(data);

      if (data.linked) {
        setLinkUrl(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить Telegram");
    } finally {
      setLoading(false);
    }
  }

  async function createLink() {
    if (linking) return;

    setLinking(true);

    try {
      const response = await apiFetch(`${API_URL}/api/profile/telegram/link`, {
        method: "POST",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось создать ссылку");
      }

      const data = (await response.json()) as TelegramStatus;
      setStatus(data);
      setLinkUrl(data.url);

      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось создать ссылку");
    } finally {
      setLinking(false);
    }
  }

  async function unlink() {
    if (unlinking) return;

    setUnlinking(true);

    try {
      const response = await apiFetch(`${API_URL}/api/profile/telegram`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось отключить Telegram");
      }

      const data = (await response.json()) as TelegramStatus;
      setStatus(data);
      setLinkUrl(null);
      toast.success("Telegram отключен");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось отключить Telegram");
    } finally {
      setUnlinking(false);
    }
  }

  const linked = Boolean(status?.linked);
  const username = status?.telegramUsername ? `@${status.telegramUsername}` : "Подключен";

  return (
    <section className={styles.card} aria-label="Telegram уведомления">
      <div className={styles.header}>
        <div>
          <h2 className={`${styles.title} textTitle`}>Telegram уведомления</h2>
          <p className={`${styles.text} textSmall`}>
            Новые заказы будут приходить в Telegram после подключения бота.
          </p>
        </div>

        {loading ? (
          <span className={styles.skeleton} aria-hidden="true" />
        ) : linked ? (
          <StatusBadge tone="success">{username}</StatusBadge>
        ) : (
          <StatusBadge>Не подключен</StatusBadge>
        )}
      </div>

      <div className={styles.actions}>
        {linked ? (
          <button
            type="button"
            className="buttonSecondary textButton"
            onClick={() => void unlink()}
            disabled={unlinking}
          >
            {unlinking ? "Отключаем" : "Отключить"}
          </button>
        ) : (
          <button
            type="button"
            className="buttonPrimary textButton"
            onClick={() => void createLink()}
            disabled={loading || linking}
          >
            {linking ? "Создаем ссылку" : "Подключить"}
          </button>
        )}

        {linkUrl ? (
          <a
            className="buttonSecondary textButton"
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
          >
            Открыть бота
          </a>
        ) : null}

        <button
          type="button"
          className="buttonSecondary textButton"
          onClick={() => void loadStatus()}
          disabled={loading}
        >
          Проверить
        </button>
      </div>
    </section>
  );
}
