"use client";
import { Checkbox } from "../components/ui/Checkbox";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../components/ui/Button";
import { ActionPrompt } from "../components/ui/ActionPrompt";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { EmptyState } from "../components/ui/EmptyState";
import { LikeButton } from "../components/ui/LikeButton";
import { FavoritesNavigationIcon } from "../components/BuyerNavigation/FavoritesNavigationIcon";
import { OneTimeCodeInput } from "../components/ui/OneTimeCodeInput";
import { TextEditor } from "../components/ui/TextEditor";
import { InfoHint } from "../components/ui/InfoHint";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { IconName } from "../components/ui/Icon";
import { DesignSystemIcon as Icon } from "./DesignSystemIcon";
import { CabinetPanel } from "../components/ui/CabinetPanel";
import { SectionLoader } from "../components/ui/SectionLoader";
import { OrderDetailsPreview } from "./OrderDetailsPreview";
import { IconOptionsPreview } from "./IconOptionsPreview";
import styles from "./DesignSystem.module.css";
import { ToastExamples } from "./ToastExamples";
import { Banner } from "../components/ui/Banner";
import { ProductArticleButton } from "../product/[id]/components/ProductArticleButton";
import productStyles from "../product/[id]/ProductPage.module.css";
import { DropdownExamples } from "./DropdownExamples";
import { ValidationExample } from "./ValidationExample";
import { ApiErrorsPreview } from "./ApiErrorsPreview";
import { HomeShoppingInformation } from "../home/sections/HomeDiscovery";
import { CheckoutDeliverySection } from "../checkout/components/CheckoutDeliverySection";
import { CheckoutContactSection } from "../checkout/components/CheckoutContactSection";
import { CheckoutFlow } from "../checkout/components/CheckoutFlow";
import { ProductSelectionOrder } from "../components/ui/ProductSelectionOrder";
import { StorefrontSectionCard } from "../components/ui/StorefrontSectionCard";
import { StorefrontNavigation } from "../home/sections/StorefrontNavigation";
import { AdminNavigationPreview } from "./AdminNavigationPreview";
import { AdminOperationAlertsPreview } from "./AdminOperationAlertsPreview";
import { SettingsSection } from "../components/ui/SettingsSection";
import { MetricGrid } from "../components/ui/MetricGrid";
import { TimeSeriesChart } from "../components/ui/TimeSeriesChart";
import { ComponentReference, FoundationRules, RevisionReference } from "./SystemReference";
import { DataTableExample } from "./DataTableExample";
import { ButtonExamples } from "./ButtonExamples";
import { FieldExamples } from "./FieldExamples";
import { ChoiceExamples } from "./ChoiceExamples";
import { NavigationExamples } from "./NavigationExamples";
import { ProductSearchExample } from "./ProductSearchExample";
import { StorefrontPatterns } from "./StorefrontPatterns";
import { SupportChatExample } from "./SupportChatExample";
import { CategoryStatesPattern, FormatPatterns, LoadMorePattern, OverlayPatterns, SelectionPatterns } from "./ComponentPatterns";

const sections = [
  ["foundation", "Основа"], ["components", "Компоненты"], ["auth", "Вход"], ["type", "Типографика"], ["buttons", "Кнопки"],
  ["fields", "Поля"], ["dropdowns", "Выпадающие списки"], ["selection", "Выбор"], ["formats", "Форматы"], ["status", "Статусы"], ["feedback", "Баннеры"],
  ["lists", "Списки"], ["analytics", "Показатели и график"], ["storefront", "Витрина"], ["icons", "Иконки"], ["overlays", "Окна и редакторы"], ["api-errors", "Ошибки"], ["states", "Состояния"], ["revision", "План ревизии"],
] as const;

const demoDeliveryCity = { code: 137, cityUuid: "demo", fullName: "Санкт-Петербург, Россия", countryCode: "RU" };
const demoPickupPoints = [
  { id: "demo-1", label: "Демонстрационный пункт выдачи · Санкт-Петербург", latitude: 59.9343, longitude: 30.3351, cityCode: 137 },
  { id: "demo-2", label: "Другой демонстрационный пункт · Санкт-Петербург", latitude: 59.932, longitude: 30.3501, cityCode: 137 },
  { id: "demo-no-coordinates", label: "Демонстрационный пункт без координат", latitude: null, longitude: null, cityCode: 137 },
];

function CheckoutExample() {
  const [pointId, setPointId] = useState(demoPickupPoints[0].id);
  const [cityQuery, setCityQuery] = useState(demoDeliveryCity.fullName);
  const [fullName, setFullName] = useState("Алексей Иванов");
  const [phone, setPhone] = useState("79000000000");
  const [submitted, setSubmitted] = useState(false);
  const point = demoPickupPoints.find(option => option.id === pointId);
  return <div className={styles.deliveryExample}>
    <CheckoutFlow autoFocusHeading={false} delivery={<CheckoutDeliverySection options={demoPickupPoints} selectedAddressId={pointId} enabled pickupLoading={false}
      quoteLoading={false} countryCode="RU" cityQuery={cityQuery} cityOptions={[demoDeliveryCity]} selectedCity={demoDeliveryCity}
      deliveryPrice={443} deliveryDateText="13 ноября или позже" deliveryCalculated onCountryChange={() => {}}
      onCityQueryChange={setCityQuery} onCitySuggestionsClose={() => {}} onCitySelect={() => setCityQuery(demoDeliveryCity.fullName)}
      onPickupSearch={() => {}} onAddressChange={setPointId} />}
      contact={<CheckoutContactSection fullName={fullName} phone={phone} onFullNameChange={setFullName} onPhoneChange={setPhone} />}
      pickupLabel={point?.label ?? ""} cityName={demoDeliveryCity.fullName} recipient={fullName} phone={phone}
      subtotal={5900} deliveryPrice={443} deliveryCalculated deliveryCalculating={false} submitting={false} error={null}
      onContinue={async () => true} onSubmit={() => setSubmitted(true)} />
    {submitted && <p className={styles.note} role="status">Это пример — заказ не оформлен</p>}
  </div>;
}

function ProductOrderExample() {
  const [ids, setIds] = useState([1, 2, 3]);
  return <ProductSelectionOrder ids={ids} products={[
    { id: 1, title: "Рубашка", minPrice: 5900 },
    { id: 2, title: "Брюки", minPrice: 7900 },
    { id: 3, title: "Сумка", minPrice: 3900 },
  ]} onChange={setIds} />;
}

function ActionPromptExample() {
  const [password, setPassword] = useState(true);
  return <div className={styles.buttonFamily}>
    <h3>Подсказка и текстовое действие</h3>
    <ActionPrompt hint={password ? "Без пароля?" : "Есть пароль?"}>
      <Button type="button" variant="ghost" onClick={() => setPassword(value => !value)}>
        {password ? "Войти по коду" : "Войти по паролю"}
      </Button>
    </ActionPrompt>
  </div>;
}

const paletteGroups = [
  { name: "Нейтральная основа", swatches: [
    ["Текст", "--black"], ["Графит кнопок", "--button-primary-bg"],
    ["Поверхность и наведение", "--soft"], ["Белый", "--white"],
  ] },
  { name: "Золото — акцент и предупреждения", swatches: [
    ["Светлое золото", "--gold-light"], ["Фирменное золото «рц»", "--gold"], ["Тёмное золото", "--gold-deep"],
  ] },
  { name: "Смысловые состояния", swatches: [["Успех", "--success"], ["Ошибка", "--error"]] },
] as const;

const typeRoles = [
  ["Заголовок страницы", "textPageTitle", "--font-3xl", "Мой первый бренд"],
  ["Заголовок раздела", "textSectionTitle", "--font-2xl", "Новый заказ"],
  ["Заголовок карточки", "textTitle", "--font-xl", "Шёлковая рубашка"],
  ["Основной текст", "textBody", "--font-md", "Подготовьте заказ и передайте его в доставку"],
  ["Вторичный текст", "textSmall muted", "--font-sm", "Это нужно, чтобы отправить товар на публикацию"],
  ["Подпись", "textCaption muted", "--font-xs", "Изменения не сохранятся"],
  ["Пояснение поля", "textHint", "--font-helper", "От 10 до 5000 символов"],
  ["Ошибка поля", "fieldError", "--field-error-size", "Укажите электронную почту"],
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
      <label className={styles.checkbox}><Checkbox size={18}  checked={fail}
        disabled={phase === "loading" || phase === "success"} onChange={event => setFail(event.target.checked)} />Сымитировать ошибку</label>
      <div className={styles.actions}>
          <Button type="button" variant="primary"
            loading={phase === "loading"} success={phase === "success"} disabled={phase === "success"}
            aria-label={phase === "loading" ? "Сохранение примера" : phase === "success" ? "Пример успешно сохранён" : label}
            onClick={save}>{label}</Button>
      </div>
      <p className={styles.demoResult} role="status">
        {phase === "success" ? "Пример сохранён" : phase === "error" ? "Не удалось сохранить. Попробуйте ещё раз" : phase === "loading" ? "" : "Данные никуда не отправляются"}
      </p>
    </div>
  );
}

export function DesignSystemClient() {
  const [descriptionExample, setDescriptionExample] = useState("Сдержанный силуэт\n\n### Особенности\n\n▪ Прямой крой\n▪ Накладные карманы");
  const [emailCode, setEmailCode] = useState("");
  const [tab, setTab] = useState("orders");
  const [screenState, setScreenState] = useState("empty");
  return (
    <div className={`pageContainer ${styles.page}`}>
      <header className={styles.pageHeader}>
        <p className={styles.kicker}>рцмаркет / рабочий эталон</p>
        <h1>Дизайн-система</h1>
        <p>Актуальные общие компоненты и утверждённые правила интерфейса</p>
        <p className={styles.note}>Унификация 7 ноября 2026 · Общие компоненты и токены используются на рабочих экранах и в этих примерах</p>
        <p className={styles.note}>Manrope утверждён30октября2026 · Модульная шкала с шагом1,3 · Чёрный текст, иерархия через размер и вес</p>
      </header>

      <nav className={styles.navigation} aria-label="Разделы дизайн-системы">
        {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <Section id="foundation" title="Основа" note="Утверждённая палитра: одна светло-серая поверхность, три роли золота, золотистые предупреждения">
        <div className={styles.paletteGroups}>
          {paletteGroups.map(group => <div key={group.name} className={styles.paletteGroup}>
            <h3>{group.name}</h3>
            <div className={styles.palette}>
              {group.swatches.map(([name, token]) => <div key={token} className={styles.swatch}>
                <div style={{ background: `var(${token})` }} aria-hidden="true" />
                <strong>{name}</strong><code>{token}</code>
              </div>)}
            </div>
          </div>)}
        </div>
        <p className={styles.note}>Цвет «рц» в логотипе — #B08D57, токен --gold</p>
        <div className={styles.lineWeights} aria-label="Толщина чёрных линий">
          {[
            ["Разделитель · 0,5 px", "--line-width-hairline"],
            ["Рамка · 1 px", "--line-width-default"],
            ["Активная граница · 2 px", "--line-width-strong"],
          ].map(([label, token]) => <div key={token}>
            <div className={styles.lineWeightSample}><span style={{ height: `var(${token})` }} aria-hidden="true" /></div>
            <strong>{label}</strong><code>{token}</code>
          </div>)}
        </div>
        <FoundationRules />
      </Section>

      <Section id="components" title="Карта общих компонентов" note="Сначала выбираем готовую роль и компонент, затем добавляем вариант, если у экрана есть обоснованное отличие">
        <ComponentReference />
      </Section>

      <Section id="auth" title="Вход — утверждено" note="Рабочая форма входа утверждена владельцем29октября2026">
        <div className={styles.authReference}>
          <p className="textTitle">Войти или зарегистрироваться</p>
          <p className={styles.note}>Заголовок формы использует общую роль Manrope27px/500 с интервалом−0,01em по шкале1,3. Поле и соединённые кнопки48px, прямые углы, графитовая основная кнопка и знак Яндекс ID — общие компоненты формы</p>
          <Link href="/auth/login" className="buttonSecondary">Открыть утверждённую форму</Link>
          <p className={styles.note}>Эталон — рабочий AuthForm по ссылке: изменения общего компонента сразу применяются на странице, в окне и в корзине</p>
        </div>
      </Section>

      <Section id="type" title="Типографика" note="Manrope · Модульная шкала1,3: 16 → 21 → 27 → 35 → 46 → 59 px · Подписи13–14px, пояснения12px">
        <div className={styles.typeList}>
          {typeRoles.map(([name, className, token, text]) => <div key={token} className={styles.typeRow}>
            <div className={styles.caption}><strong>{name}</strong><code>{token}</code></div>
            <p className={className}>{text}</p>
          </div>)}
        </div>
        <p className={styles.note}>Весь текст чёрный. Заголовок страницы и сильные акценты — Semibold600; заголовки разделов, карточек и названия полей — Medium500; обычный текст и пояснения — Regular400. Основной16/24, вторичный14/20, подписи13/18, пояснения12/18. У крупных заголовков интервал−0,02em, у небольших−0,01em</p>
      </Section>

      <Section id="buttons" title="Кнопки" note="Пять ролей, общие размеры 36/44/48 px, прямые углы и единые состояния. Наведите курсор или перейдите к кнопке клавишей Tab">
        <ButtonExamples />
        <ActionPromptExample />
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
        <FieldExamples />
        <ProductSearchExample />
        <h3>Выбор и дополнительные инструменты</h3>
        <div className={styles.formGrid}>
          <DropdownExamples />
          <div><p className="label">Подсказка по наведению и нажатию</p><InfoHint label="Требования к главному фото" text="Первое фото — главное. Покажите товар целиком на белом фоне." /></div>
          <div><p className="label">Редактор текста</p><TextEditor label="Описание для примера"
            value={descriptionExample} onChange={setDescriptionExample} maxLength={2000} /></div>
          <div><p>Код из письма</p><OneTimeCodeInput value={emailCode} onChange={setEmailCode} /></div>
        </div>
        <CategoryStatesPattern />
        <details className={styles.review}><summary>Действующие правила полей</summary>
          <p>Рамка 1 px чёрная, при ошибке красная по всему периметру. Названия полей500. Ошибка 13/20/500, пояснения 12/18/400. Подпись, пояснение и ошибка связаны с полем отдельно. Плейсхолдер оставляем только там, где он поясняет формат, а не повторяет название поля</p>
        </details>
      </Section>

      <Section id="selection" title="Выбор значения" note="Один режим — SegmentedControl, размер — SizeOptions, несколько значений — FormMultiSelect. Навигацию сохраняем ссылками и вкладками">
        <SelectionPatterns />
        <ChoiceExamples />
      </Section>

      <Section id="formats" title="Форматы и обозначения" note="Одинаковые числа, цены и состояния бренда собираем через общие компоненты">
        <FormatPatterns />
      </Section>

      <Section id="status" title="Статусы" note="Образцы статусов согласованы. Показаны компактный и обычный размеры">
        {(["compact", "regular"] as const).map(size => <div key={size} className={styles.statusRow}>
          <code>{size}</code><StatusBadge size={size}>Черновик</StatusBadge>
          <StatusBadge tone="success" size={size}>Активен</StatusBadge>
          <StatusBadge tone="warning" size={size}>На модерации</StatusBadge>
          <StatusBadge tone="danger" size={size}>Нужна доработка</StatusBadge>
        </div>)}
        <p className={styles.note}>StatusBadge уже используется в рабочих разделах. Цвет поясняет серверный статус и не создаёт новое бизнес-состояние; неизвестное значение не подменяем успешным</p>
      </Section>

      <Section id="feedback" title="Баннеры" note="Текст чёрный во всех сообщениях, состояние обозначают иконка, заливка и рамка; предупреждения — светлое золото">
        <Banner tone="success" role="status" className={styles.bannerExample}>
          <p>Мы отправили письмо на указанный адрес. Если его нет во входящих, проверьте папку «Спам».</p>
        </Banner>
        <p className={styles.note}>Эталон подтверждения без лишнего заголовка: 13/20/400, иконка20px, рамка1px, отступы14px по вертикали и16px по бокам</p>
        <div className={styles.compareGrid}>
          <div className={styles.stack}>
            <Banner tone="info" title="Перед заполнением">
          <ul><li>Сверяйте сведения с официальными документами</li><li>Укажите рабочие контакты и пункт отправки СДЭК</li></ul>
            </Banner>
            <Banner tone="warning" title="Проверьте фотографии">Для модерации нужны 3–10 фотографий. Если фото выглядит нечётко, рекомендуем загрузить более качественный исходник. Главное фото — на белом фоне.</Banner>
          </div>
          <div className={styles.stack}>
            <Banner tone="success" title="Данные сохранены">Обязательные сведения заполнены. Можно перейти к созданию товара.</Banner>
            <Banner tone="danger" title="Не удалось сохранить">Попробуйте ещё раз. Заполненные данные остались в форме.</Banner>
          </div>
        </div>
        <p className={styles.note}>Текст чёрный, заголовок выделен весом500. Цвет состояния используют иконка, заливка и рамка. Ошибки конкретных полей остаются под полями</p>
        <h3>Всплывающие уведомления</h3>
        <div className={styles.actions}><ToastExamples /></div>
        <p className={styles.note}>Заливка, тонкая рамка и иконка используют цвет состояния. Обычные уведомления исчезают через 4 секунды, действие и закрытие доступны с клавиатуры</p>
      </Section>

      <Section id="lists" title="Списки и навигация" note="Общие вкладки, секции данных и композиция заказа. Все данные в примерах условные">
        <SupportChatExample />
        <AdminNavigationPreview />
        <NavigationExamples />
        <h3 id="operation-alerts">Операции на проверке</h3>
        <p className={styles.note}>Рабочий блок админки с условными данными без запросов и действий</p>
        <AdminOperationAlertsPreview />
        <h3>Общая операционная таблица</h3>
        <DataTableExample />
        <SettingsSection title="Реквизиты продавца" description="Общая секция данных в кабинете и админке">
          <p className="textHint">Заголовок и отступы используют общие токены SettingsSection</p>
        </SettingsSection>
        <CabinetPanel items={[{ value: "orders", label: "Заказы" }, { value: "returns", label: "Возвраты" }]}
          value={tab} onChange={setTab} ariaLabel="Демонстрация вкладок кабинета">
          {tab === "orders" ? <OrderDetailsPreview /> : <EmptyState icon="return-circle" title="Возвратов пока нет" />}
        </CabinetPanel>
        <p className={styles.note}>Сверху позиции заказа, ниже оплата и доставка. На узком экране блоки выстраиваются в одну колонку. Поиск по загруженной части списка не выдаём за поиск по всем записям</p>
      </Section>

      <Section id="analytics" title="Показатели и график" note="Общие MetricGrid и TimeSeriesChart. Демонстрационные данные, без запросов к серверу">
        <MetricGrid ariaLabel="Демонстрационные показатели" items={[{label:"Заказы",value:"24",hint:"За выбранный период"},{label:"Оборот",value:"160 000 ₽"},{label:"Средний чек",value:"6 666,67 ₽"},{label:"Возвращено",value:"5 000 ₽"}]} />
        <TimeSeriesChart label="Демонстрационные заказы" points={[0,2,1,3,4,2,5].map((value,index)=>({date:`2026-10-${23+index}`,value}))} />
      </Section>

      <Section id="storefront" title="Витрина" note="Рабочий блок главной. Тексты доставки и оплаты общие с карточкой товара">
        <StorefrontPatterns />
        <h3>Навигация витрины</h3>
        <StorefrontNavigation categories={[{ title: "Одежда", href: "/catalog?category=catalog-clothing" },
          { title: "Аксессуары", href: "/catalog?category=catalog-accessories" }]} collections={[]} />
        <h3>Карточки разделов</h3>
        <p className={styles.note}>Общий компонент категории и подборки · Обложка 3:4 с выбранным кадром · Ниже показана демонстрационная текстура и состояние без обложки</p>
        <div className={styles.sectionCards}>
          <StorefrontSectionCard title="Категория" coverImageUrl="/8309ccdeec4a167dc09dc908fc1f1dbc.jpg"
            coverPositionX={35} coverPositionY={50} href="/catalog" sizes="(max-width: 640px) 40vw, 220px" />
          <StorefrontSectionCard title="Подборка без обложки" sizes="(max-width: 640px) 40vw, 220px" />
        </div>
        <HomeShoppingInformation />
        <ProductOrderExample />
        <h3 id="checkout-example">Оформление заказа</h3>
        <p className={styles.note}>Три этапа с демонстрационными данными, без создания заказа</p>
        <CheckoutExample />
      </Section>

      <Section id="icons" title="Иконки" note="Общий DesignSystemIcon задаёт размеры по назначению. Товар — куб, заказ — чек, передача в доставку — грузовик">
        <IconOptionsPreview />
        <h3>Избранное со счётчиком</h3>
        <div className={styles.iconGrid}>{[0, 1, 9, 10, 99, 100].map(count => <div key={count}>
          <FavoritesNavigationIcon count={count} /><span>{count === 0 ? "Пусто" : count === 1 ? "1 товар" : `${count} товаров`}</span>
        </div>)}</div>
        <p className={styles.note}>Один цифровой бейдж без дополнительной точки, ноль скрыт, больше99 показано как99+. Считаем опубликованные товары из списка избранного</p>
        <h3>Остальные иконки</h3>
        <div className={styles.iconGrid}>{iconExamples.map(([name, label]) => <div key={name}>
          <Icon name={name} role={name === "x" ? "utility" : "interface"} /><span>{label}</span>
        </div>)}</div>
        <p className={styles.note}>Интерфейсные иконки — 24 px, служебные — 20 px. Пустые списки оформляем текстом и действием, без декоративных иконок</p>
      </Section>

      <Section id="overlays" title="Окна и редакторы" note="Общая оболочка управляет фокусом, прокруткой и закрытием. Вложенные подтверждения не должны разблокировать фон">
        <OverlayPatterns />
        <Link href="/design-system/panels" className="buttonSecondary">Открыть панель и компактный редактор</Link>
      </Section>

      <Section id="api-errors" title="Ошибки, пустые состояния и диалоги" note="Общие рабочие компоненты по референсам Lime. Тот же вид используется в корзине, брендах и подключённых разделах">
        <ApiErrorsPreview />
      </Section>

      <Section id="states" title="Состояния экрана" note="Пустой список, загрузка, ошибка и успех. Без настоящих заказов и запросов к серверу">
        <p className={styles.note}>SectionLoader показывает спиннер с доступным названием. CabinetSkeleton и CartContentSkeleton сохраняют совместимые имена, но используют тот же индикатор; отдельный неиспользуемый SkeletonBlock не является новым стандартом загрузки</p>
        <SegmentedControl ariaLabel="Состояние примера" value={screenState} onChange={setScreenState}
          items={[{ value: "empty", label: "Пусто" }, { value: "loading", label: "Загрузка" },
            { value: "error", label: "Ошибка" }, { value: "success", label: "Успех" }]} />
        <div className={styles.statePreview} data-state={screenState}>
          {screenState === "loading" ? <SectionLoader label="Загрузка товаров" /> : screenState === "error" ? <EmptyState icon="alert" tone="danger" title="Не удалось загрузить товары"
            actions={<Button type="button" variant="secondary" onClick={() => setScreenState("empty")}>Повторить</Button>} />
            : screenState === "success" ? <EmptyState icon="check-circle" title="Товар отправлен на модерацию" text="Статус проверки доступен в разделе «Товары»" />
              : <EmptyState title="Товаров пока нет" text="Добавьте первый товар в свой магазин" actions={<Button variant="primary" onClick={() => setScreenState("success")}>Добавить товар</Button>} />}
        </div>
        <LoadMorePattern />
      </Section>

      <Section id="revision" title="Глобальная ревизия стилей" note="Общие источники стилей подключены по всему фронтенду. Следующий этап — адресное улучшение компонентов">
        <RevisionReference />
      </Section>
    </div>
  );
}
