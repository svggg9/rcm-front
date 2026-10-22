"use client";

import { useId, useState } from "react";
import { Button } from "./ui/Button";
import { Banner } from "./ui/Banner";
import { Loader } from "./ui/Loader";
import { telegramUrl } from "../lib/telegram";
import type { TelegramConnectionController } from "../lib/useTelegramConnection";
import styles from "./TelegramConnection.module.css";

export function TelegramConnection({ controller, disabled = false, title, description, onConnect, onDisconnect }: {
  controller: TelegramConnectionController;
  disabled?: boolean;
  title?: string;
  description?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}) {
  const id = useId();
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const status = controller.status;
  const confirmationTarget = status ? JSON.stringify([status.linked, status.telegramUsername, status.url, status.expiresAt]) : null;
  const confirming = confirmationTarget !== null && confirmation === confirmationTarget;
  const linked = Boolean(status?.linked);
  const pending = controller.pending;
  const unavailable = disabled || controller.busy;
  const account = status?.telegramUsername ? `@${status.telegramUsername.replace(/^@/, "")}` : "Личный аккаунт";
  const copy = pending ? linked ? `${account} пока подключён — подтвердите новый аккаунт в боте` : "Откройте бота и нажмите «Запустить»"
    : status?.status === "EXPIRED" ? linked ? "Срок новой ссылки истёк — прежний аккаунт подключён" : "Срок ссылки истёк — создайте новую"
    : linked ? `${account} подключён` : "Аккаунт не подключён";
  function closeConfirmation() {
    setConfirmation(null);
    requestAnimationFrame(() => document.getElementById(`${id}-unlink`)?.focus());
  }

  return <div className={styles.connection} aria-labelledby={title ? id : undefined} aria-label={title ? undefined : "Подключение Telegram"}>
    {title && <h3 className={styles.title} id={id}>{title}</h3>}
    {description && <p className={styles.description}>{description}</p>}
    {controller.loading && !status ? <Loader inline label="Проверка подключения Telegram" /> : status ? <>
      <p className={styles.status} role="status">{copy}</p>
      {status?.botUsername && <p className={styles.hint}>Бот @{status.botUsername.replace(/^@/, "")}{status.linkEnvironment === "test" ? " · тестовая среда" : ""}</p>}
      {pending && <p className={styles.hint}>После запуска вернитесь сюда — подключение проверится автоматически</p>}
      <div className={styles.actions}>
        {pending && telegramUrl(status?.url) ? <a className={`buttonSecondary ${styles.botLink}`} href={telegramUrl(status?.url)!}
          target="_blank" rel="noopener noreferrer">Открыть бота</a> : null}
        {pending && <Button type="button" variant="utility" disabled={unavailable} onClick={() => void controller.refresh()}>Проверить подключение</Button>}
        {!pending && !linked && <Button type="button" variant="secondary" disabled={unavailable} loading={controller.action === "link"}
          onClick={() => onConnect ? onConnect() : void controller.connect()}>{status?.status === "EXPIRED" ? "Создать новую ссылку" : "Подключить Telegram"}</Button>}
        {(linked || pending) && !confirming && <Button id={`${id}-unlink`} type="button" variant="utility" disabled={unavailable}
          onClick={() => { setConfirmation(confirmationTarget); requestAnimationFrame(() => document.getElementById(`${id}-cancel`)?.focus()); }}>
          {pending ? linked ? "Отключить Telegram" : "Отменить подключение" : "Отвязать"}</Button>}
        {linked && !pending && !confirming && <Button type="button" variant="utility" disabled={unavailable} loading={controller.action === "link"}
          onClick={() => onConnect ? onConnect() : void controller.connect()}>Сменить аккаунт</Button>}
        {confirming && (linked || pending) && <div className={styles.confirm} role="group" aria-label="Подтвердить отвязку Telegram"
          onKeyDown={event => { if (event.key === "Escape" && !unavailable) { event.preventDefault(); closeConfirmation(); } }}>
          <span>{pending ? linked ? "Отключить текущий аккаунт и отменить новую ссылку?" : "Отменить подключение?" : "Отвязать аккаунт?"}</span>
          <Button type="button" variant="utility" disabled={unavailable} loading={controller.action === "unlink"} onClick={() => {
            setConfirmation(null);
            if (onDisconnect) onDisconnect();
            else void controller.disconnect();
          }}>Да</Button>
          <Button id={`${id}-cancel`} type="button" variant="utility" disabled={unavailable} onClick={closeConfirmation}>Нет</Button>
        </div>}
        {pending && <Button type="button" variant="utility" disabled={unavailable} loading={controller.action === "link"}
          onClick={() => onConnect ? onConnect() : void controller.connect()}>Новая ссылка</Button>}
      </div>
    </> : null}
    {linked && status?.deliveryStatus === "UNAVAILABLE" && <Banner tone="warning">
      Доставка недоступна — проверьте, что бот не заблокирован, или подключите другой аккаунт
    </Banner>}
    {linked && status?.deliveryStatus === "UNKNOWN" && <p className={styles.hint}>Доставка в этот чат ещё не подтверждена</p>}
    {controller.error && <Banner tone="danger" actions={<Button type="button" variant="utility" disabled={unavailable}
      onClick={() => void controller.refresh()}>Повторить проверку</Button>}>{controller.error}</Banner>}
  </div>;
}
