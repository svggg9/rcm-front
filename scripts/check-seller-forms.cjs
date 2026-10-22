/* eslint-disable @typescript-eslint/no-require-imports -- Isolated form tests, no API writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const compile = filename => ts.transpileModule(fs.readFileSync(filename, "utf8"), { fileName: filename,
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
require.extensions[".css"] = mod => { mod.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }; };
for (const extension of [".ts", ".tsx"]) require.extensions[extension] = (mod, filename) => mod._compile(compile(filename), filename);
const { ReturnInspectionForm, parseInspectionAmount } = require("../app/seller/components/ReturnInspectionForm.tsx");
const { NumberField } = require("../app/seller/products/[id]/edit/components/NumberField.tsx");
const { ProductGeneralCard } = require("../app/seller/products/[id]/edit/components/ProductGeneralCard.tsx");
const { ProductVariantsCard } = require("../app/seller/products/[id]/edit/components/ProductVariantsCard.tsx");
const { ProductPhotoEditor } = require("../app/seller/products/[id]/edit/components/ProductPhotoEditor.tsx");
const { profileContactName } = require("../app/seller/lib/sellerLegalApi.ts");
const { notificationDraft, notificationEmailError } = require("../app/seller/lib/sellerNotificationApi.ts");
const sellerPageSource = fs.readFileSync(path.join(__dirname, "../app/seller/SellerPageClient.tsx"), "utf8");
const sellerPageStyles = fs.readFileSync(path.join(__dirname, "../app/seller/SellerPageClient.module.css"), "utf8");
const sellerLegalSource = fs.readFileSync(path.join(__dirname, "../app/seller/components/SellerLegalTab.tsx"), "utf8");
const sellerLegalStyles = fs.readFileSync(path.join(__dirname, "../app/seller/components/SellerLegalTab.module.css"), "utf8");
const notificationChannelSource = fs.readFileSync(path.join(__dirname, "../app/seller/components/SellerNotificationChannels.tsx"), "utf8");
const notificationChannelStyles = fs.readFileSync(path.join(__dirname, "../app/seller/components/SellerNotificationChannels.module.css"), "utf8");
const telegramConnectionSource = fs.readFileSync(path.join(__dirname, "../app/components/TelegramConnection.tsx"), "utf8");
assert.match(sellerPageSource, /hidden=\{currentTab !== "legal"\}[\s\S]*className=\{styles\.legalContent\}/);
assert.match(sellerPageStyles, /--seller-form-width:\s*1120px;/);
assert.doesNotMatch(sellerPageStyles, /\.legalContent\s*\{[^}]*(max-width|margin-inline)/);
assert.match(sellerLegalStyles, /\.form\s*\{[^}]*max-width:\s*var\(--seller-form-width, 1120px\)/);
assert.match(sellerLegalSource, /<Banner tone=\{checklistComplete \? "success" : "info"\}/);
assert.match(sellerLegalSource, /title=\{checklistComplete \? "Всё заполнено" : "Перед заполнением"\} titleAs="h2"/);
assert.match(sellerLegalSource, /aria-label="Выбрать пункт на карте" title="Выбрать пункт на карте"[\s\S]*?<Icon name="pickup-point"[^>]*\/>\s*<\/Button>/);
assert.match(sellerLegalStyles, /\.pointMapAction button\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;[^}]*padding:\s*0;/);
assert.doesNotMatch(sellerLegalStyles, /\.card\s*\{[^}]*\bborder\s*:/);
assert.doesNotMatch(sellerLegalStyles, /\.contactPhone\s*\{[^}]*\bborder\s*:/);
assert.doesNotMatch(notificationChannelStyles, /\.card\s*\{[^}]*\bborder\s*:/);
assert.doesNotMatch(notificationChannelSource, /createPortal|<Dialog\b|ConfirmActionButton|aria-haspopup="dialog"|<form\b/);
assert.doesNotMatch(notificationChannelSource, /<Button[^>]*(?:type="submit"|form=)[^>]*>[\s\S]*?Сохранить[\s\S]*?<\/Button>/);
assert.match(notificationChannelSource, /<h3 id=\{headingId\}>Уведомления<\/h3>/);
assert.match(notificationChannelSource, /role="group" aria-label="Каналы доставки уведомлений"/);
assert.match(notificationChannelSource, /<ChoiceMark[^>]*checked=\{controller\.draft\.emailEnabled\}[\s\S]*?<span>Email<\/span>[\s\S]*?<ChoiceMark[^>]*checked=\{controller\.draft\.telegramEnabled\}[\s\S]*?<span>Telegram<\/span>/);
assert.match(telegramConnectionSource, /Отвязать аккаунт\?[\s\S]*?>Да<\/Button>[\s\S]*?>Нет<\/Button>/);
assert.match(notificationChannelSource, /event\.key === "Enter"[\s\S]*?void save\(\)/);
const legalSubmitSource = sellerLegalSource.slice(sellerLegalSource.indexOf("async function submit"), sellerLegalSource.indexOf("async function createProductDraft"));
assert.doesNotMatch(legalSubmitSource, /notifications\.(savePreferences|validate)/);
assert.match(notificationChannelSource, /await controller\.savePreferences\(\)/);
for (const section of ["legal", "contacts", "shipping", "bank"]) {
  assert.ok(sellerLegalSource.includes(`hidden={activeSection !== "${section}"}`));
}
assert.match(sellerLegalSource, /disabled=\{!dirty \|\| savingSection !== null \|\| busy(?: \|\| saveDisabled)?\}/);
assert.match(legalSubmitSource, /selectSection\(invalidSection\)/);
assert.equal(profileContactName({ displayName: "  Анна Петрова  ", firstName: "Другое" }), "Анна Петрова");
assert.equal(profileContactName({ displayName: "", firstName: "Анна", lastName: "Петрова", middleName: "Игоревна" }), "Петрова Анна Игоревна");
assert.equal(profileContactName(null), "");
assert.deepEqual(notificationDraft({ email: "seller@example.ru", emailEnabled: true, telegramEnabled: true,
  telegramLinked: false, telegramUsername: null }), { email: "seller@example.ru", emailEnabled: true, telegramEnabled: true });
assert.equal(notificationEmailError({ email: "", emailEnabled: true, telegramEnabled: false }), "Укажите почту для уведомлений");
assert.equal(notificationEmailError({ email: "seller@example.ru", emailEnabled: true, telegramEnabled: false }), null);
const request = { id: 6, requestedAmount: 120, approvedRefundAmount: null, sellerComment: "Комментарий", resellable: false };
const props = { request, loading: false, disabled: false, onInspect: async () => {} };
const render = (component, values) => renderToStaticMarkup(React.createElement(component, values));
const html = render(ReturnInspectionForm, props);
assert.match(html, /Проверка возврата №6/);
assert.match(html, /role="combobox"/);
assert.match(html, /Нельзя вернуть в продажу/);
assert.match(html, /value="120"/);
assert.match(html, /maxLength="1000"/);
assert.doesNotMatch(html, /placeholder=/);
assert.match(render(ReturnInspectionForm, { ...props, loading: true }), /data-loading="true"/);
assert.match(render(ReturnInspectionForm, { ...props, disabled: true }), /disabled=""/);
for (const value of ["", " ", "bad", "-1", "Infinity"]) assert.equal(parseInspectionAmount(value), null);
assert.equal(parseInspectionAmount("0"), 0);
assert.equal(parseInspectionAmount("12,50"), 12.5);
assert.equal(parseInspectionAmount("12.50"), 12.5);
const numberError = render(NumberField, { label: "Вес, кг", value: "", invalid: true, onChange() {} });
assert.match(numberError, /Укажите значение больше нуля/);
assert.match(numberError, /aria-invalid="true"/);
assert.match(numberError, /aria-describedby="([^"]+)"[\s\S]*id="\1"/);
assert.doesNotMatch(render(NumberField, { label: "Вес, кг", value: 1, onChange() {} }), /fieldError|aria-invalid/);

const general = render(ProductGeneralCard, { validationErrors: { title: true, description: true, categoryId: true },
  title: "", description: "", composition: "", categoryId: "", suggestedCategoryName: "", audience: "UNISEX", categories: [] });
for (const message of ["Введите название товара", "Введите описание товара", "Выберите категорию или предложите свою"]) assert.ok(general.includes(message));
assert.match(general, /aria-describedby="[^"]+-title-error"/);
assert.match(general, /aria-describedby="[^"]+-description-error"/);
assert.match(general, /aria-describedby="[^"]+-category-error"/);
const categoryBase = { slug: null, sortOrder: 0, isActive: true, effectiveActive: true, productCount: 0, subtreeProductCount: 0 };
const categories = [
  { ...categoryBase, id: 1, name: "Одежда", label: "Одежда", parentId: null },
  { ...categoryBase, id: 2, name: "Одежда / Верх", label: "Верх", parentId: 1 },
  { ...categoryBase, id: 12, name: "Одежда / Верх / Футболки", label: "Футболки", parentId: 2 },
];
const categoryProps = { validationErrors: {}, title: "Товар", description: "Описание", composition: "",
  categoryId: 12, suggestedCategoryName: "", audience: "UNISEX", categories };
const selectedCategory = render(ProductGeneralCard, categoryProps);
assert.match(selectedCategory, /role="combobox"[^>]*aria-expanded="false"[^>]*value="Одежда \/ Верх \/ Футболки"/);
assert.doesNotMatch(selectedCategory, /Категория недоступна для новых публикаций/);
const unavailableCategories = categories.map(category => category.id === 12 ? { ...category, isActive: false, effectiveActive: false } : category);
const unavailableCategory = render(ProductGeneralCard, { ...categoryProps, categories: unavailableCategories });
assert.match(unavailableCategory, /value="Одежда \/ Верх \/ Футболки"/);
assert.match(unavailableCategory, /Категория недоступна для новых публикаций/);
assert.match(unavailableCategory, /role="option" aria-selected="true" disabled=""[^>]*>[\s\S]*?Одежда \/ Верх \/ Футболки/);

// A saved hidden category remains visible, but even a direct option handler cannot assign it again.
const { CategoryPicker } = require("../app/components/ui/CategoryPicker.tsx");
function categoryChoice(values) {
  const picked = CategoryPicker(values).props.children[0];
  assert.equal(picked.props.value, 12, "The picker retains the category ID, independently of its full display path");
  assert.equal(picked.props.options.find(option => option.value === 12).label, "Одежда / Верх / Футболки");
  const filename = path.resolve(__dirname, "../app/components/ui/FormCombobox.tsx");
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = mod.require.bind(mod);
  const react = { useEffect() {}, useId: () => "category-fixture", useMemo: fn => fn(),
    useRef: initial => ({ current: initial }), useState: initial => [initial, () => {}] };
  mod.require = id => id === "react" ? react : originalRequire(id);
  mod._compile(compile(filename), filename);
  const tree = mod.exports.FormCombobox(picked.props);
  const options = [];
  function visit(element) {
    if (Array.isArray(element)) return element.forEach(visit);
    if (!element || typeof element !== "object" || !element.props) return;
    if (element.props.role === "option") options.push(element);
    visit(element.props.children);
  }
  visit(tree);
  return options.find(option => option.key === "12");
}
const categoryChanges = [];
const activeChoice = categoryChoice({ value: 12, categories, onChange: (...value) => categoryChanges.push(value) });
activeChoice.props.onClick();
assert.deepEqual(categoryChanges, [[12, ""]], "An available category is assigned by its stable ID");
const hiddenChoice = categoryChoice({ value: 12, categories: unavailableCategories, onChange: (...value) => categoryChanges.push(value) });
assert.equal(hiddenChoice.props.disabled, true);
hiddenChoice.props.onClick();
assert.deepEqual(categoryChanges, [[12, ""]], "An unavailable saved option cannot be assigned, including through its event handler");
const { ProductDescriptionEditor } = require("../app/seller/products/[id]/edit/components/ProductDescriptionEditor.tsx");
const { ProductDetailsAccordion } = require("../app/product/[id]/components/ProductDetailsAccordion.tsx");
const compositionProps = { value: "▪ Хлопок — 95%\n▪ Эластан — 5%", onChange() {}, fieldName: "Состав", maxLength: 1000, emptyText: "Состав пока пустой" };
const compositionEditor = render(ProductDescriptionEditor, compositionProps);
assert.match(compositionEditor, /aria-label="Состав"/);
assert.match(compositionEditor, /aria-label="Список: Состав"/);
assert.match(compositionEditor, /class="buttonGhost/);
assert.match(compositionEditor, /<svg[^>]*aria-hidden="true"/);
assert.doesNotMatch(compositionEditor, /Добавить абзац|Удалить блок|Предпросмотр в карточке товара/);
assert.match(compositionEditor.replace(/<[^>]*>/g, ""), /\/ 1000/);
assert.match(compositionEditor, /▪ Хлопок — 95%/);
const longComposition = render(ProductDescriptionEditor, {...compositionProps, value: "я".repeat(1001)});
assert.match(longComposition, /Не больше 1000 символов/);
assert.match(longComposition, /aria-invalid="true"/);
assert.match(longComposition, /я{1001}/); // Existing content is never silently truncated.
const defaultDescription = render(ProductDescriptionEditor, { value: "я".repeat(1001), onChange() {} });
assert.doesNotMatch(defaultDescription, /aria-invalid="true"/);
assert.match(defaultDescription.replace(/<[^>]*>/g, ""), /\/ 2000/);
// Real selection/list toggling, focus, save and refresh are covered by check-product-form-redesign.cjs.
const details = render(ProductDetailsAccordion, {product: {id: 7, description: "Описание", composition: compositionProps.value},
  selectedVariant: null, openComposition: true, openBrand: false, onToggleComposition() {}, onToggleBrand() {}, isSellerView: false});
assert.match(details, /<li>Хлопок — 95%<\/li>/);
assert.match(details, /<li>Эластан — 5%<\/li>/);

const variantProps = { variants: [{ id: 1, sizeId: "", size: "M", colorId: "", color: "", price: 0, availableQuantity: -1, sku: "", stockTrackingEnabled: true }],
  images: [], validationErrors: { 0: { price: true, sizeId: true, availableQuantity: true } }, invalidImages: true,
  uploading: false, reordering: false, mediaDisabled: false, variantStructureDisabled: false, operationalDisabled: false,
  uploadProgress: { done: 0, total: 1 } };
const variants = render(ProductVariantsCard, variantProps);
for (const message of ["Укажите одну цену больше нуля", "Размер повторяется", "Введите целое количество от 0"]) assert.ok(variants.includes(message));
assert.match(variants, /Учитывать остатки/);
assert.match(variants, /aria-describedby="[^"]+-price-error"/);
assert.match(variants, /aria-label="На складе:/);
assert.match(variants, /Добавить размер/);
assert.doesNotMatch(variants, /Пусто — без учёта|Цена цвета/);
assert.match(render(ProductPhotoEditor, variantProps), /Для модерации нужно от 3 до 10 фото товара/);
const uploading = render(ProductPhotoEditor, { ...variantProps, uploading: true, mediaDisabled: true });
assert.match(uploading, /data-loading="true"/);
assert.match(uploading, /buttonLoader/);
assert.match(uploading, /class="label hidden" aria-hidden="true">Выбрать фото/);
assert.doesNotMatch(uploading, /Загрузка…/);
assert.match(uploading, /aria-label="Загружено фото: 0 из 1"/);

async function checkSubmit() {
  let cursor = 0;
  const slots = [];
  let scrolled = 0;
  const react = {
    // This harness checks submit behavior; browser draft effects are outside its scope.
    useEffect() {},
    useCallback: fn => fn,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
  };
  const filename = path.resolve(__dirname, "../app/seller/components/ReturnInspectionForm.tsx");
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = mod.require.bind(mod);
  const hookFile = path.resolve(__dirname, "../app/lib/useFieldValidation.ts");
  const hookModule = new Module(hookFile, module); hookModule.filename = hookFile;
  hookModule.require = id => id === "react" ? react : originalRequire(id);
  hookModule._compile(compile(hookFile), hookFile);
  mod.require = id => id === "../../lib/useFieldValidation" ? hookModule.exports : id === "react" ? react : id === "../../lib/formValidation" ? { scrollToFirstValidationError: () => { scrolled++; } } : originalRequire(id);
  mod._compile(compile(filename), filename);
  const form = values => { cursor = 0; return mod.exports.ReturnInspectionForm(values); };
  let finish;
  const submitted = [];
  const values = { ...props, request: { ...request, requestedAmount: null }, onInspect: data => { submitted.push(data); return new Promise(resolve => { finish = resolve; }); } };
  const event = { preventDefault() {} };
  await form(values).props.onSubmit(event);
  assert.equal(submitted.length, 0); assert.equal(scrolled, 1);
  assert.equal(form(values).props.children[1].props.error, "Укажите корректную сумму возврата");
  form(values).props.children[1].props.onChange({ target: { value: "12,50" } });
  assert.equal(form(values).props.children[1].props.error, undefined);
  const pending = form(values).props.onSubmit(event);
  await form(values).props.onSubmit(event);
  assert.equal(submitted.length, 1);
  assert.deepEqual(submitted[0], { resellable: false, acceptedRefundAmount: 12.5, comment: "Комментарий" });
  finish(); await pending;
  await form({ ...values, disabled: true }).props.onSubmit(event);
  await form({ ...values, loading: true }).props.onSubmit(event);
  assert.equal(submitted.length, 1);
}
checkSubmit().then(() => console.log("PASS: return validation/submit guard, seller contact prefill, description DS actions and content persistence, field errors and associations, upload spinner/stable label, dimension errors"))
  .catch(error => { console.error(error); process.exitCode = 1; });
