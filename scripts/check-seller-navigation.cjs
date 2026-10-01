/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression runner. */
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const origin = "http://localhost:13040";
const api = "http://localhost:19640";
const calls = [];
const item = { productId: 1, variantId: 1, productTitle: "Тестовый товар", brandName: "Бренд", quantity: 1, price: 500, lineTotal: 500, imageUrl: null, size: "M", color: "Чёрный" };
const order = { id: 10, orderGroupId: "test", status: "PROCESSING", paymentStatus: "PAID", deliveryStatus: "READY_FOR_SHIPMENT", createdAt: "2026-09-19T10:00:00Z", totalAmount: 500, subtotalAmount: 500, deliveryAmount: 0, discountAmount: 0, currency: "RUB", recipientName: "Тест", items: [item], firstProductTitle: item.productTitle, itemsCount: 1, delivery: null };
order.productTitles = [item.productTitle, "Второй товар", "Третий товар"];
let request = { id: 60, orderId: 10, productId: 1, variantId: 1, productTitle: item.productTitle, quantity: 1, reason: "DEFECT", comment: "Комментарий покупателя", status: "RECEIVED", photoUrls: [], requestedAmount: 500, approvedRefundAmount: null, sellerComment: null, resellable: null, createdAt: "2026-09-19T10:00:00Z", updatedAt: "2026-09-19T10:00:00Z" };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, api);
  calls.push(url.pathname);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end();
  let data = [];
  if (url.pathname === "/api/auth/session") data = { id: 70, username: "seller", role: "SELLER" };
  else if (url.pathname === "/api/seller/brands") data = [{ id: 1, name: "Brand" }];
  else if (url.pathname === "/api/seller/onboarding-status") data = { applicationCompleted: true, brandCompleted: true, legalCompleted: true, agreementAccepted: true, progress: 100, completedSteps: 4, totalSteps: 4 };
  else if (url.pathname === "/api/seller/products/list") data = { content: [], totalElements: 0, totalPages: 0, number: 0 };
  else if (url.pathname === "/api/seller/orders/list") data = { content: [order], totalElements: 1, totalPages: 1, number: 0 };
  else if (url.pathname === "/api/seller/orders/10") data = order;
  else if (url.pathname === "/api/seller/returns/list") data = { content: [request], totalElements: 1, totalPages: 1, number: 0 };
  else if (url.pathname === "/api/seller/returns/60") data = request;
  else if (url.pathname === "/api/seller/returns/60/inspect") {
    let body = ""; for await (const chunk of req) body += chunk;
    const values = JSON.parse(body);
    request = { ...request, status: "INSPECTED", approvedRefundAmount: values.acceptedRefundAmount, sellerComment: values.comment, resellable: values.resellable };
    data = request;
  } else if (url.pathname === "/api/seller/dashboard/tasks") data = { content: [], hasNext: false, number: 0 };
  else if (url.pathname === "/api/seller/finance/summary") data = { availableAmount: 0, processingAmount: 0, inPayoutAmount: 0, failedPayoutAmount: 0, nextPayoutAmount: 0, reconciliationDifference: 0, operations: [], nextPayout: null, nextPayoutDate: null, bankDetailsReady: true, paidThisMonthAmount: 0, estimatedBalance: 0, salesAmount: 0, commissionAmount: 0, adjustmentsAmount: 0, paidOutAmount: 0 };
  else if (url.pathname === "/api/seller/dashboard-summary") data = { activeProducts: 0, attentionProducts: 0, totalProducts: 0, readyOrders: 0, activeOrders: 0, totalOrders: 0, estimatedBalance: 0, salesAmount: 0, commissionAmount: 0, availablePayout: 0, processingPayout: 0, inPayoutAmount: 0, failedPayouts: 0, telegramLinked: false, supportTelegramUrl: null, recentEvents: [] };
  else if (url.pathname === "/api/cart") data = { items: [] };
  res.end(JSON.stringify(data));
});
async function main() {
  await new Promise(resolve => server.listen(19640, "127.0.0.1", resolve));
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "13040"], {
    cwd: require("node:path").resolve(__dirname, ".."), windowsHide: true,
    env: { ...process.env, RCM_TEST_DIST_DIR: "build/navigation-check", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin }, stdio: ["ignore", "pipe", "pipe"]
  });
  let logs = ""; child.stdout.on("data", d => { logs += d; }); child.stderr.on("data", d => { logs += d; });
  let browser;
  let page;
  try {
    for (let i = 0; i < 120; i++) {
      if (child.exitCode != null) throw new Error("Test Next server exited: " + logs);
      try { await fetch(origin + "/seller/returns/60", { signal: AbortSignal.timeout(2000) }); break; } catch { await new Promise(r => setTimeout(r, 500)); }
    }
    browser = await chromium.launch({ headless: true, channel: "msedge" });
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    const sections = [
      { path: "/seller/home", label: "Обзор" }, { path: "/seller/products", label: "Каталог" },
      { path: "/seller/orders", label: "Заказы" }, { path: "/seller/returns", label: "Заказы", activePath: "/seller/orders", secondary: "Возвраты" },
      { path: "/seller/finance", label: "Финансы" }, { path: "/seller/store", label: "Магазин" },
      { path: "/seller/legal", label: "Данные и документы" },
    ];
    for (const section of sections) {
      await page.goto(origin + section.path);
      const navigation = page.getByRole("navigation", { name: "Меню продавца" });
      await navigation.waitFor();
      await navigation.getByRole("link", { name: section.label, exact: true }).waitFor();
      assert.equal(await navigation.locator('[aria-current="page"]').getAttribute("href"), section.activePath ?? section.path,
        `Direct route ${section.path} should mark its seller section active`);
      if (section.secondary) {
        const secondary = page.getByRole("navigation", { name: "Подразделы кабинета" });
        assert.equal(await secondary.getByRole("link", { name: section.secondary, exact: true }).getAttribute("aria-current"), "page");
      }
      assert.match(await page.locator("header").first().innerText(), /Для продавцов/);
      await page.reload();
      assert.equal(await navigation.locator('[aria-current="page"]').getAttribute("href"), section.activePath ?? section.path,
        `Reload should preserve ${section.path}`);
    }
    for (const [legacy, canonical] of [["/seller", "/seller/home"], ["/seller?tab=products&section=collections", "/seller/products?section=collections"],
      ["/seller?tab=orders", "/seller/orders"], ["/seller?tab=finance&view=payouts", "/seller/finance?view=payouts"]]) {
      await page.goto(origin + legacy);
      await page.waitForURL(url => url.pathname + url.search === canonical);
      assert.equal(page.url().replace(origin, ""), canonical, `Legacy route ${legacy} should redirect to ${canonical}`);
    }
    assert.deepEqual(errors, [], "Every canonical route and legacy redirect should render without browser errors");
    console.log("PASS: all seven seller routes open directly and after reload with the seller header and correct active section");
    console.log("PASS: root and legacy tab URLs redirect to canonical routes while preserving section/view parameters");
    await page.goto(origin + "/seller/orders");
    await page.waitForLoadState("networkidle");
    const search = page.getByPlaceholder("Номер заказа, товар или получатель");
    await search.fill("Тестовый");
    await page.getByRole("button", { name: "Ещё 1 товар", exact: true }).click();
    await page.getByText("Третий товар", { exact: true }).waitFor();
    assert.match(page.url(), /\/seller\/orders$/, "Inner action must not navigate");
    assert.equal(calls.filter(p => p === "/api/seller/orders/10").length, 0, "No speculative detail requests");
    const openOrder = page.getByRole("link", { name: /Открыть заказ/ });
    await openOrder.scrollIntoViewIfNeeded();
    const sourceScroll = await page.evaluate(() => scrollY);
    const originalSearchNode = await search.elementHandle();
    const sellerHeaderNode = await page.getByText("Для продавцов", { exact: true }).elementHandle();
    const headerBoxBefore = await page.locator("header").first().boundingBox();
    const brandRequestsBefore = calls.filter(p => p === "/api/seller/brands").length;
    const listRequestsBefore = calls.filter(p => p === "/api/seller/orders/list").length;
    const routeRequests = [];
    const observeRoute = req => {
      if (req.url().startsWith(origin + "/seller") && (req.isNavigationRequest() || req.headers().rsc === "1")) routeRequests.push(req.url());
    };
    page.on("request", observeRoute);
    let releaseDetails;
    const detailGate = new Promise(resolve => { releaseDetails = resolve; });
    await page.route(api + "/api/seller/orders/10", async route => { await detailGate; await route.continue(); });
    const titleBox = await page.getByText("Тестовый товар", { exact: true }).boundingBox();
    await page.mouse.click(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2);
    await page.getByRole("dialog").waitFor({ timeout: 1500 });
    assert.equal(await originalSearchNode.evaluate(node => node.isConnected), true, "Background DOM must stay mounted");
    assert.equal(await sellerHeaderNode.evaluate(node => node.isConnected), true, "Seller header must not be replaced by buyer header");
    assert.equal((await page.locator("header").first().boundingBox()).height, headerBoxBefore.height);
    assert.equal(await search.inputValue(), "Тестовый");
    assert.equal(calls.filter(p => p === "/api/seller/orders/list").length, listRequestsBefore);
    assert.deepEqual(routeRequests, [], "Opening must not navigate/fetch a server route");
    releaseDetails();
    await page.getByRole("dialog").getByText("Тестовый товар", { exact: true }).waitFor();
    await page.getByRole("heading", { name: "Заказ №10", exact: true }).waitFor();
    assert.match(page.url(), /\/seller\/orders\/10$/);
    await page.getByRole("button", { name: "Закрыть детали", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.equal(await search.inputValue(), "Тестовый");
    assert.equal(await originalSearchNode.evaluate(node => node.isConnected), true);
    assert.equal(await sellerHeaderNode.evaluate(node => node.isConnected), true);
    assert.equal(calls.filter(p => p === "/api/seller/brands").length, brandRequestsBefore, "Closing must not remount/refetch seller header");
    assert.equal(await page.evaluate(() => scrollY), sourceScroll);
    await page.goForward();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.equal(await search.inputValue(), "Тестовый");
    assert.deepEqual(routeRequests, [], "Close/back/forward must not fetch server routes");
    page.off("request", observeRoute);
    await page.goto(origin + "/seller/returns");
    await page.getByRole("link", { name: "Открыть возврат №60" }).waitFor();
    const returnHeaderNode = await page.getByText("Для продавцов", { exact: true }).elementHandle();
    const returnBox = await page.getByText("Возврат №60", { exact: true }).boundingBox();
    await page.mouse.click(returnBox.x + returnBox.width / 2, returnBox.y + returnBox.height / 2);
    await page.getByRole("dialog").waitFor();
    await page.getByLabel("Комментарий по проверке").fill("Черновик");
    assert.equal(await returnHeaderNode.evaluate(node => node.isConnected), true, "Return panel must preserve seller header");
    await page.getByRole("button", { name: "Закрыть детали", exact: true }).click();
    await page.getByRole("heading", { name: "Есть несохранённые изменения" }).waitFor();
    await page.getByRole("button", { name: "Вернуться к редактированию" }).click();
    await page.goBack();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.getByRole("link", { name: "Открыть возврат №60" }).click();
    await page.getByLabel("Комментарий по проверке").waitFor();
    assert.equal(await page.getByLabel("Комментарий по проверке").inputValue(), "Черновик");
    await page.getByRole("button", { name: "Завершить проверку" }).click();
    await page.getByText("Изменения сохранены", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Закрыть детали", exact: true }).click();
    await page.getByText("Товар проверен", { exact: true }).waitFor();
    await page.goto(origin + "/seller/returns/60");
    await page.getByRole("heading", { name: "Возврат №60", exact: true }).waitFor();
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.reload();
    await page.getByText("Результат проверки", { exact: true }).waitFor();
    await page.goto(origin + "/seller/returns?returnId=60");
    await page.getByRole("heading", { name: "Возврат №60", exact: true }).waitFor();
    assert.match(page.url(), /\/seller\/returns\/60$/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/seller/returns");
    await page.getByRole("link", { name: "Открыть возврат №60" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const box = await dialog.boundingBox();
    assert.equal(Math.round(box.width), 390);
    assert.equal(Math.round(box.height), 844);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.setViewportSize({ width: 320, height: 740 });
    assert.equal(Math.round((await dialog.boundingBox()).width), 320);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    assert.ok(calls.filter(p => p === "/api/seller/orders/10").length <= 4, "Only opened order fetched (StrictMode may replay effects)");
    await page.goto(origin + "/about");
    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const header = page.locator("header").first();
      const expectedHeight = width > 640 ? 80 : 64;
      await page.waitForFunction(height => document.querySelector("header")?.getBoundingClientRect().height === height, expectedHeight);
      assert.equal((await header.boundingBox()).height, expectedHeight);
      const profile = header.getByRole("link", { name: "Личный кабинет", exact: true });
      const hitbox = await profile.boundingBox();
      assert.equal(hitbox.width, 44); assert.equal(hitbox.height, 44);
      assert.equal((await profile.locator("svg").boundingBox()).width, width > 640 ? 24 : 22);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width === 1280 || width === 390) await page.screenshot({ path: `build/header-about-${width}.png` });
      await header.getByRole("button", { name: "Открыть меню", exact: true }).click();
      const menu = page.getByRole("dialog", { name: "Меню сайта", exact: true });
      const category = menu.getByRole("button", { name: "Всё", exact: true });
      await category.waitFor();
      assert.equal((await category.boundingBox()).width, Math.min(400, width - 64));
      assert.equal((await category.boundingBox()).height, width > 640 ? 64 : 56);
      assert.equal((await menu.getByRole("button", { name: "Закрыть меню" }).boundingBox()).width, 44);
      await page.keyboard.press("Escape");
      await menu.waitFor({ state: "detached" });
    }
    console.log("PASS: compact public header 1280/768/390/320, proportional icons, 44px touch targets, no horizontal overflow");
    console.log("PASS: immediate local overlay with delayed API; stable background DOM; no RSC/list refetch; URL, close/Escape, filter/scroll, forward/back, draft, inspect/list sync, direct/reload/legacy URL, mobile 320/390");
  } catch (e) { console.error(logs.slice(-4000)); if (page) console.error(await page.locator('body').innerText()); throw e; }
  finally { if (browser) await browser.close(); child.kill(); server.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
