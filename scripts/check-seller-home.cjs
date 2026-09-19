// Read-only render checks. No server, database or browser session is used.
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS runner needs require hooks to render TSX without adding a test dependency. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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

const { SellerHomeTab } = require("../app/seller/components/SellerHomeTab.tsx");
const { SellerSidebar } = require("../app/seller/components/SellerSidebar.tsx");
const { SellerHeader, isSellerCabinetPath } = require("../app/components/Header/SellerHeader.tsx");
const { Button } = require("../app/components/ui/Button.tsx");
const { Price } = require("../app/components/ui/Price.tsx");
assert.equal(isSellerCabinetPath("/seller"), true);
assert.equal(isSellerCabinetPath("/seller/products/390/edit"), true);
for (const pathname of [null, "/", "/catalog", "/account", "/seller/apply", "/seller-other"]) {
  assert.equal(isSellerCabinetPath(pathname), false);
}
const header = renderToStaticMarkup(React.createElement(SellerHeader));
assert.match(header, /href="\/"/);
assert.match(header, /href="\/account"/);
assert.match(header, /Для продавцов/);
assert.doesNotMatch(header, /\/cart|\/favorites|RCM/);
for (const currentTab of ["home", "products", "orders", "returns", "finance", "brand", "legal"]) {
  const menu = renderToStaticMarkup(React.createElement(SellerSidebar, { currentTab, productCount: 6, orderCount: 42 }));
  assert.match(menu, /<nav[^>]*aria-label="Меню продавца"/);
  assert.equal((menu.match(/<a /g) || []).length, 6);
  assert.equal((menu.match(/aria-current="page"/g) || []).length, 1);
  const activeTab = currentTab === "returns" ? "orders" : currentTab;
  assert.match(menu, new RegExp(`aria-current="page"[^>]*href="${activeTab === "home" ? "/seller" : `/seller\\?tab=${activeTab}`}"`));
  assert.match(menu, /Данные и документы/);
  assert.doesNotMatch(menu, /<aside|<svg|Обзор|Возвраты|tab=returns/);
  assert.equal((menu.match(/class="navigationCount"/g) || []).length, 2);
}
assert.doesNotMatch(renderToStaticMarkup(React.createElement(SellerSidebar, { currentTab: "products", productCount: 0 })), /class="navigationCount"/);
const brand = { id: 1, name: "Тестовый магазин", description: "Описание", wordmarkUrl: "/test.svg" };
const summary = {
  activeProducts: 43, attentionProducts: 6, readyOrders: 42, salesAmount: 629410,
  availablePayout: 139731.5, failedPayouts: 0, telegramLinked: false,
  supportTelegramUrl: "https://t.me/example", recentEvents: [
    { type: "ORDER_CREATED", title: "Новый заказ", description: "Рубашка · S · 2 шт.", occurredAt: "2026-09-09T12:00:00Z", href: "/seller?tab=orders&orderId=1" },
  ],
};
const ready = { applicationCompleted: true, legalCompleted: true, agreementAccepted: true };
const base = { brand, summary, onboardingStatus: ready, creatingProduct: false, onCreateProduct() {}, onRetryOnboarding() {} };
const render = overrides => renderToStaticMarkup(React.createElement(SellerHomeTab, { ...base, ...overrides }));
const active = render();
assert.match(active, /Активен/);
assert.doesNotMatch(active, /aria-label="Подготовка магазина"/);
assert.ok(active.indexOf("Задачи магазина") < active.indexOf("Сводка магазина"));
assert.match(active, /lucide-box/);
assert.match(active, /lucide-receipt-text/);
assert.match(active, /139 732/);
assert.doesNotMatch(active, /[·•]/);
assert.equal((active.match(/<button/g) || []).length, 1);
assert.match(active, /href="\/seller\?tab=orders/);

const setup = render({ onboardingStatus: { ...ready, applicationCompleted: false, legalCompleted: false, agreementAccepted: false } });
assert.match(setup, /Подготовка магазина/);
assert.match(setup, /1 из 3 выполнено/); // Existing brand is an approved application.
assert.match(setup, /Готово/);
assert.match(setup, /Сводка магазина/);
assert.equal((setup.match(/<button/g) || []).length, 1); // No duplicate create action.

const loading = render({ onboardingStatus: null, onboardingLoading: true });
assert.match(loading, /role="status" aria-busy="true"/);
assert.match(loading, /aria-label="Проверяем готовность магазина"/);
assert.match(loading, /buttonLoader/);
assert.match(loading, /Сводка магазина/);
const error = render({ onboardingStatus: null, onboardingError: true });
assert.match(error, /role="alert"/);
assert.match(error, /Статус недоступен/);
assert.match(error, /Повторить/);
assert.doesNotMatch(error, /Активен/);

const empty = render({ summary: { ...summary, readyOrders: 0, attentionProducts: 0, telegramLinked: true, recentEvents: [] } });
assert.doesNotMatch(empty, /Новых задач пока нет/); // Queue is still loading during SSR.
assert.match(empty, /Событий пока нет/);
const unknown = render({ summary: null });
assert.match(unknown, /Сводка пока недоступна/);
assert.doesNotMatch(unknown, /Новых задач пока нет/);

for (const phase of ["idle", "loading", "success"]) {
  const html = renderToStaticMarkup(React.createElement(Button, {
    reserveLabelSpace: true, loading: phase === "loading", success: phase === "success",
  }, "Добавить товар"));
  assert.match(html, /stableContent/);
  assert.match(html, /Добавить товар/);
  if (phase !== "idle") assert.match(html, /aria-hidden="true">Добавить товар/);
  if (phase === "loading") assert.match(html, /disabled=""/);
}
assert.match(renderToStaticMarkup(React.createElement(Button, null, "Сохранить")), /stableContent/);
assert.doesNotMatch(renderToStaticMarkup(React.createElement(Button, { reserveLabelSpace: false }, "Без резервирования")), /stableContent/);
assert.match(renderToStaticMarkup(React.createElement(Price, { amount: 123.5 })), /123,5/);
assert.match(renderToStaticMarkup(React.createElement(Price, { amount: -123.5, maximumFractionDigits: 0 })), /-124/);
const css = fs.readFileSync(path.join(__dirname, "../app/seller/components/SellerHomeTab.module.css"), "utf8");
for (const name of new Set([...active.matchAll(/class="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/)))) {
  if (["undefined", "null"].includes(name)) assert.fail(`Invalid CSS class: ${name}`);
}
assert.match(css, /prefers-reduced-motion/);
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
  console.log("PASS: seller-home states, icons, links, amounts, button states and active-products pagination/auth/errors/cancellation");
}).catch(error => { console.error(error); process.exitCode = 1; });
