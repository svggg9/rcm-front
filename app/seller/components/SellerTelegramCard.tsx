"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "../../components/ui/Button";
import { SkeletonBlock } from "../../components/ui/SkeletonBlock";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { apiFetch, API_URL } from "../../lib/api";

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
        <div className={styles.titleRow}>
          <Image
            src="/icons/telegram.svg"
            alt=""
            width={24}
            height={24}
            aria-hidden="true"
            className={styles.icon}
          />
          <div>
            <h3 className={styles.title}>Telegram</h3>
            <p className={styles.text}>
              Уведомления о новых заказах и важных изменениях магазина.
            </p>
          </div>
        </div>

        {loading ? (
          <SkeletonBlock as="span" className={styles.skeleton} />
        ) : linked ? (
          <StatusBadge tone="success" size="regular">
            {username}
          </StatusBadge>
        ) : (
          <StatusBadge size="regular">Не подключен</StatusBadge>
        )}
      </div>

      <div className={styles.actions}>
        {linked ? (
          <Button
            type="button"
            variant="secondary"
            className={styles.actionButton}
            onClick={() => void unlink()}
            loading={unlinking}
          >
            Отключить
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            className={styles.actionButton}
            onClick={() => void createLink()}
            disabled={loading}
            loading={linking}
          >
            Подключить Telegram
          </Button>
        )}

        {linkUrl ? (
          <a
            className={`buttonSecondary ${styles.actionButton}`}
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
          >
            Открыть бота
          </a>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          className={styles.checkButton}
          onClick={() => void loadStatus()}
          disabled={loading}
        >
          Проверить
        </Button>
      </div>
    </section>
  );
}
