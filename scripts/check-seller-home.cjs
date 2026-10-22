// Read-only semantic render checks. No server, database or browser session is used.
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS runner needs require hooks to render TSX without adding a test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

require.extensions[".css"] = module => {
  module.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    module._compile(outputText, filename);
  };
}

const route = { pathname: "/seller/home", search: "" };
let overviewSnapshot;
let overviewHookIndex = 0;
// SSR does not run effects. Supply an already-loaded orders snapshot to the
// resource hook so its real empty/error/stale-data rendering can be exercised.
const overviewReact = { ...React, useState(initial) {
  const value = overviewHookIndex++ === 0 && overviewSnapshot !== undefined ? overviewSnapshot : initial;
  return React.useState(value);
} };
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === "next/navigation") return {
    usePathname: () => route.pathname,
    useSearchParams: () => new URLSearchParams(route.search),
  };
  if (request === "react" && /[/\\]SellerOverview\.tsx$/.test(parent?.filename ?? "")) return overviewReact;
  return originalLoad.call(this, request, parent, isMain);
};
let SellerHomeTab, SellerSidebar, SellerHeader, isSellerCabinetPath, SellerAttentionContext, Button, Price, EmptyState, RequestError;
try {
  ({ SellerHomeTab } = require("../app/seller/components/SellerHomeTab.tsx"));
  ({ SellerSidebar } = require("../app/seller/components/SellerSidebar.tsx"));
  ({ SellerHeader, isSellerCabinetPath } = require("../app/components/Header/SellerHeader.tsx"));
  ({ SellerAttentionContext } = require("../app/seller/lib/SellerAttentionContext.tsx"));
  ({ Button } = require("../app/components/ui/Button.tsx"));
  ({ Price } = require("../app/components/ui/Price.tsx"));
  ({ EmptyState } = require("../app/components/ui/EmptyState.tsx"));
  ({ RequestError } = require("../app/components/ui/RequestError.tsx"));
} finally { Module._load = originalLoad; }

const originalFetch = global.fetch;
global.fetch = async () => assert.fail("Static render checks must not make network requests");
const markup = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const text = html => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const section = (html, label) => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<section\\b[^>]*aria-label="${escapedLabel}"[^>]*>([\\s\\S]*?)<\\/section>`));
  assert.ok(match, `Accessible section exists: ${label}`);
  return match[1];
};
const buttons = html => [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map(match => text(match[1]));
const hasHref = (html, href) => html.includes(`href="${href}"`);

assert.equal(isSellerCabinetPath("/seller"), true);
for (const pathname of ["/seller/home", "/seller/products", "/seller/orders", "/seller/returns", "/seller/finance", "/seller/store", "/seller/legal", "/seller/products/390/edit"]) {
  assert.equal(isSellerCabinetPath(pathname), true);
}
for (const pathname of [null, "/", "/catalog", "/account", "/seller/apply", "/seller-other"]) {
  assert.equal(isSellerCabinetPath(pathname), false);
}
const header = markup(SellerHeader);
assert.ok(hasHref(header, "/"));
assert.ok(hasHref(header, "/seller/store"));
assert.match(header, /Для продавцов/);
assert.doesNotMatch(header, /\/cart|\/favorites/);
const primaryPaths = { home: "/seller/home", products: "/seller/products", orders: "/seller/orders",
  returns: "/seller/orders", finance: "/seller/finance", brand: "/seller/store", legal: "/seller/legal" };
for (const [currentTab, href] of Object.entries(primaryPaths)) {
  const menu = markup(SellerSidebar, { currentTab });
  assert.match(menu, /aria-label="Меню продавца"/);
  const selected = [...menu.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g)];
  assert.equal(selected.length, 1);
  assert.ok(hasHref(selected[0][0], href), `Primary seller group resolves ${currentTab}`);
  assert.doesNotMatch(menu, /data-seller-attention|navigationCount/);
}

const brand = { id: 1, name: "Тестовый магазин", description: "Описание", wordmarkUrl: "/test.svg" };
const summary = {
  totalProducts: 49, activeProducts: 43, attentionProducts: 6,
  totalOrders: 74, activeOrders: 44, readyOrders: 42,
  salesAmount: 629410, estimatedBalance: 200000, commissionAmount: 62941,
  availablePayout: 139731.5, processingPayout: 4500.25, inPayoutAmount: 1200,
  failedPayouts: 0, telegramLinked: false, telegramEnabled: false,
  supportTelegramUrl: "https://t.me/example", recentEvents: [],
};
const ready = { applicationCompleted: true, brandCompleted: true, legalCompleted: true, agreementAccepted: true };
const quietAttention = { items: {}, loading: false, hasErrors: false, refresh() {} };
const base = { brand, summary, onboardingStatus: ready, onNavigate() {}, onCreateProduct() {} };
function render(overrides = {}, { orders, attention = {} } = {}) {
  overviewSnapshot = orders;
  overviewHookIndex = 0;
  try {
    return renderToStaticMarkup(React.createElement(SellerAttentionContext.Provider,
      { value: { ...quietAttention, ...attention } }, React.createElement(SellerHomeTab, { ...base, ...overrides })));
  } finally { overviewSnapshot = undefined; }
}
const active = render();
for (const href of ["/seller/orders", "/seller/products?section=collections", "/seller/products?status=ACTIVE",
  "/seller/products?status=attention", "/seller/finance", "/seller/store", "/seller/legal", "/seller/legal?section=bank", "/seller/legal?section=contacts"]) {
  assert.ok(hasHref(active, href), `Overview links to ${href}`);
}
assert.equal(buttons(active).filter(label => label === "Добавить товар").length, 1, "One create-product CTA");
const finances = text(section(active, "Финансы"));
for (const amount of [139731.5, 4500.25, 1200]) assert.ok(finances.includes(text(amount.toLocaleString("ru-RU"))), "Real finance amount is preserved");
assert.doesNotMatch(finances, /NaN|undefined|—/);
assert.match(text(section(active, "Данные и документы")), /Реквизиты и данные Готово/);
assert.match(text(section(active, "Данные и документы")), /Условия работы Готово/);
assert.match(active, /href="https:\/\/t\.me\/example"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
assert.doesNotMatch(active, /Заказов пока нет/, "SSR loading is not confirmed empty orders");

const unknown = render({ brand: null, summary: null, onboardingStatus: null });
const unknownFinances = section(unknown, "Финансы");
assert.equal((text(unknownFinances).match(/—/g) || []).length, 3, "Unknown money is shown as unknown");
assert.doesNotMatch(unknownFinances, /₽|NaN|undefined/);
const unknownDocuments = text(section(unknown, "Данные и документы"));
assert.match(unknownDocuments, /Нет данных/);
assert.doesNotMatch(unknownDocuments, /Готово|Требует действий/, "Unknown completion is not success or incomplete");
assert.ok(hasHref(unknown, "/contacts"));

const zero = render({ summary: { ...summary, availablePayout: 0, processingPayout: 0, inPayoutAmount: 0,
  totalProducts: 0, activeProducts: 0, attentionProducts: 0, totalOrders: 0, activeOrders: 0, readyOrders: 0 } });
assert.equal((section(zero, "Финансы").match(/₽/g) || []).length, 3, "Confirmed zero balances still have currency");
assert.doesNotMatch(section(zero, "Финансы"), /—|NaN/);
assert.equal((section(zero, "Сводка товаров и заказов").match(/<strong>0<\/strong>/g) || []).length, 6, "Confirmed zero counts are not hidden");
const incomplete = render({ onboardingStatus: { ...ready, legalCompleted: false, agreementAccepted: false } });
assert.match(text(section(incomplete, "Данные и документы")), /Реквизиты и данные Требует действий/);
assert.match(text(section(incomplete, "Данные и документы")), /Условия работы Требует действий/);

for (const supportTelegramUrl of [null, "javascript:alert(1)", "http://t.me/example", "https://evil.test/example", "https://t.me@evil.test/example", "https://user:pass@t.me/example", "https://t.me:8443/example"]) {
  const fallback = render({ summary: { ...summary, supportTelegramUrl } });
  assert.ok(hasHref(fallback, "/contacts"), "Missing or unsafe Telegram support uses contacts");
  if (supportTelegramUrl) assert.ok(!hasHref(fallback, supportTelegramUrl));
}
for (const [telegramLinked, telegramEnabled, label] of [[false, false, "Не подключён"], [true, undefined, "Аккаунт подключён"], [true, true, "Уведомления включены"], [true, false, "Уведомления выключены"]]) {
  assert.ok(text(section(render({ summary: { ...summary, telegramLinked, telegramEnabled } }), "Данные и документы")).includes(label));
}

const emptyOrders = render({}, { orders: { data: { content: [] }, loading: false } });
assert.ok(emptyOrders.includes(markup(EmptyState, { title: "Заказов пока нет" })), "Confirmed empty orders use the shared EmptyState");
const failedOrders = render({}, { orders: { error: true, loading: false } });
assert.ok(failedOrders.includes(markup(RequestError, { message: "Не удалось загрузить заказы", variant: "section", onRetry() {}, loading: false })),
  "First-load orders failure uses the shared RequestError");
assert.doesNotMatch(failedOrders, /Заказов пока нет/, "Failure is not confirmed empty orders");
const retryingOrders = render({}, { orders: { error: true, loading: true } });
assert.match(retryingOrders, /Не удалось загрузить заказы/);
assert.match(retryingOrders, /role="alert" aria-busy="true"/);
assert.ok(buttons(retryingOrders).includes("Повторить"), "Retry keeps the error and its action visible");

const order = { id: 421, orderGroupId: "fixture", status: "PROCESSING", paymentStatus: "PAID", deliveryStatus: "READY_FOR_SHIPMENT",
  createdAt: "2026-10-21T10:00:00Z", totalAmount: 15900, currency: "RUB", itemsCount: 1,
  productTitles: ["Товар из подтверждённого заказа"], items: [] };
const staleOrders = render({}, { orders: { data: { content: [order] }, error: true, loading: false } });
assert.ok(hasHref(staleOrders, "/seller/orders/421"), "Known orders retain a real detail URL when refresh fails");
assert.ok(staleOrders.includes(markup(RequestError, { message: "Не удалось загрузить заказы", variant: "inline", onRetry() {}, loading: false })),
  "Refresh error is inline beside retained orders");
assert.doesNotMatch(staleOrders, /Заказов пока нет/);
const needsAttention = render({}, { attention: { items: { products: { href: "/seller/products?status=attention", description: "Есть замечания", count: 2, tone: "danger" } } } });
assert.ok(hasHref(needsAttention, "/seller/products?status=attention"));
assert.equal(buttons(needsAttention).filter(label => label === "Добавить товар").length, 1);
const attentionFailure = render({}, { attention: { hasErrors: true } });
assert.ok(attentionFailure.includes(markup(RequestError, { variant: "inline", message: "Часть задач не удалось проверить", onRetry() {}, loading: false })),
  "Task-summary failure uses the shared RequestError");

for (const phase of ["idle", "loading", "success"]) {
  const html = markup(Button, { reserveLabelSpace: true, loading: phase === "loading", success: phase === "success", children: "Добавить товар" });
  assert.match(html, /Добавить товар/);
  if (phase === "loading") assert.match(html, /disabled=""/);
}
assert.match(text(markup(Price, { amount: 123.5 })), /123,5/);
assert.match(text(markup(Price, { amount: -123.5, maximumFractionDigits: 0 })), /-124/);
async function checkActiveProducts() {
  const { getSellerActiveProductsClient } = require("../app/seller/lib/sellerClientDataApi.ts");
  const originalFetch = global.fetch;
  const calls = [];
  let pages = [
    [{ id: 100, status: "DRAFT" }, { id: 99, status: "ARCHIVED" }],
    [{ id: 98, status: "ACTIVE" }, { id: 97, status: "MODERATION" }],
    [{ id: 96, status: "ACTIVE" }, { id: 95 }],
  ];
  let forbidden = false;
  global.fetch = async (url, options) => {
    options.signal?.throwIfAborted();
    const request = new URL(url);
    assert.equal(request.pathname, "/api/seller/products/list");
    assert.equal(options.credentials, "include");
    assert.equal(request.searchParams.get("sort"), "id,desc");
    const page = Number(request.searchParams.get("page"));
    calls.push(page);
    return { ok: !forbidden, json: async () => ({ content: pages[page], number: page, totalPages: pages.length }) };
  };
  try {
    assert.deepEqual((await getSellerActiveProductsClient()).map(item => item.id), [98, 96]);
    assert.deepEqual(calls, [0, 1, 2]);
    pages = [Array.from({ length: 50 }, (_, id) => ({ id, status: "ACTIVE" })), [{ id: 100, status: "ACTIVE" }]];
    calls.length = 0;
    assert.equal((await getSellerActiveProductsClient()).length, 12);
    assert.deepEqual(calls, [0]);
    pages = [[{ id: 1, status: "BLOCKED" }]];
    assert.deepEqual(await getSellerActiveProductsClient(), []);
    forbidden = true;
    await assert.rejects(getSellerActiveProductsClient(), /Не удалось загрузить товары/);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(getSellerActiveProductsClient(controller.signal), { name: "AbortError" });
  } finally {
    global.fetch = originalFetch;
  }
}
checkActiveProducts().then(() => {
  console.log("PASS: seller-home routes, real/unknown/zero values, completion, one create CTA, safe Telegram, shared empty/error states and active-products pagination/auth/errors/cancellation; no real API");
}).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { global.fetch = originalFetch; });
