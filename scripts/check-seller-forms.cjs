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
const variantProps = { variants: [{ id: 1, sizeId: "", size: "M", colorId: "", color: "", price: 0, availableQuantity: -1, sku: "", stockTrackingEnabled: true }],
  images: [], validationErrors: { 0: { price: true, sizeId: true, availableQuantity: true } }, invalidImages: true,
  uploading: false, reordering: false, mediaDisabled: false, variantStructureDisabled: false, operationalDisabled: false,
  uploadProgress: { done: 0, total: 1 } };
const variants = render(ProductVariantsCard, variantProps);
for (const message of ["Укажите цену больше нуля", "Размер повторяется", "Количество не может быть отрицательным"]) assert.ok(variants.includes(message));
assert.match(variants, /<label class="label" for="[^"]+-0-quantity">Количество/);
assert.match(variants, /aria-describedby="[^"]+-0-price-error"/);
assert.match(variants, /buttonGhost addSizeAction/);
assert.doesNotMatch(variants, /Файлы фотографий товара|Выбрать фото/);
assert.match(render(ProductPhotoEditor, variantProps), /Добавьте хотя бы одно фото товара/);
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
  mod.require = id => id === "react" ? react : id === "../../lib/formValidation" ? { scrollToFirstValidationError: () => { scrolled++; } } : originalRequire(id);
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
  assert.equal(form(values).props.children[1].props.error, null);
  const pending = form(values).props.onSubmit(event);
  await form(values).props.onSubmit(event);
  assert.equal(submitted.length, 1);
  assert.deepEqual(submitted[0], { resellable: false, acceptedRefundAmount: 12.5, comment: "Комментарий" });
  finish(); await pending;
  await form({ ...values, disabled: true }).props.onSubmit(event);
  await form({ ...values, loading: true }).props.onSubmit(event);
  assert.equal(submitted.length, 1);
}
checkSubmit().then(() => console.log("PASS: return validation/submit guard, editor field errors and associations, upload spinner/stable label, dimension errors"))
  .catch(error => { console.error(error); process.exitCode = 1; });
