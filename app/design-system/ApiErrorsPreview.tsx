"use client";

import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { EmptyState } from "../components/ui/EmptyState";
import { RequestError } from "../components/ui/RequestError";
import { HeaderIcon } from "../components/Header/HeaderIcon";
import { Icon } from "../components/ui/Icon";
import { TextInput } from "../components/ui/TextInput";
import { toast } from "../components/ui/toast";
import styles from "./ApiErrorsPreview.module.css";

/** Real shared components with local demo state; no API writes. */
export function ApiErrorsPreview() {
  const [loading, setLoading] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  return <div className={styles.preview}>
    <div className={styles.toolbar}>
      <span className={styles.draft}>Общие компоненты · выбранный стиль Lime</span>
      <label className={styles.loadingToggle}>
        <input type="checkbox" checked={loading} onChange={event => setLoading(event.target.checked)} />
        Показать ожидание
      </label>
    </div>

    <div className={styles.grid}>
      <article className={styles.example}>
        <h3 className={styles.exampleHeader}>01 · Не загрузился раздел</h3>
        <div className={styles.sectionError}>
          <RequestError message="Не удалось загрузить товары" text="Попробуйте ещё раз" loading={loading} onRetry={() => setLoading(true)} />
        </div>
        <p className={styles.caption}>Внутри раздела, вместо недоступного содержимого</p>
      </article>

      <article className={styles.example}>
        <h3 className={styles.exampleHeader}>02 · Ошибка внутри блока</h3>
        <div className={styles.blockContext}>
          <h4>Доставка</h4>
          <RequestError variant="inline" message="Не удалось обновить стоимость доставки" loading={loading} onRetry={() => setLoading(true)} />
          <p className={styles.preserved}>Выбранный пункт выдачи сохранён</p>
        </div>
        <p className={styles.caption}>Остальная страница и введённые данные остаются</p>
      </article>

      <article className={styles.example}>
        <h3 className={styles.exampleHeader}>03 · Ошибка поля</h3>
        <div className={styles.fieldExample}>
          <TextInput label="Электронная почта" type="email" value="anna@" readOnly
            fieldVariant="inline" error="Проверьте адрес электронной почты" />
        </div>
        <p className={styles.caption}>Под полем, без дополнительного уведомления</p>
      </article>

      <article className={styles.example}>
        <h3 className={styles.exampleHeader}>04 · Ошибка короткого действия</h3>
        <div className={styles.toastExample}>
          <div className={`rcmToast ${styles.toastSample}`} data-type="error">
            <span data-icon><Icon name="alert" size={20} /></span>
            <div data-content><p className="rcmToastTitle">Не удалось сохранить бренд</p></div>
            <span data-close-button aria-hidden="true"><Icon name="x" size={18} /></span>
          </div>
          <button type="button" className={styles.retry} onClick={() => toast.error("Не удалось сохранить бренд", {
            id: "api-errors-design-preview",
          })}>Показать уведомление</button>
        </div>
        <p className={styles.caption}>Один раз на действие, исчезает через 4 секунды</p>
      </article>

      <article id="feedback-empty" className={styles.example}>
        <h3 className={styles.exampleHeader}>05 · Пустая корзина</h3>
        <div className={styles.emptyState}>
          <EmptyState title="Ваша корзина пуста" illustration={<HeaderIcon name="bag" />}
            actions={<Button variant="primary">В магазин</Button>} />
        </div>
        <p className={styles.caption}>Иконка сумки, короткий заголовок и основное действие</p>
      </article>

      <article className={styles.example}>
        <h3 className={styles.exampleHeader}>06 · Пустой раздел без иконки</h3>
        <div className={styles.emptyState}>
          <EmptyState title="Адресов пока нет" text="Сохраните адрес, чтобы быстрее оформлять заказы"
            actions={<Button variant="primary">Добавить адрес</Button>} />
        </div>
        <p className={styles.caption}>Образец оформления из референса, раздел адресов не добавляется</p>
      </article>

      <article className={`${styles.example} ${styles.dialogExample}`}>
        <h3 className={styles.exampleHeader}>07 · Подтверждающий диалог</h3>
        <p className={styles.caption}>Заголовок по центру, серое пояснение и одна основная кнопка</p>
        <button type="button" className={styles.retry} onClick={() => { setConfirmationChecked(false); setConfirmationOpen(true); }}>Открыть пример очистки корзины</button>
        {confirmationChecked ? <p className={styles.caption} role="status">Пример подтверждён — рабочая корзина не менялась</p> : null}
      </article>
    </div>
    <p className={styles.note}>Inter · заголовки обычного веса и заглавными · серые пояснения · белый фон · прямые углы · основные кнопки чёрные, 44 px, подпись 14 px · свободные отступы как в присланных референсах</p>
    {confirmationOpen ? <Dialog variant="confirmation" title="Вы уверены, что хотите очистить корзину?"
      onClose={() => setConfirmationOpen(false)}
      actions={<Button variant="primary" onClick={() => { setConfirmationOpen(false); setConfirmationChecked(true); }}>Очистить корзину</Button>}>
      <p>При очистке корзины все добавленные ранее товары (2) будут удалены</p>
    </Dialog> : null}
  </div>;
}
