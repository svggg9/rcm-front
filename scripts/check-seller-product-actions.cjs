/* eslint-disable @typescript-eslint/no-require-imports -- Isolated tests with mocked API, no database writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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
let productsQuery = "";
Module._load = function(name, ...args) {
  if (name === "next/navigation") return { useRouter: () => ({ push() {} }), useSearchParams: () => new URLSearchParams(productsQuery) };
  if (name.startsWith("@/")) return originalLoad.call(this, path.resolve(__dirname, "..", name.slice(2)), ...args);
  return originalLoad.call(this, name, ...args);
};
const { executeProductAction, getProductActionSelection, productActionBlockedReason, productActionResponseError, formatSelectedProducts } = require("../app/seller/lib/sellerProductActions.ts");
const { groupProductFailures, productFeedback, productFailureDestination } = require("../app/seller/lib/sellerProductFeedback.ts");
const { ProductFailureGroups } = require("../app/seller/components/ProductFailureGroups.tsx");
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
const { ProductSelectionBar, ProductActionDialog, ProductActionsMenu } = require("../app/seller/components/SellerProductActions.tsx");
const blockedMenu = renderToStaticMarkup(React.createElement(ProductActionsMenu, {
  label: "Действия с заблокированным товаром", items: ["archive", "delete"].map(action => ({ action, reason: productActionBlockedReason(action, "BLOCKED") })), onAction() {},
}));
assert.equal((blockedMenu.match(/href="\/contacts"/g) || []).length, 1, "A blocked row has an accessible support link even when no operation is permitted");
const activeBar = renderToStaticMarkup(React.createElement(ProductSelectionBar, {
  products: [{id: 1, status: "ACTIVE"}], busy: false, allSelected: false,
  onAction() {}, onSelectAll() {}, onClear() {}, onAddToCollection() {},
}));
assert.match(activeBar, /В подборку/);
assert.doesNotMatch(activeBar, /На модерацию/);
const draftBar = renderToStaticMarkup(React.createElement(ProductSelectionBar, {
  products: [{ id: 2, status: "DRAFT" }], busy: false, allSelected: false,
  onAction() {}, onSelectAll() {}, onClear() {}, onAddToCollection() {},
}));
assert.match(draftBar, /На модерацию/);
assert.match(draftBar, /В подборку — только активные товары/);

assert.match(activeBar, /class="buttonSecondary"(?! disabled)/);
const product = (id, status = "DRAFT") => ({ id, title: `Карточка ${id}`, status, brandName: null, categoryName: null, coverImage: null, minPrice: 1000, totalStock: 5, variantsCount: 1 });
const mixedProducts = [product(1), product(2, "ACTIVE")];
const publishedHtml = renderToStaticMarkup(React.createElement(SellerProductsTab, { products: mixedProducts, loading: false }));
assert.match(publishedHtml, /<button(?=[^>]*role="radio")(?=[^>]*aria-checked="true")[^>]*>Опубликованы<\/button>/, "Published products are selected on the plain products URL");
assert.match(publishedHtml, /href="\/seller\/products\/2\/edit\?[^"]*returnTo=/);
assert.doesNotMatch(publishedHtml, /href="\/seller\/products\/1\/edit\?/, "Drafts are excluded from the default published list");
assert.doesNotMatch(publishedHtml, />Сбросить<\/button>/, "The default published state does not suggest resetting filters");
productsQuery = "status=DRAFT";
const draftHtml = renderToStaticMarkup(React.createElement(SellerProductsTab, { products: mixedProducts, loading: false }));
assert.match(draftHtml, /<button(?=[^>]*role="radio")(?=[^>]*aria-checked="true")[^>]*>Черновики<\/button>/, "A direct draft URL keeps its requested selection");
assert.match(draftHtml, /href="\/seller\/products\/1\/edit\?[^"]*returnTo=/);
assert.doesNotMatch(draftHtml, /href="\/seller\/products\/2\/edit\?/);
productsQuery = "status=all";
const html = renderToStaticMarkup(React.createElement(SellerProductsTab, { products: [product(1), product(2, "ACTIVE")], loading: false }));
assert.match(html, /<button(?=[^>]*role="radio")(?=[^>]*aria-checked="true")[^>]*>Все<\/button>/, "The explicit all URL preserves all product statuses");
assert.match(html, /href="\/seller\/products\/2\/edit\?[^"]*returnTo=/);
assert.equal((html.match(/type="checkbox"/g) || []).length, 3);
assert.doesNotMatch(html, /Подборки товаров/, "Подразделы выводит SellerSidebar");
assert.match(html, /aria-label="Выбрать все показанные товары \(2\)"/);
assert.doesNotMatch(html, />Выбрать все показанные \(2\)</);
assert.match(html, /Действия с товаром «Карточка 1»/);
assert.doesNotMatch(html, /Сначала перенесите товар в архив/);
assert.doesNotMatch(html, /Действия с выбранными товарами/);
assert.doesNotMatch(html, /<span[^>]*>ID /);
assert.match(html, /href="\/seller\/products\/1\/edit\?[^"]*returnTo=/, "Rows use real links, including a safe return destination");
const longListHtml = renderToStaticMarkup(React.createElement(SellerProductsTab, {
  products: Array.from({ length: 60 }, (_, index) => product(index + 1)), loading: false,
}));
assert.equal((longListHtml.match(/type="checkbox"/g) || []).length, 51, "Select all refers only to the 50 visible rows");
assert.match(longListHtml, /Выбрать все показанные товары \(50\)/);
productsQuery = "";

const bar = renderToStaticMarkup(React.createElement(ProductSelectionBar, {
  products: [product(1, "ARCHIVED")], busy: false, allSelected: true,
  onAction() {}, onSelectAll() {}, onClear() {},
}));
assert.match(bar, /Выбран 1 товар/);
assert.match(bar, /Вернуть в черновики/);
assert.match(bar, /aria-label="Снять выделение"/);
const deletableStatuses = ["DRAFT", "NEEDS_REVISION", "ARCHIVED", "ACTIVE", "MODERATION"];
const mixedDeleteProducts = [...deletableStatuses.map((status, index) => product(index + 1, status)), product(6, "BLOCKED")];
const dialog = renderToStaticMarkup(React.createElement(ProductActionDialog, {
  action: "delete", products: mixedDeleteProducts, busy: false, completed: 0,
  onConfirm() {}, onClose() {},
}));
assert.equal((dialog.match(/<dialog/g) || []).length, 1);
assert.match(dialog, /Будет обработано 5 из 6/);
assert.match(dialog, /Удалить \(5\)/);
assert.match(dialog, /Не будут обработаны/);
assert.match(dialog, /исчезнут с витрины и из вашего списка/);
assert.match(dialog, /Заказы и история сохранятся/);
assert.match(dialog, /Самостоятельное восстановление недоступно/);
assert.match(dialog, /href="\/contacts"[^>]*>Поддержка/);
assert.doesNotMatch(dialog, /Сначала перенесите товар в архив/);
const busyDialog = renderToStaticMarkup(React.createElement(ProductActionDialog, {
  action: "delete", products: mixedDeleteProducts, busy: true, completed: 2, onConfirm() {}, onClose() {},
}));
assert.match(busyDialog, /Обработано 2 из 5/);
assert.match(busyDialog, /<a(?=[^>]*href="\/contacts")(?=[^>]*aria-disabled="true")[^>]*>/);
for (const [count, text] of [[1, "Выбран 1 товар"], [2, "Выбрано 2 товара"], [11, "Выбрано 11 товаров"], [21, "Выбран 21 товар"], [112, "Выбрано 112 товаров"]]) {
  assert.equal(formatSelectedProducts(count), text);
}
for (const action of ["archive", "delete", "publish", "draft"]) {
  for (const status of ["BLOCKED", "DELETED", undefined, "UNRECOGNIZED"]) assert.ok(productActionBlockedReason(action, status));
}
assert.equal(productActionBlockedReason("publish", "NEEDS_REVISION"), null);
for (const status of deletableStatuses) assert.equal(productActionBlockedReason("delete", status), null);
assert.ok(productActionBlockedReason("publish", "ARCHIVED"));
assert.equal(productActionBlockedReason("draft", "ARCHIVED"), null);

const groupedFailures = [7, 8, 9].map(id => ({ product: product(id, "BLOCKED"), reason: productActionBlockedReason("delete", "BLOCKED") }));
assert.deepEqual(groupProductFailures(groupedFailures).map(group => group.failures.length), [3]);
const groupedMarkup = renderToStaticMarkup(React.createElement(ProductFailureGroups, { failures: groupedFailures }));
assert.equal((groupedMarkup.match(/Товар заблокирован — обратитесь в поддержку/g) || []).length, 1);
assert.equal((groupedMarkup.match(/href="\/contacts"/g) || []).length, 1);
for (const id of [7, 8, 9]) assert.match(groupedMarkup, new RegExp(`Карточка ${id}`));
const groupedApiFailures = [7, 8].map(id => ({ product: product(id), reason: "Добавьте фото" }));
const apiFailureMarkup = renderToStaticMarkup(React.createElement(ProductFailureGroups, { failures: groupedApiFailures }));
assert.equal((apiFailureMarkup.match(/Добавьте фото/g) || []).length, 1);
for (const id of [7, 8]) assert.match(apiFailureMarkup, new RegExp(`href="/seller/products/${id}/edit"`));

const tabSource = fs.readFileSync(path.resolve(__dirname, "../app/seller/components/SellerProductsTab.tsx"), "utf8");
const tabAst = ts.createSourceFile("SellerProductsTab.tsx", tabSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = [];
function collectHandlers(node) {
  if (ts.isFunctionDeclaration(node) && ["requestAction", "confirmAction"].includes(node.name?.text)) handlers.push(node.getText(tabAst));
  ts.forEachChild(node, collectHandlers);
}
collectHandlers(tabAst);
assert.equal(handlers.length, 2);
const handlerCode = ts.transpileModule(handlers.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
function actionFlow(products) {
  const notifications = []; const progress = []; const routes = []; const changed = [];
  let items = products; let selected = new Set(products.map(item => item.id)); let busy = false; let report = null;
  const pending = { current: false };
  const context = {
    selectedProducts: products, loadingMore: false, sorting: false, controlsDisabled: false, pending,
    getProductActionSelection, executeProductAction, productFeedback, productFailureDestination,
    setCompleted: count => progress.push(count), setBusy: value => { busy = value; },
    setItems: update => { items = update(items); }, setSelected: update => { selected = update(selected); },
    onProductsChanged: value => changed.push(...value), setActionReport: value => { report = value; },
    router: { push: href => routes.push(href), refresh: () => routes.push("refresh") },
    toast: Object.fromEntries(["success", "warning", "error", "dismiss"].map(type => [type, (message, options) => notifications.push({ type, message, options })])),
  };
  const result = new Function(...Object.keys(context), `let confirmation = null;\nconst setConfirmation = value => { confirmation = value; };\n${handlerCode}\nreturn { requestAction, confirmAction, confirmation: () => confirmation };`)(...Object.values(context));
  return { ...result, notifications, progress, routes, changed, pending, items: () => items, selected: () => [...selected], busy: () => busy, report: () => report };
}

(async () => {
  const directDeleteCalls = [];
  global.fetch = async (url, options) => {
    directDeleteCalls.push({ url, options });
    return new Response(null, { status: 204 });
  };
  const directDelete = actionFlow(mixedDeleteProducts);
  directDelete.requestAction("delete");
  assert.equal(directDelete.confirmation().products.length, 6);
  assert.deepEqual(directDelete.confirmation().targets.map(item => item.id), [1, 2, 3, 4, 5]);
  await Promise.all([directDelete.confirmAction(), directDelete.confirmAction()]);
  assert.equal(directDeleteCalls.length, 5, "One confirmation deletes ACTIVE/MODERATION directly and duplicate submits do not repeat POSTs");
  assert.ok(directDeleteCalls.every(call => call.url.endsWith("/delete") && call.options.method === "POST"));
  assert.ok(directDeleteCalls.every(call => call.options.signal instanceof AbortSignal));
  assert.deepEqual(directDeleteCalls.map(call => Number(call.url.match(/products\/(\d+)/)[1])), [1, 2, 3, 4, 5]);
  assert.deepEqual(directDelete.items().map(item => item.id), [6]);
  assert.deepEqual(directDelete.selected(), [6], "Known excluded products stay selected");
  assert.deepEqual(directDelete.progress, [0, 1, 2, 3, 4, 5]);
  assert.equal(directDelete.notifications.length, 1);
  assert.equal(directDelete.notifications[0].type, "success", "Known restrictions shown before confirmation are not operation failures");
  assert.equal(directDelete.notifications[0].options.id, "seller-product-action-result");
  assert.equal(directDelete.confirmation(), null);
  assert.equal(directDelete.busy(), false);
  assert.equal(directDelete.pending.current, false);
  const forbiddenCalls = [];
  global.fetch = async url => { forbiddenCalls.push(url); return new Response(null, { status: 204 }); };
  const forbidden = await executeProductAction("delete", [product(6, "BLOCKED"), product(7, "DELETED"), product(8, "UNRECOGNIZED")]);
  assert.equal(forbiddenCalls.length, 0);
  assert.equal(forbidden.failures.length, 3);
  const noTargets = actionFlow([product(6, "BLOCKED")]);
  noTargets.requestAction("delete");
  await noTargets.confirmAction();
  assert.equal(forbiddenCalls.length, 0);
  assert.deepEqual(noTargets.notifications, []);

  const partialCalls = [];
  global.fetch = async url => {
    partialCalls.push(url);
    return url.includes("/2/") ? new Response(JSON.stringify({ detail: "Статус товара изменился — обновите список" }), { status: 409 }) : new Response(null, { status: 204 });
  };
  const partial = actionFlow([product(1, "ACTIVE"), product(2, "MODERATION"), product(3, "BLOCKED")]);
  partial.requestAction("delete"); await partial.confirmAction();
  assert.equal(partialCalls.length, 2, "Never POST a product excluded before confirmation");
  assert.deepEqual(partial.selected(), [2, 3]);
  assert.deepEqual(partial.items().map(item => item.id), [2, 3]);
  assert.equal(partial.notifications[0].type, "warning");
  assert.equal(partial.notifications[0].options.id, "seller-product-action-result");
  partial.notifications[0].options.action.onClick();
  assert.deepEqual(partial.report().failures.map(failure => failure.product.id), [2], "The operation report contains real API failures only");
  assert.match(partial.report().failures[0].reason, /Статус товара изменился/);
  assert.equal(partial.notifications[1].message, "seller-product-action-result");
  global.fetch = async () => new Response(JSON.stringify({ detail: "Товар заблокирован — обратитесь в поддержку" }), { status: 403 });
  const racedBlocked = actionFlow([product(1, "ACTIVE")]);
  racedBlocked.requestAction("delete"); await racedBlocked.confirmAction();
  assert.equal(racedBlocked.notifications[0].type, "error");
  assert.equal(racedBlocked.notifications[0].options.action.label, "Поддержка");
  racedBlocked.notifications[0].options.action.onClick();
  assert.deepEqual(racedBlocked.routes, ["/contacts"]);
  assert.deepEqual(racedBlocked.selected(), [1]);
  assert.equal(await productActionResponseError(new Response("<html>internal stack</html>", { status: 500 })), "Не удалось выполнить действие — попробуйте позже");
  assert.equal(await productActionResponseError(new Response(JSON.stringify({ detail: "Product cannot be deleted from its current status" }), { status: 409 })), "Проверьте статус и обязательные поля в карточке товара");
  assert.equal(await productActionResponseError(new Response(JSON.stringify({ detail: "Blocked product can be deleted only by admin" }), { status: 403 })), "Товар заблокирован — обратитесь в поддержку");

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
  assert.match(productFeedback("publish", result).title, /Не удалось: 2/);
  assert.equal(productFeedback("archive", { changes: [{ id: 1 }], failures: [] }).title, "Товар перенесён в архив");
  assert.equal(productFailureDestination({ product: product(1), reason: "Заполните юридические данные продавца" }).href, "/seller/legal");
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
  let timeoutCalls = 0;
  global.fetch = async () => { timeoutCalls++; throw new DOMException("mock timeout", "TimeoutError"); };
  const timedOut = await executeProductAction("delete", [product(1, "ACTIVE"), product(2, "MODERATION")]);
  assert.equal(timeoutCalls, 1, "Do not send remaining POSTs or retry automatically after an uncertain timeout");
  assert.equal(timedOut.changes.length, 0);
  assert.equal(timedOut.failures.length, 2);
  assert.match(timedOut.failures[0].reason, /Не получено подтверждение/);
  assert.equal(productFailureDestination(timedOut.failures[0]).refresh, true);
  global.fetch = async () => new Response("<html>stack trace</html>", { status: 500 });
  const serverError = await executeProductAction("delete", [product(1)]);
  assert.doesNotMatch(serverError.failures[0].reason, /html|stack/);
  let unauthorizedCalls = 0;
  global.fetch = async () => { unauthorizedCalls++; return new Response(null, { status: 401 }); };
  const unauthorized = await executeProductAction("archive", [product(1), product(2)]);
  assert.equal(unauthorizedCalls, 1);
  assert.equal(unauthorized.failures.length, 2);
  assert.equal(productFailureDestination(unauthorized.failures[0]).href, "/auth/login?next=%2Fseller%2Fproducts");
  console.log("Seller product actions: direct deletion, one grouped confirmation, excluded selection, real partial failures, feedback actions, deduplication and timeout/network/auth guards passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
