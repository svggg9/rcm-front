"use client";
import { Checkbox } from "../components/ui/Checkbox";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../components/ui/Button";
import { useTransientFailure } from "../components/ui/useTransientFailure";
import { ActionPrompt } from "../components/ui/ActionPrompt";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { SectionNavigation } from "../components/ui/SectionNavigation";
import { EmptyState } from "../components/ui/EmptyState";
import { LikeButton } from "../components/ui/LikeButton";
import { OneTimeCodeInput } from "../components/ui/OneTimeCodeInput";
import { TextEditor } from "../components/ui/TextEditor";
import { InfoHint } from "../components/ui/InfoHint";
import { StatusBadge } from "../components/ui/StatusBadge";
import { CabinetPanel } from "../components/ui/CabinetPanel";
import { SectionLoader } from "../components/ui/SectionLoader";
import { OrderDetailsPreview } from "./OrderDetailsPreview";
import { RecipientTypographyCandidates } from "./RecipientTypographyCandidates";
import { IconSystemGallery } from "./IconSystemGallery";
import { PurchaseSummaryExample } from "./PurchaseSummaryExample";
import { SellerStoreIdentity } from "../seller/components/SellerStoreIdentity";
import { AnimationCandidates } from "./AnimationCandidates";
import { CartAnimationCandidates } from "./CartAnimationCandidates";
import { CartRemovalCandidates } from "./CartRemovalCandidates";
import { NextMotionCandidates } from "./NextMotionCandidates";
import { CartFillCandidates } from "./CartFillCandidates";
import { SaveAnimationCandidates } from "./SaveAnimationCandidates";
import { SaveFailureCandidates } from "./SaveFailureCandidates";
import { PanelAnimationCandidates } from "./PanelAnimationCandidates";
import styles from "./DesignSystem.module.css";
import { ToastExamples } from "./ToastExamples";
import { AlertTypographyCandidates } from "./AlertTypographyCandidates";
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
import { InsideLabelExamples } from "./InsideLabelExamples";
import { ChoiceExamples } from "./ChoiceExamples";
import { NavigationExamples } from "./NavigationExamples";
import { ProductSearchExample } from "./ProductSearchExample";
import { StorefrontPatterns } from "./StorefrontPatterns";
import { SupportChatExample } from "./SupportChatExample";
import { DisclosureSectionExample } from "./DisclosureSectionExample";
import { ProjectCoverage } from "./ProjectCoverage";
import { useInitialHashNavigation } from "./useInitialHashNavigation";
import { ProductEditorExample } from "./ProductEditorExample";
import { SellerFinanceExample } from "./SellerFinanceExample";
import { AccountProfileExample } from "./AccountProfileExample";
import { AccountReturnExample } from "./AccountReturnExample";
import { AdminCoverage } from "./AdminCoverage";
import { SellerOrdersExample } from "./SellerOrdersExample";
import { SellerReturnsExample } from "./SellerReturnsExample";
import { SellerLegalExample } from "./SellerLegalExample";
import { BuyerCommerceExample } from "./BuyerCommerceExample";
import { CategoryStatesPattern, FormatPatterns, LoadMorePattern, OverlayPatterns, SelectionPatterns } from "./ComponentPatterns";

const navigationGroups = [
  { title: "Проект и основы", links: [
    ["project-coverage", "Проект по областям"], ["foundation", "Основа"], ["type", "Типографика"], ["components", "Карта компонентов"],
  ] },
  { title: "Компоненты", links: [
    ["buttons", "Кнопки"], ["fields", "Поля"], ["dropdowns", "Выпадающие списки"], ["selection", "Выбор"], ["formats", "Форматы"], ["status", "Статусы"], ["feedback", "Баннеры"], ["icons", "Иконки"], ["lists", "Списки и навигация"], ["analytics", "Показатели и график"], ["overlays", "Окна и редакторы"], ["api-errors", "Ошибки"], ["states", "Состояния"],
  ] },
  { title: "Рабочие примеры", links: [
    ["auth", "Вход"], ["storefront", "Витрина и оформление"], ["buyer-commerce", "Покупка и фильтры"], ["buyer-profile", "Профиль покупателя"], ["buyer-returns", "Возврат покупателя"], ["product-editor", "Редактор товара"], ["seller-orders", "Заказы продавца"], ["seller-returns", "Возвраты продавца"], ["seller-legal", "Реквизиты продавца"], ["seller-finance", "Финансы продавца"], ["admin-coverage", "Модерация и финансы админа"],
  ] },
  { title: "Варианты и развитие", links: [
    ["purchase-summary", "Сводка покупки"], ["animations", "Пул анимаций"], ["revision", "План ревизии"],
  ] },
] as const;

const demoDeliveryCity = { code: 137, cityUuid: "demo", fullName: "Санкт-Петербург, Россия", countryCode: "RU" };
const demoPickupPoints = [
  { id: "demo-1", label: "Демонстрационный пункт выдачи — Санкт-Петербург", latitude: 59.9343, longitude: 30.3351, cityCode: 137 },
  { id: "demo-2", label: "Другой демонстрационный пункт — Санкт-Петербург", latitude: 59.932, longitude: 30.3501, cityCode: 137 },
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
  { name: "Пять цветов основы", swatches: [
    ["Чёрный — текст", "--black", "#121213"],
    ["Графит — кнопки", "--button-primary-bg", "#2F2F2E"],
    ["Золото — акцент", "--gold", "#BFA26F"],
    ["Мягкий серый — линии и поверхности", "--palette-soft-grey", "#D3D3CF"],
    ["Светлый — фон", "--white", "#FAFAF9"],
  ] },
  { name: "Смысловые состояния", swatches: [
    ["Успех", "--success", ""], ["Ошибка", "--error", ""], ["Предупреждение — фон", "--feedback-warning-bg", ""],
  ] },
] as const;

const typeRoles = [
  ["H1 — крупный заголовок", "typeHeading1", "typeHeading1", "Бренд", "96 / 116 / 600", "48 / 58 / 600"],
  ["H2 — заголовок", "typeHeading2", "typeHeading2", "Новая коллекция", "60 / 60 / 600", "40 / 44 / 600"],
  ["H3 — заголовок страницы", "typeHeading3", "typeHeading3", "Мой первый бренд", "48 / 48 / 600", "36 / 40 / 600"],
  ["H4 — заголовок раздела", "typeHeading4", "typeHeading4", "Новый заказ", "36 / 40 / 600", "28 / 32 / 600"],
  ["H5 — заголовок карточки", "typeHeading5", "typeHeading5", "Шёлковая рубашка", "24 / 28 / 600", "24 / 28 / 600"],
  ["H6 — малый заголовок", "typeHeading6", "typeHeading6", "Данные заказа", "20 / 28 / 600", "20 / 28 / 600"],
  ["Подзаголовок 1", "typeSubtitle1", "typeSubtitle1", "Получатель", "16 / 24 / 600"],
  ["Подзаголовок 2", "typeSubtitle2", "typeSubtitle2", "Пункт выдачи", "14 / 20 / 600"],
  ["Основной текст", "typeBody1", "typeBody1", "Подготовьте заказ и передайте его в доставку", "16 / 24 / 400"],
  ["Вторичный текст", "typeBody2", "typeBody2", "Это нужно, чтобы отправить товар на публикацию", "14 / 20 / 400"],
  ["Текст кнопки 1", "typeButton1", "typeButton1", "Продолжить", "16 / 24 / 600"],
  ["Текст кнопки 2", "typeButton2", "typeButton2", "Изменить", "14 / 20 / 600"],
  ["Подпись с акцентом", "typeCaption1", "typeCaption1", "Размер", "12 / 16 / 600"],
  ["Подпись", "typeCaption2", "typeCaption2", "Изменения не сохранятся", "12 / 16 / 400"],
  ["Пояснение поля", "fieldHint", "--font-helper", "От 10 до 5000 символов", "12 / 16 / 400"],
  ["Ошибка поля", "fieldError", "--field-error-size", "Укажите электронную почту", "13 px / 20 px / 500"],
] as const;

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
  const { failure, show: showFailure, clear: clearFailure } = useTransientFailure();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function save() {
    if (timer.current) return;
    clearFailure();
    setPhase("loading");
    timer.current = setTimeout(() => {
      if (fail) {
        setPhase("error");
        showFailure();
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
        disabled={phase === "loading" || phase === "success" || failure} onChange={event => setFail(event.target.checked)} />Сымитировать ошибку</label>
      <div className={styles.actions}>
          <Button type="button" variant="primary"
            loading={phase === "loading"} success={phase === "success"} successMotion="bounce" failure={failure} disabled={phase === "success"}
            aria-label={phase === "loading" ? "Сохранение примера" : phase === "success" ? "Пример успешно сохранён" : failure ? "Ошибка сохранения примера" : label}
            onClick={save}>{label}</Button>
      </div>
      <p className={styles.demoResult} role="status">
        {phase === "success" ? "Пример сохранён" : phase === "error" ? "Не удалось сохранить. Попробуйте ещё раз" : phase === "loading" ? "" : "Данные никуда не отправляются"}
      </p>
    </div>
  );
}

export function DesignSystemClient() {
  useInitialHashNavigation();
  const [descriptionExample, setDescriptionExample] = useState("Сдержанный силуэт\n\n### Особенности\n\n▪ Прямой крой\n▪ Накладные карманы");
  const [emailCode, setEmailCode] = useState("");
  const [tab, setTab] = useState("orders");
  const [screenState, setScreenState] = useState("empty");
  const [activeSection, setActiveSection] = useState("");
  useEffect(() => {
    let frame = 0;
    const updateActiveSection = () => {
      frame = 0;
      let current = "";
      let closest = Number.NEGATIVE_INFINITY;
      for (const group of navigationGroups) for (const [id] of group.links) {
        const element = document.getElementById(id);
        if (!element) continue;
        const top = element.getBoundingClientRect().top;
        if (top <= 150 && top > closest) { current = id; closest = top; }
      }
      if (current) setActiveSection(current);
    };
    const scheduleUpdate = () => { if (!frame) frame = window.requestAnimationFrame(updateActiveSection); };
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div className={`pageContainer ${styles.page}`}>
      <header className={styles.pageHeader}>
        <p className={styles.kicker}>рцмаркет / рабочий эталон</p>
        <h1>Дизайн-система</h1>
        <p>Правила интерфейса, рабочие компоненты и примеры для всех областей рцмаркета</p>
        <p className={styles.note}>Рабочие примеры используют компоненты проекта. Варианты для обсуждения помечены отдельно</p>
      </header>

      <div className={styles.layout}>
        <SectionNavigation groups={navigationGroups} activeSection={activeSection} onNavigate={setActiveSection}
          ariaLabel="Разделы дизайн-системы" />
        <div className={styles.content}>
      <Section id="project-coverage" title="Проект по областям" note="Основные части проекта и их примеры в дизайн-системе">
        <ProjectCoverage />
      </Section>

      <Section id="foundation" title="Основа" note="Пять опорных цветов по референсу и отдельные цвета смысловых состояний">
        <div className={styles.paletteGroups}>
          {paletteGroups.map(group => <div key={group.name} className={styles.paletteGroup}>
            <h3>{group.name}</h3>
            <div className={styles.palette}>
              {group.swatches.map(([name, token, hex]) => <div key={token} className={styles.swatch}>
                <div style={{ background: `var(${token})` }} aria-hidden="true" />
                <strong>{name}</strong>{hex && <code>{hex}</code>}<code>{token}</code>
              </div>)}
            </div>
          </div>)}
        </div>
        <p className={styles.note}>Для наведения и подложек используются мягкие производные основных цветов. Ошибки и успешные действия сохраняют собственные смысловые цвета</p>
        <div className={styles.lineWeights} aria-label="Толщина чёрных линий">
          {[
            ["Разделитель — 0,5 px", "--line-width-hairline"],
            ["Рамка — 1 px", "--line-width-default"],
            ["Активная граница — 2 px", "--line-width-strong"],
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
          <p className={styles.note}>Заголовок формы использует Manrope 24 px / 28 px / 600 с интервалом −0,01em. Поле и соединённые кнопки 48 px, прямые углы, графитовая основная кнопка и знак Яндекс ID — общие компоненты формы</p>
          <Link href="/auth/login" className="buttonSecondary">Открыть утверждённую форму</Link>
          <p className={styles.note}>Эталон — рабочий AuthForm по ссылке: изменения общего компонента сразу применяются на странице, в окне и в корзине</p>
        </div>
      </Section>

      <Section id="type" title="Типографика" note="Шкала заголовков, подзаголовков, текста, кнопок и подписей по референсу">
        <div className={styles.typeList}>
          {typeRoles.map(([name, className, token, text, metrics, mobile]) => <div key={token} className={styles.typeRow}>
            <div className={styles.caption}><strong>{name}</strong><code>{token}</code><span className={styles.typeMetrics}>{mobile ? `От 641 px: ${metrics}; до 640 px: ${mobile}` : metrics}</span></div>
            <p className={className}>{text}</p>
          </div>)}
        </div>
        <p className={styles.note}>Порядок характеристик: размер шрифта / высота строки в px / насыщенность</p>
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

      <Section id="fields" title="Поля" note="Поля с внешней и внутренней подписью, компактные ошибки. Раскрытое поле и список образуют единый блок без внутренней линии">
        <InsideLabelExamples />
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
          <p>Рамка 1 px чёрная, при ошибке красная по всему периметру. Названия полей 500. Ошибка 13/20/500, пояснения 12/16/400. Подпись, пояснение и ошибка связаны с полем отдельно. Плейсхолдер оставляем только там, где он поясняет формат, а не повторяет название поля</p>
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
        <p className={`${styles.note} ${styles.bannerCaption}`}>Подтверждение без заголовка</p>
        <div className={`${styles.compareGrid} ${styles.bannerGrid}`}>
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
        <p className={styles.note}>Текст чёрный, заголовок выделен весом 600. Цвет состояния используют иконка, заливка и рамка. Ошибки конкретных полей остаются под полями</p>
        <h3 id="ds-toasts">Всплывающие уведомления</h3>
        <div className={styles.actions}><ToastExamples /></div>
        <p className={styles.note}>Пять состояний: нейтральное, информация, успех, предупреждение и ошибка. Обычные уведомления исчезают через 4 секунды, действие и закрытие доступны с клавиатуры</p>
        <AlertTypographyCandidates />
      </Section>

      <Section id="lists" title="Списки и навигация" note="Общие вкладки, секции данных и композиция заказа. Все данные в примерах условные">
        <h3>Раскрываемые разделы с обзором</h3>
        <p className={styles.note}>Несколько разделов можно открыть одновременно; заполненные данные сохраняются при закрытии</p>
        <DisclosureSectionExample />
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
        <RecipientTypographyCandidates />
      </Section>

      <Section id="analytics" title="Показатели и график" note="Общие MetricGrid и TimeSeriesChart. Демонстрационные данные, без запросов к серверу">
        <MetricGrid ariaLabel="Демонстрационные показатели" items={[{label:"Заказы",value:"24",hint:"За выбранный период"},{label:"Оборот",value:"160 000 ₽"},{label:"Средний чек",value:"6 666,67 ₽"},{label:"Возвращено",value:"5 000 ₽"}]} />
        <TimeSeriesChart label="Демонстрационные заказы" points={[0,2,1,3,4,2,5].map((value,index)=>({date:`2026-10-${23+index}`,value}))} />
      </Section>

      <Section id="storefront" title="Витрина" note="Рабочий блок главной. Тексты доставки и оплаты общие с карточкой товара">
        <h3 id="seller-store-example">Магазин продавца</h3>
        <SellerStoreIdentity name="Nike" href="/design-system#seller-store-example" />
        <p className={styles.note}>Общая строка магазина с настройкой справа</p>
        <StorefrontPatterns />
        <h3>Навигация витрины</h3>
        <StorefrontNavigation categories={[{ title: "Одежда", href: "/catalog?category=catalog-clothing" },
          { title: "Аксессуары", href: "/catalog?category=catalog-accessories" }]} collections={[]} />
        <h3>Карточки разделов</h3>
        <p className={styles.note}>Общий компонент категории и подборки. Обложка 3:4 с выбранным кадром. Ниже показана демонстрационная текстура и состояние без обложки</p>
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

      <Section id="buyer-commerce" title="Покупка и фильтры" note="Выбор товара и фильтры каталога на условных данных">
        <BuyerCommerceExample />
      </Section>

      <Section id="buyer-profile" title="Профиль покупателя" note="Рабочая форма профиля на условных данных">
        <AccountProfileExample />
      </Section>

      <Section id="buyer-returns" title="Возврат покупателя" note="Рабочая заявка с условными данными и локальной отправкой">
        <AccountReturnExample />
      </Section>

      <Section id="product-editor" title="Редактор товара" note="Рабочие разделы редактора на условных данных">
        <ProductEditorExample />
      </Section>

      <Section id="seller-orders" title="Заказы продавца" note="Рабочий список заказов на условных данных">
        <SellerOrdersExample />
      </Section>

      <Section id="seller-returns" title="Возвраты продавца" note="Рабочий список возвратов на условных данных">
        <SellerReturnsExample />
      </Section>

      <Section id="seller-legal" title="Реквизиты продавца" note="Поля, статусы и пункт приёма на условных данных">
        <SellerLegalExample />
      </Section>

      <Section id="seller-finance" title="Финансы продавца" note="Обзор, операции и выплаты на условных данных">
        <SellerFinanceExample />
      </Section>

      <Section id="admin-coverage" title="Модерация и финансы администратора" note="Рабочие блоки с условными данными и локальными действиями">
        <AdminCoverage />
      </Section>

      <Section id="purchase-summary" title="Сводка покупки" note="Варианты сводки на условных данных для сравнения">
        <PurchaseSummaryExample />
      </Section>

      <Section id="icons" title="Иконки" note="Рабочие иконки проекта: навигация, покупки, действия и состояния">
        <IconSystemGallery />
      </Section>

      <Section id="animations" title="Пул анимаций" note="Нажмите на примеры, чтобы сравнить движение — данные условные">
        <AnimationCandidates />
        <CartAnimationCandidates />
        <CartRemovalCandidates />
        <NextMotionCandidates />
        <CartFillCandidates />
        <SaveAnimationCandidates />
        <SaveFailureCandidates />
        <PanelAnimationCandidates />
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
      </div>
    </div>
  );
}
