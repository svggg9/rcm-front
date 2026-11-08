import Link from "next/link";
import styles from "./DesignSystem.module.css";

const families = [
  ["Кнопки и действия", "Button, ButtonPair, LikeButton, ActionPrompt, ConfirmActionButton", "buttons"],
  ["Текст и числа", "Price, SectionHeader, SettingsSection", "formats"],
  ["Ввод", "Field, InputControl, TextInput, Textarea, NumericInput, NumericField, PhoneInput, OneTimeCodeInput, TextEditor", "fields"],
  ["Выпадающие поля", "FormSelect, FormCombobox, FormMultiSelect, CategoryPicker, useDropdown", "dropdowns"],
  ["Выбор", "Checkbox, Radio, SegmentedControl, SizeOptions, ChoiceMark", "selection"],
  ["Таблицы", "DataTable: нативная таблица, общие границы, ячейки и параметры плотности", "lists"],
  ["Навигация кабинета", "CabinetTabs, CabinetPanel, CabinetSidebar", "lists"],
  ["Сообщения", "Banner, RequestError, FormError, toast / RcmToaster", "feedback"],
  ["Проверка формы", "FormValidationBoundary, InlineEditorGuard", "fields"],
  ["Окна и подсказки", "Dialog, EditorSurface, PopoverPanel, InfoHint, useModalDialog, modalScrollLock", "overlays"],
  ["Статусы и счётчики", "StatusBadge, NotificationBadge", "status"],
  ["Загрузка", "Loader, SectionLoader, CabinetSkeleton, CabinetPageSkeleton, CartContentSkeleton, ListLoadMore", "states"],
  ["Пустой экран", "EmptyState, ActionPrompt", "api-errors"],
  ["Иконки и сортировка", "Icon, DesignSystemIcon, SortIndicator", "icons"],
  ["Показатели", "MetricGrid, TimeSeriesChart", "analytics"],
  ["Витрина", "ProductTile, ProductImageCarousel, MobilePanelHeader, BrandWordmark, StorefrontSectionCard, ProductSelectionOrder, StorefrontNavigation, ProductShowcaseAction", "storefront"],
  ["Оформление заказа", "CheckoutFlow, CheckoutDeliverySection, CheckoutContactSection, PickupPointMap", "checkout-example"],
  ["Чат поддержки", "SupportChatView для покупателя и администратора", "ds-support-chat"],
] as const;

export function ComponentReference() {
  return <>
    <div className={styles.referenceList}>
      {families.map(([title, components, target]) => <div key={title} className={styles.referenceRow}>
        <a href={`#${target}`}>{title}</a><code>{components}</code>
      </div>)}
    </div>
    <p className={styles.note}>Источник компонентов — app/components/ui, токенов — app/styles/tokens.css. Витрина и формы используют также общие составные блоки своих модулей. Внутренний wrapper не требует отдельного визуального компонента</p>
  </>;
}

export function FoundationRules() {
  return <div className={styles.ruleGrid}>
    <article><h3>Цвет по роли</h3><p>Текст и нейтральные линии чёрные. Текст различается размером и весом, линии — толщиной: разделитель0,5px, рамка1px, активная граница2px. Поверхность и наведение используют один светло-серый оттенок</p><p>Золото — фирменный акцент и заливка предупреждений. Цвет состояния сохраняют иконки, рамки и фоны: информация нейтральная, успех зелёный, ошибка красная</p></article>
    <article><h3>Отступы</h3><div className={styles.spacingScale} aria-label="Шкала отступов">{Array.from({length: 9}, (_, i) => <div key={i}><code>space-{i + 1}</code><span style={{ width: `var(--space-${i + 1})` }} /></div>)}</div><p>4, 8, 12, 16, 20, 24, 32, 40, 48 px — текущая шкала. Отступ отвечает за связь элементов, а не за заполнение свободного места</p></article>
    <article><h3>Ширина и адаптация</h3><p>Основной контейнер до 1440 px, кабинет продавца до 1200 px. Поля страницы через page-padding: 32 px с каждой стороны, до 768 px — 16 px</p><p>Контрольные ширины 320, 390 и 1280 px. Внутри горизонтально прокручиваются ленты и вкладки, страница не должна прокручиваться вбок</p></article>
    <article><h3>Геометрия и движение</h3><p>Поля и кнопки с прямыми углами. Круглая форма сохраняется у радио, счётчиков и смысловых иконок</p><p>Переходы используют transition-fast / transition-medium; reduced-motion отключает необязательную анимацию</p></article>
    <article><h3>Фокус и взаимодействие</h3><p>Клавиатурный фокус видим. Кнопке только с иконкой нужен aria-label, на телефоне — область нажатия не меньше 44 px</p><p>Hover текстового действия — surface-hover. Активная линия вкладки сохраняется, подчёркивание при наведении не добавляем</p></article>
    <article><h3>Текст и состояния</h3><p>Короткие подписи, подсказки и пункты из одного предложения — без конечной точки. Длинные абзацы сохраняют обычную пунктуацию.</p><p>Ожидание — спиннер или skeleton с доступным названием. Ошибка, пустой результат и отсутствие прав — разные состояния</p></article>
  </div>;
}

export function RevisionReference() {
  return <>
    <div className={styles.ruleGrid}>
      <article><h3>1 · Общие основы подключены</h3><p>Кнопки и поля используют один каскад. Типографика, палитра, отступы и линии рабочих модулей подключены к общим токенам</p></article>
      <article><h3>2 · Поведение объединено</h3><p>Окна используют общую блокировку прокрутки и возврат фокуса. Checkbox, Radio и DataTable применяются в рабочих формах и списках</p></article>
      <article><h3>3 · Дорабатываем компоненты</h3><p>Правим общее семейство, проверяем его состояния в ДС и на затронутых экранах. Локально остаются расположение, плотность и особенности конкретной задачи</p></article>
    </div>
    <p className={styles.note}>Очередь и подтверждённые исключения — FRONTEND_BACKLOG.md; подробный срез — DESIGN_SYSTEM_REVIEW.md. Наличие примера здесь не означает, что все старые экраны уже перенесены</p>
    <Link href="/design-system/panels" className="buttonSecondary">Проверить панель и диалог редактора</Link>
  </>;
}
