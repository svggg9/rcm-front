"use client";

import { Button } from "../components/ui/Button";
import { DesignSystemIcon } from "../components/ui/DesignSystemIcon";
import { Price } from "../components/ui/Price";
import styles from "./DesignSystem.module.css";

const variants = [
  { variant: "primary", title: "Основная", label: "Сохранить", note: "Главное действие экрана — графитовая заливка и белый текст" },
  { variant: "secondary", title: "Вторичная", label: "Отменить", note: "Альтернативное действие — чёрный контур и мягкий фон при наведении" },
  { variant: "ghost", title: "Текстовая", label: "Изменить", note: "Действие внутри блока — без рамки, с мягким фоном при наведении" },
  { variant: "utility", title: "Служебная", label: "Добавить", note: "Вспомогательное действие — обычный вес текста и мягкий фон при наведении" },
  { variant: "danger", title: "Опасная", label: "Удалить", note: "Удаление и другие опасные действия — смысловой контур и фон, подтверждение через ConfirmActionButton" },
] as const;

export function ButtonExamples() {
  return <>
    {variants.map(({ variant, title, label, note }) => <div key={variant} className={styles.buttonFamily}>
      <h3>{title}</h3>
      <div className={styles.buttonStates}>
        <div><span>Обычная · hover · focus</span><Button type="button" variant={variant}>{label}</Button></div>
        <div><span>Загрузка</span><Button type="button" variant={variant} loading>{label}</Button></div>
        <div><span>Успех</span><Button type="button" variant={variant} success>{label}</Button></div>
        <div><span>Недоступна</span><Button type="button" variant={variant} disabled>{label}</Button></div>
      </div>
      <p className={styles.note}>{note}</p>
    </div>)}

    <div className={styles.buttonFamily}>
      <h3>Размеры</h3>
      <div className={styles.buttonStates}>
        <div><span>Компактная · 36 px</span><Button type="button" size="compact">Сохранить</Button></div>
        <div><span>Обычная · 44 px</span><Button type="button">Сохранить</Button></div>
        <div><span>Крупная · 48 px</span><Button type="button" size="large" variant="primary">Продолжить</Button></div>
      </div>
      <p className={styles.note}>Размер задаётся через size, оформление — через variant. На телефоне область нажатия компактной кнопки увеличивается до 44 px</p>
    </div>

    <div className={styles.buttonFamily}>
      <h3>Иконки</h3>
      <div className={styles.actions}>
        <Button type="button" variant="primary" startIcon={<DesignSystemIcon name="plus" role="utility" />}>Добавить товар</Button>
        <Button type="button" endIcon={<DesignSystemIcon name="chevron-right" role="utility" />}>Открыть</Button>
        <Button type="button" variant="utility" iconOnly aria-label="Редактировать пример"><DesignSystemIcon name="pencil" role="utility" /></Button>
        <Button type="button" variant="danger" iconOnly aria-label="Удалить пример"><DesignSystemIcon name="trash" role="utility" /></Button>
        <Button type="button" variant="utility" size="compact" iconOnly aria-label="Предыдущее фото"><DesignSystemIcon name="chevron-left" role="utility" /></Button>
      </div>
      <p className={styles.note}>startIcon и endIcon используют общий отступ от текста. Для кнопки без текста задаём iconOnly и понятное aria-label, у декоративной иконки — aria-hidden</p>
    </div>

    <div className={styles.buttonFamily}>
      <h3>Загрузка со сложным содержимым</h3>
      <div className={`${styles.buttonStates} ${styles.buttonWideStates}`}>
        <div><span>Текст и Price</span><Button type="button" variant="primary">Оплатить <Price amount={5900} /></Button></div>
        <div><span>То же содержимое · загрузка</span><Button type="button" variant="primary" loading>Оплатить <Price amount={5900} /></Button></div>
        <div><span>Без резервирования ширины</span><Button type="button" loading reserveLabelSpace={false}>Получить код</Button></div>
        <div><span>Только иконка · загрузка</span><Button type="button" variant="utility" iconOnly loading aria-label="Обновить пример"><DesignSystemIcon name="clock" role="utility" /></Button></div>
      </div>
      <p className={styles.note}>При загрузке виден спиннер, повторное нажатие заблокировано, доступное название сохраняется. По умолчанию ширина остаётся прежней, reserveLabelSpace=false отключает только резервирование</p>
      <p className={styles.note}>tertiary совместим с ghost, primaryShimmer — прежнее имя primary, отдельные роли не создаём</p>
    </div>
  </>;
}
