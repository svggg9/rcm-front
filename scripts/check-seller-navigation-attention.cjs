/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

const origin = "http://localhost:13043";
const api = "http://localhost:19643";
const calls = [];
const fixtureBrand = {
  id: 1, name: "Тестовый магазин", slug: "test-store", description: "Описание магазина",
  wordmarkUrl: "/examples/versace-wordmark.svg", logoUrl: null, country: "Россия",
  foundationYear: 2020, website: null, telegram: null, vk: null,
};
const productBase = { article: null, brandName: fixtureBrand.name, categoryName: "Тестовая категория", coverImage: null, minPrice: 500, totalStock: 1, variantsCount: 1 };
const fixtureProducts = [
  { ...productBase, id: 2, title: "Товар с замечаниями", status: "NEEDS_REVISION" },
  { ...productBase, id: 3, title: "Активный товар без замечаний", status: "ACTIVE" },
  { ...productBase, id: 4, title: "Заблокированный товар", status: "BLOCKED" },
];
const fixtureOrder = {
  id: 10, orderGroupId: "attention-test", status: "PROCESSING", paymentStatus: "PAID",
  deliveryStatus: "READY_FOR_SHIPMENT", createdAt: "2026-10-07T08:00:00Z", paidAt: "2026-10-07T08:00:00Z",
  totalAmount: 500, subtotalAmount: 500, deliveryAmount: 0, discountAmount: 0, currency: "RUB",
  recipientName: "Тестовый покупатель", items: [], firstProductTitle: null, itemsCount: 0, productTitles: [], delivery: null,
};

function task(category, id, action, href) {
  return { id: `${category}-${id}`, action, href, title: "Задача магазина", object: `Тестовая запись ${id}`, description: "Тестовое пояснение", icon: "package", tone: "neutral", dueAt: null };
}
const shipping = task("order", 10, "Передать в доставку", "/seller/orders/10");
const waitingReturn = task("return", 60, "Открыть возврат", "/seller/returns/60");
const receivedReturn = task("return", 61, "Проверить товар", "/seller/returns/61");
const productTask = task("product", 2, "Открыть товар", "/seller/products/2/edit");

function healthyScenario() {
  return {
    dashboard: {
      activeProducts: 1, attentionProducts: 0, totalProducts: 3, readyOrders: 0, activeOrders: 0, totalOrders: 0,
      estimatedBalance: 0, salesAmount: 0, commissionAmount: 0, availablePayout: 0, processingPayout: 0,
      inPayoutAmount: 0, failedPayouts: 0, telegramLinked: false, supportTelegramUrl: null, recentEvents: [],
    },
    finance: {
      availableAmount: 0, processingAmount: 0, inPayoutAmount: 0, failedPayoutAmount: 0, nextPayoutAmount: 0,
      reconciliationDifference: 0, operations: [], payouts: [], nextPayout: null, nextPayoutDate: "2026-10-09",
      bankDetailsReady: true, paidThisMonthAmount: 0, estimatedBalance: 0, salesAmount: 0,
      commissionAmount: 0, adjustmentsAmount: 0, paidOutAmount: 0,
    },
    onboarding: { applicationCompleted: true, brandCompleted: true, legalCompleted: true, agreementAccepted: true, progress: 100, completedSteps: 4, totalSteps: 4 },
    brands: [{ ...fixtureBrand }], orderTasks: [], productTasks: [], returnPages: [[]], failures: new Set(),
  };
}
function attentionScenario() {
  const scenario = healthyScenario();
  scenario.dashboard.attentionProducts = 2;
  scenario.dashboard.failedPayouts = 1;
  scenario.dashboard.readyOrders = 8;
  scenario.finance.reconciliationDifference = 25;
  scenario.finance.bankDetailsReady = false;
  scenario.onboarding.legalCompleted = false;
  scenario.onboarding.agreementAccepted = false;
  scenario.brands[0].description = null;
  scenario.brands[0].wordmarkUrl = null;
  scenario.orderTasks = [shipping];
  scenario.productTasks = [productTask];
  scenario.returnPages = [[waitingReturn], [receivedReturn]];
  return scenario;
}
function pageResponse(content = [], number = 0) {
  return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number };
}
let scenario = attentionScenario();
let delayedDashboard;
let delayedReturn;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, api);
  calls.push({ pathname: url.pathname, query: url.search, origin: req.headers.origin });
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "GET") { res.statusCode = 405; return res.end(JSON.stringify({ message: "Only read-only checks are allowed" })); }
  if (scenario.failures.has(url.pathname)) { res.statusCode = 500; return res.end(JSON.stringify({ message: "Тестовая ошибка загрузки" })); }

  let data = [];
  if (url.pathname === "/api/auth/session") data = { id: 70, username: "seller", role: "SELLER" };
  else if (url.pathname === "/api/profile") data = { displayName: "Тестовый продавец", email: "seller@example.test" };
  else if (url.pathname === "/api/profile/telegram") data = { linked: false, telegramUsername: null, url: null, expiresAt: null };
  else if (url.pathname === "/api/seller/notification-preferences") data = { email: "seller@example.test", emailEnabled: false, telegramEnabled: false, telegramLinked: false, telegramUsername: null };
  else if (url.pathname === "/api/seller/legal-info") { res.statusCode = 204; return res.end(); }
  else if (url.pathname === "/api/seller/brands") data = scenario.brands;
  else if (url.pathname === "/api/seller/onboarding-status") data = scenario.onboarding;
  else if (url.pathname === "/api/seller/dashboard-summary") data = scenario.dashboard;
  else if (url.pathname === "/api/seller/finance/summary") data = scenario.finance;
  else if (url.pathname === "/api/seller/products/list") data = pageResponse(fixtureProducts);
  else if (url.pathname === "/api/seller/orders/list") data = pageResponse([]);
  else if (url.pathname === "/api/seller/orders/10") data = fixtureOrder;
  else if (url.pathname === "/api/seller/returns/list" || url.pathname === "/api/seller/finance/payouts" || url.pathname === "/api/seller/finance/operations") data = pageResponse();
  else if (url.pathname === "/api/seller/dashboard/tasks") {
    const category = url.searchParams.get("category");
    const number = Number(url.searchParams.get("page") || 0);
    const size = Number(url.searchParams.get("size") || 20);
    const pages = scenario.returnPages;
    const content = category === "order" ? scenario.orderTasks.slice(0, size)
      : category === "product" ? scenario.productTasks.slice(0, size)
      : category === "return" ? pages[number] || []
      : [...scenario.orderTasks, ...scenario.productTasks, ...pages.flat()].slice(0, size);
    data = { content, number, hasNext: category === "return" && number < pages.length - 1 };
  }
  const body = JSON.stringify(data);
  const delayed = url.pathname === "/api/seller/dashboard-summary" && req.headers.origin === origin ? delayedDashboard
    : url.pathname === "/api/seller/dashboard/tasks" && url.searchParams.get("category") === "return" && url.searchParams.get("size") === "100" ? delayedReturn
    : undefined;
  if (delayed) {
    if (delayed === delayedDashboard) delayedDashboard = undefined;
    if (delayed === delayedReturn) delayedReturn = undefined;
    res.on("close", () => { if (!res.writableEnded) delayed.aborted = true; });
    delayed.started();
    await delayed.releasePromise;
    res.end(body);
    delayed.completed();
    return;
  }
  res.end(body);
});

function navigation(page) { return page.getByRole("navigation", { name: "Меню продавца" }); }
function badge(page, tab) { return navigation(page).locator(`[data-seller-attention="${tab}"]`); }
async function waitForAttention(page) {
  await navigation(page).waitFor();
  await page.waitForFunction(() => document.querySelector('nav[aria-label="Меню продавца"]')?.getAttribute("aria-busy") === "false");
}
async function refreshAttention(page) {
  const response = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.origin === api && url.pathname === "/api/seller/dashboard/tasks" && url.searchParams.get("category") === "return";
  });
  await page.evaluate(() => window.dispatchEvent(new Event("seller:navigation-attention-changed")));
  await response;
  await waitForAttention(page);
}
async function assertBadge(page, tab, label, href, count) {
  const link = badge(page, tab);
  await link.waitFor();
  const visibleText = (await link.innerText()).trim();
  assert.equal(visibleText, count === undefined ? "" : count > 99 ? "99+" : String(count), `${tab}: ${label} uses an exact count or a dot instead of visible words`);
  assert.doesNotMatch(visibleText, /[а-яa-z]/i, `${tab}: no visible text sticker`);
  assert.equal(await link.getAttribute("href"), href, `${tab}: actionable internal destination`);
  const accessibleName = await link.getAttribute("aria-label");
  assert.ok(accessibleName && accessibleName.includes(": ") && accessibleName.length > label.length + 10, `${tab}: accessible name explains the required action`);
  assert.equal(await link.getAttribute("title"), accessibleName.slice(accessibleName.indexOf(": ") + 2));
  const indicator = link.locator('[data-ui="notification-badge"]');
  assert.equal(await indicator.count(), 1, `${tab}: compact notification indicator`);
  assert.equal(await indicator.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && Number.parseFloat(getComputedStyle(node).borderRadius) >= rect.height / 2;
  }), true, `${tab}: indicator has a round outline`);
}
async function assertNoBadges(page, message) {
  await page.waitForFunction(() => document.querySelector('nav[aria-label="Меню продавца"][aria-busy="false"]')
    && document.querySelectorAll('[data-seller-attention]').length === 0);
  assert.equal(await navigation(page).locator("[data-seller-attention]").count(), 0, message);
}
async function assertCanonicalLinks(page) {
  for (const [label, href] of [["Обзор магазина", "/seller/home"], ["Товары", "/seller/products"], ["Заказы", "/seller/orders"], ["Финансы", "/seller/finance"], ["Магазин", "/seller/store"], ["Данные и документы", "/seller/legal"]]) {
    const link = navigation(page).getByRole("link", { name: label, exact: true });
    assert.equal(await link.getAttribute("href"), href, `${label}: main link opens the whole section`);
    assert.equal(await link.getAttribute("data-seller-attention"), null);
    assert.equal(await link.evaluate(node => getComputedStyle(node).color), "rgb(17, 17, 17)", `${label}: black label text`);
  }
}
async function assertFocusedGroupVisible(page, link, width) {
  await link.focus();
  const handle = await link.elementHandle();
  try {
    await page.waitForFunction(node => {
      const container = node.closest("nav").getBoundingClientRect();
      const group = node.closest("[data-seller-navigation-item]").getBoundingClientRect();
      return group.left >= container.left - 1 && group.right <= container.right + 1;
    }, handle);
  } finally { await handle.dispose(); }
  const geometry = await link.evaluate(node => {
    const rect = node.getBoundingClientRect();
    const group = node.closest("[data-seller-navigation-item]").getBoundingClientRect();
    const container = node.closest("nav").getBoundingClientRect();
    const style = getComputedStyle(node);
    return { width: rect.width, height: rect.height, groupWidth: group.width, navWidth: container.width, color: style.color };
  });
  assert.ok(geometry.width >= 44 && geometry.height >= 44, `Badge at ${width}: target should be at least 44×44, received ${geometry.width}×${geometry.height}`);
  assert.equal(geometry.color, "rgb(17, 17, 17)");
  assert.ok(geometry.groupWidth <= geometry.navWidth + 1, `Badge at ${width}: complete label/badge group should fit`);
}
async function saveScreenshot(page, width) {
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  const directory = path.resolve(__dirname, "../build/navigation-attention-screenshots");
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `seller-navigation-counters-${width}.png`), fullPage: true });
  if (width === 1280) await navigation(page).screenshot({ path: path.join(directory, "seller-counter-tabbar-1280.png") });
}

async function main() {
  const configPath = path.resolve(__dirname, "../tsconfig.json");
  const nextEnvPath = path.resolve(__dirname, "../next-env.d.ts");
  const originalIncludes = new Set(JSON.parse(fs.readFileSync(configPath, "utf8")).include);
  const originalNextEnv = fs.readFileSync(nextEnvPath, "utf8");
  await new Promise(resolve => server.listen(19643, "127.0.0.1", resolve));
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "13043"], {
    cwd: path.resolve(__dirname, ".."), windowsHide: true,
    env: { ...process.env, RCM_TEST_DIST_DIR: "build/navigation-attention-check", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", chunk => { logs += chunk; });
  child.stderr.on("data", chunk => { logs += chunk; });
  let browser;
  let page;
  const errors = [];
  try {
    const startupDeadline = Date.now() + 60_000;
    let ready = false;
    while (Date.now() < startupDeadline) {
      if (child.exitCode !== null) throw new Error(`Test Next server exited: ${logs}`);
      if (logs.includes("Unhandled Rejection")) throw new Error(`Test Next server failed during startup: ${logs}`);
      try { const response = await fetch(origin + "/seller/legal", { signal: AbortSignal.timeout(2000) }); if (response.ok) { ready = true; break; } }
      catch { /* Wait for the isolated dev server. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error(`Test Next server did not become ready within 60 seconds: ${logs}`);
    browser = await chromium.launch({ headless: true, channel: "msedge" });
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin + "/seller/legal");
    await waitForAttention(page);
    await assertCanonicalLinks(page);
    await assertBadge(page, "home", "Задачи", "/seller/home");
    await assertBadge(page, "products", "Проверить", "/seller/products/2/edit", 2);
    await assertBadge(page, "orders", "Возврат", "/seller/returns/61");
    await assertBadge(page, "finance", "Проверить", "/seller/finance?view=payouts", 1);
    await assertBadge(page, "brand", "Оформить", "/seller/store");
    await assertBadge(page, "legal", "Заполнить", "/seller/legal");
    assert.equal(await navigation(page).locator("[data-seller-attention]").count(), 6, "All section signals are visible outside the home route");
    assert.ok(calls.some(call => call.pathname === "/api/seller/dashboard/tasks" && new URLSearchParams(call.query).get("category") === "return" && new URLSearchParams(call.query).get("page") === "1"), "Received return after a waiting-only first page must be discovered");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await saveScreenshot(page, 1280);
    console.log("PASS: direct legal route shows six round actionable indicators without word stickers; exact product/payout counts; canonical links and received-return priority");

    scenario = healthyScenario();
    await refreshAttention(page);
    await assertNoBadges(page, "Resolved tasks remove every badge after the navigation event");
    scenario.dashboard.attentionProducts = 125;
    scenario.dashboard.failedPayouts = 100;
    await refreshAttention(page);
    await assertBadge(page, "products", "Проверить", "/seller/products?status=attention", 125);
    await assertBadge(page, "finance", "Проверить", "/seller/finance?view=payouts", 100);
    scenario = healthyScenario();
    await refreshAttention(page);
    await assertNoBadges(page, "Counters clear after a solved state even after displaying 99+");
    scenario.dashboard.readyOrders = 7;
    scenario.onboarding.brandCompleted = false;
    await refreshAttention(page);
    await assertNoBadges(page, "readyOrders and legacy brandCompleted cannot invent tasks when the real queue/storefront is complete");
    scenario.returnPages = [[waitingReturn]];
    await refreshAttention(page);
    await assertNoBadges(page, "Waiting-only returns do not require seller inspection");
    console.log("PASS: exact counters cap at 99+ and disappear after resolution; readyOrders, legacy brandCompleted and waiting-only returns do not create false attention");

    scenario = healthyScenario();
    scenario.orderTasks = [shipping];
    await refreshAttention(page);
    await assertBadge(page, "orders", "К отправке", "/seller/orders/10");
    await badge(page, "orders").click();
    await page.waitForURL(url => url.pathname === "/seller/orders/10");
    await waitForAttention(page);
    await assertCanonicalLinks(page);
    await page.goto(origin + "/seller/legal");
    await waitForAttention(page);

    scenario = healthyScenario();
    scenario.dashboard.attentionProducts = 2;
    await refreshAttention(page);
    await assertBadge(page, "products", "Проверить", "/seller/products?status=attention", 2);
    await badge(page, "products").click();
    await page.waitForURL(url => url.pathname === "/seller/products" && url.searchParams.get("status") === "attention");
    await page.getByText("Товар с замечаниями", { exact: true }).waitFor();
    await page.getByText("Заблокированный товар", { exact: true }).waitFor();
    assert.equal(await page.getByText("Активный товар без замечаний", { exact: true }).count(), 0, "Fallback queue filters real attention statuses");
    await waitForAttention(page);
    await assertCanonicalLinks(page);
    await page.goto(origin + "/seller/legal");
    await waitForAttention(page);
    console.log("PASS: shipping badge opens the real order URL; empty product-task fallback opens the implemented attention queue and excludes active products");

    scenario = healthyScenario();
    scenario.dashboard.failedPayouts = 1;
    scenario.finance.reconciliationDifference = 15;
    await refreshAttention(page);
    await assertBadge(page, "finance", "Проверить", "/seller/finance?view=payouts", 1);
    scenario.dashboard.failedPayouts = 0;
    await refreshAttention(page);
    await assertBadge(page, "finance", "Сверка", "/seller/finance");
    scenario.finance.reconciliationDifference = 0;
    scenario.onboarding.agreementAccepted = false;
    await refreshAttention(page);
    await assertBadge(page, "legal", "Оферта", "/seller/legal?section=bank");
    await badge(page, "legal").click();
    await page.waitForURL(url => url.searchParams.get("section") === "bank");
    await page.getByRole("heading", { name: "Банковские реквизиты", exact: true }).waitFor();
    await page.getByRole("button", { name: "Контакты", exact: true }).click();
    await page.waitForURL(url => url.searchParams.get("section") === "contacts");
    const contactName = page.getByLabel("Контактное лицо", { exact: true });
    await contactName.fill("Несохранённый контакт");
    await badge(page, "legal").click();
    await page.waitForURL(url => url.searchParams.get("section") === "bank");
    await page.getByRole("heading", { name: "Банковские реквизиты", exact: true }).waitFor();
    await page.getByRole("button", { name: "Контакты", exact: true }).click();
    assert.equal(await contactName.inputValue(), "Несохранённый контакт", "Badge deep-link preserves unsaved contact draft");
    await page.evaluate(() => window.history.pushState(null, "", "/seller/legal"));
    await page.waitForURL(url => url.pathname === "/seller/legal" && !url.searchParams.has("section"));
    await page.locator('[data-legal-section="legal"]:not([hidden])').waitFor();
    await page.getByRole("button", { name: "Контакты", exact: true }).click();
    assert.equal(await contactName.inputValue(), "Несохранённый контакт", "Canonical legal navigation preserves draft while resetting its visible section");
    scenario.onboarding.agreementAccepted = true;
    scenario.finance.bankDetailsReady = false;
    await refreshAttention(page);
    await assertBadge(page, "legal", "Реквизиты", "/seller/legal?section=legal");
    console.log("PASS: payout/reconciliation priority; legal agreement/recipient deep-links; section query, canonical legal reset and unsaved contact draft preservation");

    scenario = attentionScenario();
    scenario.failures.add("/api/seller/finance/summary");
    await refreshAttention(page);
    await assertBadge(page, "home", "Нет данных", "/seller/home");
    await assertBadge(page, "products", "Проверить", "/seller/products/2/edit", 2);
    await assertBadge(page, "orders", "Возврат", "/seller/returns/61");
    await assertBadge(page, "brand", "Оформить", "/seller/store");
    scenario = healthyScenario();
    await badge(page, "home").click();
    await page.waitForURL(url => url.pathname === "/seller/home");
    await waitForAttention(page);
    await assertNoBadges(page, "Clicking the unknown-state badge retries after API recovery");
    console.log("PASS: partial API 500 shows unknown home state while retaining known positive tasks; recovery through the badge clears stale warnings");

    await page.goto(origin + "/seller/legal");
    await waitForAttention(page);
    let releaseReturn;
    let markReturnStarted;
    let markReturnCompleted;
    const returnStarted = new Promise(resolve => { markReturnStarted = resolve; });
    const returnCompleted = new Promise(resolve => { markReturnCompleted = resolve; });
    const heldReturn = { started: markReturnStarted, completed: markReturnCompleted, releasePromise: new Promise(resolve => { releaseReturn = resolve; }), aborted: false };
    scenario = healthyScenario();
    scenario.dashboard.attentionProducts = 1;
    scenario.productTasks = [productTask];
    scenario.orderTasks = [shipping];
    scenario.returnPages = [[receivedReturn]];
    delayedReturn = heldReturn;
    const deadlineStarted = Date.now();
    await page.evaluate(() => window.dispatchEvent(new Event("seller:navigation-attention-changed")));
    await returnStarted;
    await waitForAttention(page);
    assert.ok(Date.now() - deadlineStarted >= 14_000, "The received-return scan should use its shared 15 second deadline");
    await assertBadge(page, "home", "Нет данных", "/seller/home");
    await assertBadge(page, "products", "Проверить", "/seller/products/2/edit", 1);
    await assertBadge(page, "orders", "К отправке", "/seller/orders/10");
    releaseReturn();
    await returnCompleted;
    await page.waitForLoadState("networkidle");
    assert.equal(heldReturn.aborted, true, "The received-return request should be aborted after the shared deadline");
    scenario = healthyScenario();
    await refreshAttention(page);
    await assertNoBadges(page, "A timed-out return source recovers on the next refresh");
    console.log("PASS: the shared 15s return-scan deadline preserves known positive tasks, marks unknown source state and recovers on refresh");

    scenario = healthyScenario();
    scenario.orderTasks = [{ ...shipping, href: "https://foreign.example/orders/10" }];
    scenario.productTasks = [{ ...productTask, href: "//foreign.example/products/2/edit" }];
    await refreshAttention(page);
    await assertBadge(page, "orders", "К отправке", "/seller/orders");
    await assertBadge(page, "products", "Проверить", "/seller/products?status=attention");
    scenario.orderTasks = [{ ...shipping, id: "invalid", action: "Unsupported action" }];
    scenario.productTasks = [];
    await refreshAttention(page);
    await assertBadge(page, "home", "Нет данных", "/seller/home");
    assert.equal(await badge(page, "orders").count(), 0, "Malformed task cannot create a seller action");
    console.log("PASS: foreign task links fall back to safe implemented seller destinations; malformed tasks create explicit unknown state");

    scenario = healthyScenario();
    await refreshAttention(page);
    await assertNoBadges(page, "Prepare a clean state for stale-response regression");
    let releaseOld;
    let markStarted;
    let markCompleted;
    const started = new Promise(resolve => { markStarted = resolve; });
    const completed = new Promise(resolve => { markCompleted = resolve; });
    const delayed = { started: markStarted, completed: markCompleted, releasePromise: new Promise(resolve => { releaseOld = resolve; }), aborted: false };
    delayedDashboard = delayed;
    scenario.dashboard.attentionProducts = 1;
    await page.evaluate(() => window.dispatchEvent(new Event("seller:navigation-attention-changed")));
    await started;
    scenario = healthyScenario();
    await refreshAttention(page);
    await assertNoBadges(page, "New refresh resolves attention before old response is released");
    releaseOld();
    await completed;
    await page.waitForLoadState("networkidle");
    assert.equal(delayed.aborted, true, "The older attention request should be aborted");
    await assertNoBadges(page, "A late old positive response cannot restore resolved badges");
    console.log("PASS: a newer refresh aborts the older request; its late positive response cannot restore solved attention");

    scenario = attentionScenario();
    await refreshAttention(page);
    await page.goto(origin + "/seller/home");
    await waitForAttention(page);
    await page.locator("[data-seller-next-action]").first().waitFor();
    assert.deepEqual(await page.locator("[data-seller-next-action]").evaluateAll(nodes => nodes.map(node => node.dataset.sellerNextAction)), ["orders", "products", "finance", "legal", "brand"]);
    for (const tab of ["orders", "products", "finance", "legal", "brand"]) {
      assert.equal(await page.locator(`[data-seller-next-action="${tab}"]`).getByRole("link", { name: "Перейти к задаче" }).getAttribute("href"), await badge(page, tab).getAttribute("href"));
    }
    await page.screenshot({ path: path.resolve(__dirname, "../build/navigation-attention-screenshots/seller-next-actions-1280.png"), fullPage: true });
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(origin + "/seller/legal");
      await waitForAttention(page);
      await assertCanonicalLinks(page);
      assert.equal(await navigation(page).locator("[data-seller-attention]").count(), 6);
      for (const tab of ["home", "orders", "brand", "legal"]) {
        assert.equal((await badge(page, tab).innerText()).trim(), "", `${tab}: mobile/desktop indicator is a dot without visible words`);
      }
      assert.equal((await badge(page, "products").innerText()).trim(), "2");
      assert.equal((await badge(page, "finance").innerText()).trim(), "1");
      if (width === 1280) {
        const geometry = await navigation(page).evaluate(node => {
          const container = node.getBoundingClientRect();
          const groups = Array.from(node.querySelectorAll("[data-seller-navigation-item]"), item => item.getBoundingClientRect());
          return { scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, center: container.left + container.width / 2, left: groups[0].left, right: groups.at(-1).right };
        });
        assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, "All six label/badge groups should fit together at 1280");
        assert.ok(Math.abs((geometry.left + geometry.right) / 2 - geometry.center) <= 1, "All attention groups should be centered at 1280");
      }
      const sourceScroll = await page.evaluate(() => scrollY);
      for (const tab of ["home", "products", "orders", "finance", "brand", "legal"]) {
        const link = badge(page, tab);
        await assertFocusedGroupVisible(page, link, width);
        assert.equal(await page.evaluate(() => scrollY), sourceScroll, `Focus ${tab} badge at ${width} must preserve page scroll`);
        assert.ok((await link.getAttribute("href")).startsWith("/"), "Badges retain real internal URLs");
      }
      const lastBadge = badge(page, "legal");
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      assert.equal(await lastBadge.evaluate(node => node === document.activeElement && node.matches(":focus-visible") && getComputedStyle(node).outlineStyle !== "none"), true, `Badge focus outline at ${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No page overflow at ${width}`);
      await saveScreenshot(page, width);
    }
    console.log("PASS: six groups fit and center at 1280; 390/320 preserve real links, black text, complete label/badge focus reveal, 44px targets and page scroll; screenshots saved");
    assert.deepEqual(errors, [], "Every attention scenario renders without browser exceptions");
  } catch (error) {
    console.error(logs.slice(-5000));
    if (errors.length) console.error("Browser errors:", errors);
    if (page) console.error(await page.locator("body").innerText());
    throw error;
  } finally {
    if (delayedDashboard) delayedDashboard.completed();
    if (browser) await browser.close();
    if (child.exitCode === null) {
      const exited = new Promise(resolve => child.once("exit", resolve));
      child.kill();
      await exited;
    }
    server.closeAllConnections();
    server.close();
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const ownIncludes = new Set(["build/navigation-attention-check/types/**/*.ts", "build/navigation-attention-check/dev/types/**/*.ts"]);
    const cleanedIncludes = config.include.filter(value => !ownIncludes.has(value) || originalIncludes.has(value));
    if (cleanedIncludes.length !== config.include.length) fs.writeFileSync(configPath, JSON.stringify({ ...config, include: cleanedIncludes }, null, 2) + "\n");
    if (fs.readFileSync(nextEnvPath, "utf8").includes("./build/navigation-attention-check/")) fs.writeFileSync(nextEnvPath, originalNextEnv);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
