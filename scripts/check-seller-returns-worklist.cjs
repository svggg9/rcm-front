/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression with mock API; no database writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

const origin = "http://localhost:13053";
const api = "http://localhost:19653";
const statuses = ["SUBMITTED", "REQUESTED", "APPROVED", "REJECTED", "AWAITING_SHIPMENT", "WAITING_FOR_ITEM", "IN_TRANSIT", "RECEIVED", "INSPECTED", "REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED", "CLOSED"];
const returns = [...statuses, ...Array(7).fill("SUBMITTED")].map((status, index) => ({ id: 60 + index, orderId: 100 + index,
  productId: 1, variantId: 1, productTitle: `Товар возврата ${status}`, sku: `1000${60 + index}`,
  quantity: 1, reason: "DEFECT", comment: "Комментарий покупателя", status, photoUrls: [],
  cdekNumber: `CDEK${60 + index}`, trackingUrl: null, adminComment: null,
  requestedAmount: 500, approvedRefundAmount: null, sellerComment: null, resellable: null,
  createdAt: "2026-10-22T10:00:00Z", updatedAt: "2026-10-22T10:00:00Z" }));
const extra = { ...returns[0], id: 90, orderId: 190, productTitle: "Дополнительный возврат" };
let listMode = "hold";
let nextPageMode = "fail";
const pending = [];
const calls = [];
const pageData = index => ({ content: index ? [returns[0], extra] : returns, totalElements: 22, totalPages: 2, number: index, size: 20, numberOfElements: index ? 2 : 20 });
function respond(response, data, status = 200) { response.statusCode = status; response.end(JSON.stringify(data)); }
function release(status = 200, payload) {
  for (const { response, index } of pending.splice(0)) respond(response, status === 200 ? payload ?? pageData(index) : { message: "private upstream failure" }, status);
}
async function waitPending() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (pending.length) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.fail("Expected an isolated pending return request");
}
const server = http.createServer((request, response) => {
  const url = new URL(request.url, api);
  calls.push({ path: url.pathname, page: url.searchParams.get("page"), method: request.method });
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Content-Type", "application/json");
  if (request.method === "OPTIONS") return response.end();
  if (url.pathname === "/api/seller/returns/list") {
    const index = Number(url.searchParams.get("page") || 0);
    const mode = index ? nextPageMode : listMode;
    if (mode === "hold") return pending.push({ response, index });
    return respond(response, mode === "fail" ? { message: "private upstream failure" } : pageData(index), mode === "fail" ? 503 : 200);
  }
  const detail = url.pathname.match(/^\/api\/seller\/returns\/(\d+)$/);
  if (detail) return respond(response, [...returns, extra].find(item => item.id === Number(detail[1])));
  let data = [];
  if (url.pathname === "/api/auth/session") data = { id: 70, username: "seller", role: "SELLER" };
  else if (url.pathname === "/api/seller/brands") data = [{ id: 1, name: "Brand", description: "Описание магазина", wordmarkUrl: "/icons/like.svg" }];
  else if (url.pathname === "/api/seller/onboarding-status") data = { applicationCompleted: true, brandCompleted: true, legalCompleted: true, agreementAccepted: true, progress: 100, completedSteps: 4, totalSteps: 4 };
  else if (url.pathname === "/api/seller/products/list" || url.pathname === "/api/seller/orders/list" || url.pathname === "/api/seller/finance/payouts" || url.pathname === "/api/seller/finance/operations") data = { content: [], totalElements: 0, totalPages: 0, number: 0 };
  else if (url.pathname === "/api/seller/dashboard/tasks") data = { content: [], hasNext: false, number: 0 };
  else if (url.pathname === "/api/seller/dashboard-summary") data = { activeProducts: 0, attentionProducts: 0, totalProducts: 0, readyOrders: 0, activeOrders: 0, totalOrders: 0, availablePayout: 0, processingPayout: 0, inPayoutAmount: 0, failedPayouts: 0, telegramLinked: false, supportTelegramUrl: null, recentEvents: [] };
  else if (url.pathname === "/api/cart") data = { items: [] };
  respond(response, data);
});

async function main() {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(19653, "127.0.0.1", resolve); });
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "13053"], {
    cwd: path.resolve(__dirname, ".."), windowsHide: true,
    env: { ...process.env, RCM_TEST_DIST_DIR: "build/seller-returns-worklist-check", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "", browser;
  child.stdout.on("data", data => { logs += data; });
  child.stderr.on("data", data => { logs += data; });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      if (child.exitCode !== null) throw new Error("Next exited: " + logs);
      try { await fetch(origin + "/seller/returns", { signal: AbortSignal.timeout(2000) }); ready = true; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    assert(ready, "Isolated Next server starts");
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : { channel: "msedge" }) });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const worklist = page.locator("section").filter({ has: page.getByRole("heading", { name: "Возвраты", level: 1, exact: true }) }).last();
    const rows = worklist.locator('article[id^="return-"]:visible');
    const filters = worklist.getByRole("radiogroup", { name: "Состояние возвратов", exact: true });
    async function rowCount(count) {
      await page.waitForFunction(expected => [...document.querySelectorAll('article[id^="return-"]')].filter(element => element.getClientRects().length).length === expected, count);
      assert.equal(await rows.count(), count);
    }
    async function group(label, value, count) {
      await filters.getByRole("radio", { name: label, exact: true }).click();
      await page.waitForURL(url => url.searchParams.get("group") === value);
      await rowCount(count);
      assert.equal(await filters.getByRole("radio", { name: label, exact: true }).getAttribute("aria-checked"), "true");
    }
    const searchTrigger = page.getByRole("button", { name: "Поиск возвратов", exact: true });
    const searchPanel = page.getByRole("dialog", { name: "Поиск возвратов", exact: true });
    const search = searchPanel.getByPlaceholder("Номер возврата, заказа или товар");

    await page.goto(origin + "/seller/returns");
    await page.getByRole("heading", { name: "Возвраты", level: 1, exact: true }).waitFor();
    await worklist.locator('[data-ui="section-loader"]').waitFor();
    assert.equal(await rows.count(), 0);
    assert.equal(await page.getByText("У вас пока нет возвратов", { exact: true }).count(), 0, "Pending list is not a fake empty state");
    await page.waitForFunction(() => document.querySelector('[data-ui="section-loader"]') !== null);
    await waitPending();
    release(503);
    await worklist.getByRole("alert").filter({ hasText: "Не удалось загрузить возвраты" }).waitFor();
    assert.equal(await page.getByText("private upstream failure", { exact: false }).count(), 0);
    for (const failure of ["404", "malformed"]) {
      await worklist.getByRole("button", { name: "Повторить", exact: true }).click();
      await worklist.locator('[role="alert"][aria-busy="true"]').waitFor();
      await waitPending();
      release(failure === "404" ? 404 : 200, failure === "malformed" ? { content: [], number: 0 } : undefined);
      await worklist.locator('[role="alert"]:not([aria-busy="true"])').waitFor();
      assert.equal(await rows.count(), 0);
      assert.equal(await page.getByText("У вас пока нет возвратов", { exact: true }).count(), 0, failure + " does not become an empty list");
    }
    await worklist.getByRole("button", { name: "Повторить", exact: true }).click();
    await worklist.locator('[role="alert"][aria-busy="true"]').waitFor();
    await waitPending();
    listMode = "ok"; release();
    await rowCount(20);
    await worklist.getByRole("alert").waitFor({ state: "detached" });

    await group("В работе", "active", 15);
    await group("Требуют проверки", "inspection", 1);
    await group("Завершены", "completed", 4);
    await group("Все", null, 20);
    await filters.getByRole("radio", { name: "Все", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForURL(url => url.searchParams.get("group") === "active");
    await rowCount(15);
    await group("Все", null, 20);

    await searchTrigger.click();
    await searchPanel.waitFor();
    assert.equal(await search.evaluate(element => element === document.activeElement), true, "Search autofocus");
    await search.fill("нет совпадений");
    await page.getByText("Возвраты не найдены", { exact: true }).waitFor();
    await search.fill("CDEK67");
    await page.waitForURL(url => url.searchParams.get("q") === "CDEK67");
    await rowCount(1);
    await page.keyboard.press("Escape");
    await searchPanel.waitFor({ state: "hidden" });
    assert.equal(await searchTrigger.evaluate(element => element === document.activeElement), true, "Search Escape restores trigger focus");
    await group("Требуют проверки", "inspection", 1);
    await page.reload();
    await rowCount(1);
    assert.equal(new URL(page.url()).searchParams.get("q"), "CDEK67");
    assert.equal(new URL(page.url()).searchParams.get("group"), "inspection");
    assert.equal(await filters.getByRole("radio", { name: "Требуют проверки", exact: true }).getAttribute("aria-checked"), "true");
    const returnLink = page.getByRole("link", { name: "Открыть возврат №67", exact: true });
    assert.equal(await returnLink.getAttribute("href"), "/seller/returns/67", "Rows retain direct URLs");
    await returnLink.click();
    const details = page.getByRole("dialog");
    await details.waitFor();
    await details.getByRole("heading", { name: "Товар возврата RECEIVED", exact: true }).waitFor();
    assert.match(page.url(), /\/seller\/returns\/67$/);
    await page.keyboard.press("Escape");
    await details.waitFor({ state: "detached" });
    await rowCount(1);
    assert.equal(new URL(page.url()).searchParams.get("q"), "CDEK67");
    assert.equal(new URL(page.url()).searchParams.get("group"), "inspection");
    await page.getByRole("link", { name: "Заказы", exact: true }).last().click();
    await page.waitForURL(url => url.pathname === "/seller/orders");
    await page.goBack();
    await rowCount(1);
    assert.equal(new URL(page.url()).searchParams.get("q"), "CDEK67", "Back retains list search");
    assert.equal(new URL(page.url()).searchParams.get("group"), "inspection");
    await searchTrigger.click();
    await searchPanel.waitFor();
    assert.equal(await search.inputValue(), "CDEK67");
    await search.fill("");
    await page.waitForURL(url => !url.searchParams.has("q"));
    await page.keyboard.press("Escape");
    await group("Все", null, 20);

    await page.getByRole("button", { name: "Показать ещё", exact: true }).click();
    await worklist.getByRole("alert").filter({ hasText: "Не удалось загрузить следующие возвраты" }).waitFor();
    assert.equal(await rows.count(), 20, "Pagination error preserves confirmed rows");
    nextPageMode = "hold";
    await worklist.getByRole("button", { name: "Повторить", exact: true }).click();
    await worklist.locator('[role="alert"][aria-busy="true"]').waitFor();
    assert.equal(await rows.count(), 20, "Pagination retry preserves confirmed rows while pending");
    await waitPending();
    nextPageMode = "ok"; release();
    await rowCount(21);
    assert.equal(await page.locator("#return-60").count(), 1, "Duplicate page item is not appended twice");
    assert.equal(await page.getByRole("button", { name: "Показать ещё", exact: true }).count(), 0);
    assert.equal(await worklist.getByRole("alert").count(), 0);
    fs.mkdirSync(path.resolve("build/order-worklist-screenshots"), { recursive: true });
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "No returns overflow at " + width);
      await page.screenshot({ path: `build/order-worklist-screenshots/returns-${width}.png`, fullPage: true });
      await searchTrigger.click();
      await searchPanel.waitFor();
      const panelBox = await searchPanel.boundingBox();
      assert(panelBox.x >= 0 && panelBox.x + panelBox.width <= width, "Search popover fits at " + width);
      await page.keyboard.press("Escape");
    }
    const direct = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    direct.setDefaultTimeout(15000);
    await direct.goto(origin + "/seller/returns/60");
    await direct.getByRole("heading", { name: "Возврат №60", level: 1, exact: true }).waitFor();
    await direct.getByRole("heading", { name: "Товар возврата SUBMITTED", exact: true }).waitFor();
    await direct.close();
    assert.deepEqual(errors, []);
    assert(calls.every(call => ["GET", "OPTIONS"].includes(call.method)), "Only read requests are made");
    console.log("PASS: 13 real return statuses/4 groups, search popover focus/Escape/empty, q/group refresh/Back/detail URLs, initial loading/503/404/malformed/retry, pagination error preserves data/retry/dedup, 1280/390/320 overflow and popover fit; mock API only");
  } catch (error) {
    console.error(logs.slice(-4000));
    throw error;
  } finally {
    if (browser) await browser.close();
    release(503);
    if (child.pid && child.exitCode === null) {
      if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
      else child.kill();
    }
    server.closeAllConnections(); server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
