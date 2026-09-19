/* eslint-disable @typescript-eslint/no-require-imports -- Isolated tests with mocked API, no database writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const Module = require("node:module");

require.extensions[".css"] = module => {
  module.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
  };
}
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === "next/navigation") return { useRouter: () => ({ push() {} }), useSearchParams: () => new URLSearchParams() };
  return originalLoad.call(this, name, ...args);
};
const { executeProductAction, productActionBlockedReason, formatSelectedProducts } = require("../app/seller/lib/sellerProductActions.ts");
const { SellerProductsTab } = require("../app/seller/components/SellerProductsTab.tsx");
const { nextProductSort, DEFAULT_PRODUCT_SORT, formatProductCreatedAt } = require("../app/seller/lib/sellerProductSort.ts");
assert.deepEqual(DEFAULT_PRODUCT_SORT, { key: "createdAt", direction: "desc" });
assert.deepEqual(nextProductSort(DEFAULT_PRODUCT_SORT, "createdAt"), { key: "createdAt", direction: "asc" });
assert.deepEqual(nextProductSort(null, "createdAt"), DEFAULT_PRODUCT_SORT);
assert.equal(formatProductCreatedAt("2026-09-09T23:00:00Z"), "10-Сен-26");
assert.equal(formatProductCreatedAt("2010-07-02T12:00:00Z"), "2-Июл-10");
assert.equal(formatProductCreatedAt(null), "—");
assert.equal(formatProductCreatedAt("invalid"), "—");
const { ProductListHeader } = require("../app/components/ProductListCard.tsx");
const { SortIndicator } = require("../app/components/ui/SortIndicator.tsx");
const sortIcon = direction => renderToStaticMarkup(React.createElement(SortIndicator, { direction }));
assert.equal((sortIcon(null).match(/<path/g) || []).length, 2);
assert.equal((sortIcon("asc").match(/<path/g) || []).length, 1);
assert.equal((sortIcon("desc").match(/<path/g) || []).length, 1);
assert.notEqual(sortIcon("asc"), sortIcon("desc"));
const { FormSelect } = require("../app/components/ui/FormSelect.tsx");
for (const placeholder of ["Статус товара", "Категория"]) {
  const markup = renderToStaticMarkup(React.createElement(FormSelect, {
    placeholder, emptyOptionLabel: "Все товары", value: "", options: [{value: "ACTIVE", label: "Активные"}], onChange() {},
  }));
  assert.ok(markup.includes(placeholder));
  const optionLabels = [...markup.matchAll(/role="option"[^>]*>[\s\S]*?<span[^>]*>(.*?)<\/span>/g)].map(match => match[1]);
  assert.deepEqual(optionLabels, ["Все товары", "Активные"]);
}
assert.deepEqual(nextProductSort(null, "minPrice"), { key: "minPrice", direction: "asc" });
assert.deepEqual(nextProductSort({ key: "minPrice", direction: "asc" }, "minPrice"), { key: "minPrice", direction: "desc" });
assert.deepEqual(nextProductSort({ key: "minPrice", direction: "desc" }, "minPrice"), { key: "minPrice", direction: "asc" });
assert.deepEqual(nextProductSort({ key: "minPrice", direction: "asc" }, "totalStock"), { key: "totalStock", direction: "asc" });
const headerHtml = renderToStaticMarkup(React.createElement(ProductListHeader, { sort: { key: "minPrice", direction: "asc" }, onSort() {} }));
assert.equal((headerHtml.match(/<button/g) || []).length, 5);
assert.match(headerHtml, /Добавлен/);
assert.ok(headerHtml.indexOf('Статус:') < headerHtml.indexOf('Добавлен:'));
assert.doesNotMatch(headerHtml, /Варианты/);
assert.match(headerHtml, /Цена: по возрастанию. Сортировать по убыванию/);
const { ProductSelectionBar, ProductActionDialog } = require("../app/seller/components/SellerProductActions.tsx");
const activeBar = renderToStaticMarkup(React.createElement(ProductSelectionBar, {
  products: [{id: 1, status: "ACTIVE"}], busy: false, allSelected: false,
  onAction() {}, onSelectAll() {}, onClear() {}, onAddToCollection() {},
}));
assert.match(activeBar, /Добавить в подборку/);
assert.doesNotMatch(activeBar, /На модерацию/);
assert.match(activeBar, /class="buttonPrimary"(?! disabled)/);
const product = (id, status = "DRAFT") => ({ id, title: `Карточка ${id}`, status, brandName: null, categoryName: null, coverImage: null, minPrice: 1000, totalStock: 5, variantsCount: 1 });
const html = renderToStaticMarkup(React.createElement(SellerProductsTab, { products: [product(1), product(2, "ACTIVE")], loading: false }));
assert.equal((html.match(/type="checkbox"/g) || []).length, 3);
assert.match(html, /Подборки/);
assert.match(html, /aria-label="Выбрать все показанные товары \(2\)"/);
assert.doesNotMatch(html, />Выбрать все показанные \(2\)</);
assert.match(html, /Действия с товаром «Карточка 1»/);
assert.match(html, /Сначала перенесите товар в архив/);
assert.doesNotMatch(html, /Действия с выбранными товарами/);
assert.doesNotMatch(html, /<span[^>]*>ID /);
const bar = renderToStaticMarkup(React.createElement(ProductSelectionBar, {
  products: [product(1, "ARCHIVED")], busy: false, allSelected: true,
  onAction() {}, onSelectAll() {}, onClear() {},
}));
assert.match(bar, /Выбран 1 товар/);
assert.match(bar, /Вернуть в черновики/);
assert.match(bar, /aria-label="Снять выделение"/);
const dialog = renderToStaticMarkup(React.createElement(ProductActionDialog, {
  action: "delete", products: [product(1), product(2, "ACTIVE")], busy: false, completed: 0,
  onConfirm() {}, onClose() {},
}));
assert.match(dialog, /Будет обработано 1 из 2/);
assert.match(dialog, /Не будут обработаны/);
assert.match(dialog, /Сначала перенесите товар в архив/);
for (const [count, text] of [[1, "Выбран 1 товар"], [2, "Выбрано 2 товара"], [11, "Выбрано 11 товаров"], [21, "Выбран 21 товар"], [112, "Выбрано 112 товаров"]]) {
  assert.equal(formatSelectedProducts(count), text);
}
for (const action of ["archive", "delete", "publish", "draft"]) {
  for (const status of ["BLOCKED", "DELETED", undefined]) assert.ok(productActionBlockedReason(action, status));
}
assert.equal(productActionBlockedReason("publish", "NEEDS_REVISION"), null);
assert.equal(productActionBlockedReason("delete", "ACTIVE"), "Сначала перенесите товар в архив");
assert.ok(productActionBlockedReason("delete", "MODERATION"));
assert.ok(productActionBlockedReason("publish", "ARCHIVED"));
assert.equal(productActionBlockedReason("draft", "ARCHIVED"), null);

(async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return url.includes("/2/") ? new Response(JSON.stringify({ detail: "Добавьте фото." }), { status: 400 }) : new Response(null, { status: 204 });
  };
  const progress = [];
  const result = await executeProductAction("publish", [product(1), product(1), product(2), product(3, "ACTIVE")], count => progress.push(count));
  assert.equal(calls.length, 2, "Deduplicate selection and never POST ineligible products");
  assert.deepEqual(result.changes, [{ id: 1, status: "MODERATION" }]);
  assert.equal(result.failures.length, 2);
  assert.equal(result.failures[0].reason, "Добавьте фото");
  assert.deepEqual(progress, [1, 2, 3]);
  assert.equal(calls[0].options.credentials, "include");
  assert.equal(calls[0].options.method, "POST");
  assert.match(calls[0].url, /\/api\/seller\/products\/1\/publish$/);
  const { productFeedback, productFailureDestination } = require("../app/seller/lib/sellerProductFeedback.ts");
  assert.match(productFeedback("publish", result).title, /Не удалось: 2/);
  assert.equal(productFeedback("archive", { changes: [{ id: 1 }], failures: [] }).title, "Товар перенесён в архив");
  assert.equal(productFailureDestination({ product: product(1), reason: "Заполните юридические данные продавца" }).href, "/seller?tab=legal");
  assert.equal(productFailureDestination(result.failures[0]).href, "/seller/products/2/edit");
  global.fetch = async () => new Response(JSON.stringify({ message: "Description is required for publish" }), { status: 400 });
  const invalidDescription = await executeProductAction("publish", [product(1)]);
  assert.equal(invalidDescription.failures[0].reason, "Добавьте описание товара");
  let networkCalls = 0;
  global.fetch = async () => { networkCalls++; throw new Error("connection lost"); };
  const disconnected = await executeProductAction("archive", [product(1), product(2)]);
  assert.equal(networkCalls, 1, "Stop the batch on network uncertainty without retrying POSTs");
  assert.equal(disconnected.changes.length, 0);
  assert.equal(disconnected.failures.length, 2);
  global.fetch = async () => new Response("<html>stack trace</html>", { status: 500 });
  const serverError = await executeProductAction("delete", [product(1)]);
  assert.doesNotMatch(serverError.failures[0].reason, /html|stack/);
  let unauthorizedCalls = 0;
  global.fetch = async () => { unauthorizedCalls++; return new Response(null, { status: 401 }); };
  const unauthorized = await executeProductAction("archive", [product(1), product(2)]);
  assert.equal(unauthorizedCalls, 1);
  assert.equal(unauthorized.failures.length, 2);
  console.log("Seller product actions: selection markup, contextual actions, confirmations, eligibility, partial failures, deduplication and network/auth guards passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
