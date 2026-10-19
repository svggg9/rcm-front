"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LikeButton } from "../components/ui/LikeButton";
import { NumericField } from "../components/ui/NumericField";
import { INTEGER_RULES, WEIGHT_RULES } from "../lib/numericInput";
import { TextInput } from "../components/ui/TextInput";
import { OneTimeCodeInput } from "../components/ui/OneTimeCodeInput";
import { PhoneInput } from "../components/ui/PhoneInput";
import { Textarea } from "../components/ui/Textarea";
import { FormSelect } from "../components/ui/FormSelect";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { IconName } from "../components/ui/Icon";
import { DesignSystemIcon as Icon } from "./DesignSystemIcon";
import { CabinetPanel } from "../components/ui/CabinetPanel";
import { ProductTileSkeleton } from "../components/ui/CommerceSkeleton";
import { OrderDetailsPreview } from "./OrderDetailsPreview";
import { IconOptionsPreview } from "./IconOptionsPreview";
import { TypographyComparison } from "./TypographyComparison";
import fieldStyles from "./FieldPreview.module.css";
import styles from "./DesignSystem.module.css";
import { ToastExamples } from "./ToastExamples";
import { Banner } from "../components/ui/Banner";
import { ProductArticleButton } from "../product/[id]/components/ProductArticleButton";
import productStyles from "../product/[id]/ProductPage.module.css";
import { DropdownExamples } from "./DropdownExamples";
import { ValidationExample } from "./ValidationExample";

const sections = [
  ["foundation", "Основа"], ["type", "Типографика"], ["buttons", "Кнопки"],
  ["fields", "Поля"], ["status", "Статусы"], ["feedback", "Баннеры"],
  ["lists", "Списки"], ["icons", "Иконки"], ["states", "Состояния"],
] as const;

const swatches = [
  ["Чёрный", "--black"], ["Белый", "--white"], ["Золото", "--gold"],
  ["Тёмное золото", "--gold-deep"], ["Вторичный текст", "--muted"],
  ["Успех", "--success"], ["Внимание", "--warning"], ["Ошибка", "--danger"],
] as const;

const typeRoles = [
  ["Заголовок страницы", "textPageTitle", "--font-3xl", "Мой первый бренд"],
  ["Заголовок раздела", "textSectionTitle", "--font-2xl", "Новый заказ"],
  ["Заголовок карточки", "textTitle", "--font-xl", "Шёлковая рубашка"],
  ["Основной текст", "textBody", "--font-md", "Подготовьте заказ и передайте его в доставку"],
  ["Вторичный текст", "textSmall muted", "--font-sm", "Это нужно, чтобы отправить товар на публикацию"],
  ["Подпись", "textCaption muted", "--font-xs", "Изменения не сохранятся"],
] as const;

const iconExamples: Array<[IconName, string]> = [
  ["return-circle", "Возврат"], ["wallet", "Выплаты"], ["bell", "Уведомления"],
  ["check-circle", "Успех"], ["alert", "Ошибка"], ["clock", "Ожидание"],
  ["search", "Поиск"], ["images", "Фотографии"], ["heart", "Избранное"], ["x", "Закрыть"],
];

function Section({ id, title, note, children }: {
  id: string; title: string; note: string; children: ReactNode;
}) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <header className={styles.sectionHeader}>
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{note}</p>
      </header>
      {children}
    </section>
  );
}

function ButtonExamples({ variant }: { variant: "primary" | "secondary" | "ghost" | "utility" }) {
  const [interaction, setInteraction] = useState("Обычное состояние");
  const textVariant = variant === "ghost";
  const utilityVariant = variant === "utility";
  const className = textVariant ? styles.textButton : utilityVariant ? styles.utilityButton : undefined;
  const label = variant === "primary" ? "Сохранить" : textVariant ? "Изменить" : utilityVariant ? "▪ Добавить список" : "Отменить";
  const stateLabel = textVariant || utilityVariant ? label : "Сохранить";
  const loadingLabel = textVariant ? "Изменение" : utilityVariant ? "Добавление списка" : "Сохранение";
  return (
    <div className={styles.buttonFamily}>
      <h3>{variant === "primary" ? "Основная" : textVariant ? "Текстовая" : utilityVariant ? "Компактная служебная" : "Вторичная"}</h3>
      <div className={styles.buttonStates}>
        <div><span>Живая кнопка</span><Button variant={variant} className={className} type="button"
          onPointerEnter={() => setInteraction("Наведение")}
          onPointerLeave={() => setInteraction("Обычное состояние")}
          onPointerDown={() => setInteraction("Нажатие")}
          onPointerUp={() => setInteraction("Наведение")}
          onFocus={() => setInteraction("Фокус")}
          onBlur={() => setInteraction("Обычное состояние")}
          onKeyDown={event => { if (event.key === " " || event.key === "Enter") setInteraction("Нажатие"); }}
          onKeyUp={() => setInteraction("Фокус")}
        >{label}</Button></div>
        <div><span>Загрузка</span><Button variant={variant} className={className} loading aria-label={loadingLabel} type="button">{stateLabel}</Button></div>
        <div><span>Недоступна</span><Button variant={variant} className={className} disabled type="button">{stateLabel}</Button></div>
      </div>
      <p className={styles.note}>{interaction}. Наведите курсор, нажмите кнопку или перейдите к ней клавишей Tab</p>
      {textVariant && <p className={styles.note}>Для действий внутри карточки: «Изменить», «Удалить». Без рамки, бледно-серый фон появляется только при наведении, без анимации</p>}
      {utilityVariant && <p className={styles.note}>Для компактных служебных действий в редакторах и карточках: «Добавить список», «Добавить пункт», стрелки и удаление. Используем общий <code>Button variant=&quot;utility&quot;</code>: 36 px, обычный вес, без рамки; серый фон появляется мгновенно при наведении и нажатии, без сдвига</p>}
    </div>
  );
}

function LikeDemo() {
  const [liked, setLiked] = useState(false);
  return (
    <div className={styles.buttonFamily}>
      <h3>Кнопка лайка</h3>
      <div className={styles.likePreview}>
        <LikeButton liked={liked} aria-label="Нравится" onClick={() => setLiked(!liked)} />
        <span className={styles.note} role="status">{liked ? "Добавлено в избранное" : "Не в избранном"}</span>
      </div>
      <p className={styles.note}>Фон появляется сразу, сердечко плавно заполняется чёрным. Нажатие переключает избранное только в этом примере</p>
    </div>
  );
}

function SaveDemo() {
  const label = "Сохранить пример";
  const [phase, setPhase] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fail, setFail] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function save() {
    if (timer.current) return;
    setPhase("loading");
    timer.current = setTimeout(() => {
      if (fail) {
        setPhase("error");
        timer.current = null;
        return;
      }
      setPhase("success");
      timer.current = setTimeout(() => {
        setPhase("idle");
        timer.current = null;
      }, 1500);
    }, 1200);
  }
  return (
    <div className={styles.demo}>
      <h3>Проверить сохранение</h3>
      <label className={styles.checkbox}><input type="checkbox" checked={fail}
        disabled={phase === "loading" || phase === "success"} onChange={event => setFail(event.target.checked)} />Сымитировать ошибку</label>
      <div className={styles.actions}>
        <span className={styles.saveSlot}>
          <span aria-hidden="true" className={`buttonPrimary ${styles.saveSizer}`}>{label}</span>
          <Button type="button" variant="primary" className={styles.saveButton}
            loading={phase === "loading"} success={phase === "success"} disabled={phase === "success"}
            aria-label={phase === "loading" ? "Сохранение примера" : phase === "success" ? "Пример успешно сохранён" : label}
            onClick={save}>{label}</Button>
        </span>
      </div>
      <p className={styles.demoResult} role="status">
        {phase === "success" ? "Пример сохранён" : phase === "error" ? "Не удалось сохранить. Попробуйте ещё раз" : phase === "loading" ? "" : "Данные никуда не отправляются"}
      </p>
    </div>
  );
}

export function DesignSystemClient() {
  const [emailCode, setEmailCode] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tab, setTab] = useState("orders");
  const [screenState, setScreenState] = useState("empty");
  return (
    <div className={`pageContainer ${styles.page}`}>
      <header className={styles.pageHeader}>
        <p className={styles.kicker}>рцмаркет / рабочий эталон</p>
        <h1>Дизайн-система</h1>
        <p>Сверяем решения в одном месте. Общие компоненты показаны как есть, без косметических исправлений для этой страницы</p>
        <p className={styles.note}>Только локальная разработка. Демонстрационные данные. Изменения рабочих экранов — после согласования</p>
      </header>

      <nav className={styles.navigation} aria-label="Разделы дизайн-системы">
        {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <Section id="foundation" title="Основа" note="Согласовано: чёрный, белый, небольшие золотые акценты, прямые углы">
        <div className={styles.palette}>
          {swatches.map(([name, token]) => <div key={token} className={styles.swatch}>
            <div style={{ background: `var(${token})` }} aria-hidden="true" />
            <strong>{name}</strong><code>{token}</code>
          </div>)}
        </div>
        <details className={styles.review}><summary>Что ещё нужно согласовать</summary>
          <p>Единые назначения оттенков серого, размеры иконок, правила сетки и отступов. Точные значения не считаем утверждёнными только потому, что они уже есть в коде</p>
        </details>
      </Section>

      <Section id="type" title="Типографика" note="Сравниваем текущую ДС и предложение на том же шрифте Inter">
        <TypographyComparison />
        <details className={styles.review}>
          <summary>Текущая шкала текстовых ролей</summary>
        <div className={styles.typeList}>
          {typeRoles.map(([name, className, token, text]) => <div key={token} className={styles.typeRow}>
            <div className={styles.caption}><strong>{name}</strong><code>{token}</code></div>
            <p className={className}>{text}</p>
          </div>)}
        </div>
        </details>
        <details className={styles.review}><summary>Расхождение, которое нужно закрыть</summary>
          <p>Образец формы с правками принят. В компонентах ещё есть локальные размеры и веса — перенос выбранных правил на рабочие экраны будет отдельным шагом</p>
        </details>
      </Section>

      <Section id="buttons" title="Кнопки" note="Основная чёрная, вторичная с чёрной рамкой, текстовая и компактная служебная без рамки. При загрузке только спиннер">
        <ButtonExamples variant="primary" /><ButtonExamples variant="secondary" /><ButtonExamples variant="ghost" /><ButtonExamples variant="utility" />
        <div className={productStyles.productArticle}><ProductArticleButton article="104582" /></div>
        <LikeDemo />
        <SaveDemo />
        <p className={styles.note}>«Сохранить» остаётся активной и в незаполненной форме. По нажатию показываем ошибки у полей и прокручиваем к первой. Во время запроса повторная отправка заблокирована. Недоступное состояние — только для действительно недоступных действий с объяснением причины</p>
        <details className={styles.review}><summary>Правила кнопок закреплены в общей ДС</summary>
          <p>Основные уровни, компактное служебное действие, поведение лайка, состояния нажатия и результат сохранения реализованы общими компонентами. Для служебных кнопок используем вариант <code>utility</code>, а не копируем локальные hover- и focus-стили</p>
        </details>
      </Section>

      <Section id="fields" title="Поля" note="Чёрные подписи и рамки, компактные ошибки. Раскрытое поле и список образуют единый блок без внутренней линии">
        <ValidationExample />
        <div className={`${styles.formGrid} ${fieldStyles.fields}`}>
          <TextInput label="Название бренда" autoComplete="off" />
          <TextInput label="Заполненное поле" defaultValue="Мой первый бренд" autoComplete="off" />
          <div><TextInput label="Поле с ошибкой" type="email" defaultValue="brand@" error="Проверьте адрес электронной почты" aria-describedby="demo-email-error" />
            <span id="demo-email-error" className="visuallyHidden">Проверьте адрес электронной почты</span></div>
          <TextInput label="Недоступное поле" defaultValue="На проверке" disabled />
          <PhoneInput value={phone} onChange={event => setPhone(event.target.value)} fieldVariant="boxed" autoComplete="off" />
          <FormSelect label="Категория" value={category} onChange={setCategory}
            options={[{ value: "clothing", label: "Одежда" }, { value: "home-art", label: "Дом и искусство" }]} />
          <DropdownExamples />
          <Textarea label="О бренде" rows={3} />
          <TextInput label="Обязательное поле" required hint="Это нужно, чтобы отправить товар на публикацию" />
          <TextInput label="Почтовый индекс" placeholder="Например, 990022" inputMode="numeric" maxLength={6} autoComplete="postal-code" />
          <TextInput label="Электронная почта" type="email" autoComplete="off" />
          <NumericField label="Цена, ₽" name="demoPrice" autoComplete="off" />
          <NumericField label="Количество" {...INTEGER_RULES} />
          <NumericField label="Вес, кг" {...WEIGHT_RULES} />
          <div><p>Код из письма</p><OneTimeCodeInput value={emailCode} onChange={setEmailCode} /></div>
        </div>
        <details className={styles.review}><summary>Что проверяем перед утверждением</summary>
          <p>Рамка 1 px чёрная, при ошибке красная по всему периметру. Ошибка 13 px, отступ от поля 4 px. Подписи и пояснения чёрные. Плейсхолдер оставляем только там, где он поясняет формат, а не повторяет название поля</p>
        </details>
      </Section>

      <Section id="status" title="Статусы" note="Образцы статусов согласованы. Показаны компактный и обычный размеры">
        {(["compact", "regular"] as const).map(size => <div key={size} className={styles.statusRow}>
          <code>{size}</code><StatusBadge size={size}>Черновик</StatusBadge>
          <StatusBadge tone="success" size={size}>Активен</StatusBadge>
          <StatusBadge tone="warning" size={size}>На модерации</StatusBadge>
          <StatusBadge tone="danger" size={size}>Нужна доработка</StatusBadge>
        </div>)}
        <p className={styles.note}>Применение согласованных статусов на рабочих экранах проверим при переносе ДС</p>
      </Section>

      <Section id="feedback" title="Баннеры" note="Общий компонент для правил, предупреждений, ошибок и успешных действий: цветная заливка, иконка и чёрный текст без рамок">
        <div className={styles.compareGrid}>
          <div className={styles.stack}>
            <Banner tone="info" title="Перед заполнением">
              <ul><li>Сверяйте сведения с официальными документами.</li><li>Укажите рабочие контакты и пункт отправки СДЭК.</li></ul>
            </Banner>
            <Banner tone="warning" title="Проверьте фотографии">Для модерации нужны 3–10 фотографий от 1200 px по короткой стороне. Главное фото — на белом фоне.</Banner>
          </div>
          <div className={styles.stack}>
            <Banner tone="success" title="Данные сохранены">Обязательные сведения заполнены. Можно перейти к созданию товара.</Banner>
            <Banner tone="danger" title="Не удалось сохранить">Попробуйте ещё раз. Заполненные данные остались в форме.</Banner>
          </div>
        </div>
        <p className={styles.note}>Жёлто-золотой — пояснение, жёлтый — внимание, зелёный — успех, красный — ошибка. Заголовок и действия добавляются по необходимости; ошибки конкретных полей остаются под полями.</p>
        <h3>Всплывающие уведомления</h3>
        <div className={styles.actions}><ToastExamples /></div>
        <p className={styles.note}>Те же цвета по смыслу: зелёный — успех, красный — ошибка, жёлтый — внимание, золотистый — информация. Снизу справа, с иконкой и крестиком. Все обычные уведомления исчезают через 4 секунды.</p>
      </Section>

      <Section id="lists" title="Списки и навигация" note="Макет деталки в три ряда: товары, оплата, доставка. Все данные условные, действия не отправляются на сервер">
        <CabinetPanel items={[{ value: "orders", label: "Заказы" }, { value: "returns", label: "Возвраты" }]}
          value={tab} onChange={setTab} ariaLabel="Демонстрация вкладок кабинета">
          {tab === "orders" ? <OrderDetailsPreview /> : <EmptyState icon="return-circle" title="Возвратов пока нет" />}
        </CabinetPanel>
        <p className={styles.note}>Сверху мини-карточки каждой позиции. Ниже оплата и доставка: заголовки слева, детали справа. На узком экране блоки выстраиваются в одну колонку. Пока только макет для согласования</p>
      </Section>

      <Section id="icons" title="Иконки" note="Выбрано: товар — куб, заказ — чек, передача в доставку — грузовик. Рабочие иконки пока не меняем">
        <IconOptionsPreview />
        <h3>Остальные иконки</h3>
        <div className={styles.iconGrid}>{iconExamples.map(([name, label]) => <div key={name}>
          <Icon name={name} role={name === "x" ? "utility" : "interface"} /><span>{label}</span>
        </div>)}</div>
        <p className={styles.note}>Интерфейсные иконки — 24 px, служебные — 20 px. Пустые списки оформляем текстом и действием, без декоративных иконок</p>
      </Section>

      <Section id="states" title="Состояния экрана" note="Пустой список, загрузка, ошибка и успех. Без настоящих заказов и запросов к серверу">
        <div className={styles.actions} role="group" aria-label="Состояние примера">
          {[["empty", "Пусто"], ["loading", "Загрузка"], ["error", "Ошибка"], ["success", "Успех"]].map(([value, label]) =>
            <Button key={value} type="button" variant={screenState === value ? "primary" : "secondary"}
              aria-pressed={screenState === value} onClick={() => setScreenState(value)}>{label}</Button>)}
        </div>
        <div className={styles.statePreview} data-state={screenState}>
          {screenState === "loading" ? <div role="status" aria-label="Загрузка товаров" aria-busy="true"><ul className={styles.skeletonGrid}>
            <ProductTileSkeleton /><ProductTileSkeleton />
          </ul></div> : screenState === "error" ? <EmptyState icon="alert" tone="danger" title="Не удалось загрузить товары"
            actions={<Button type="button" variant="secondary" onClick={() => setScreenState("empty")}>Повторить</Button>} />
            : screenState === "success" ? <EmptyState icon="check-circle" title="Товар отправлен на модерацию" text="Статус проверки доступен в разделе «Товары»" />
              : <EmptyState title="Товаров пока нет" text="Добавьте первый товар в свой магазин" actions={<Button variant="primary" onClick={() => setScreenState("success")}>Добавить товар</Button>} />}
        </div>
      </Section>

      <footer className={styles.nextStep}><h2>Первый экран перенесён</h2><p>Главная кабинета продавца использует согласованные стили и иконки. Сначала смотрим её, затем выбираем следующий экран</p><Link href="/seller/home">Посмотреть главную кабинета</Link></footer>
    </div>
  );
}
