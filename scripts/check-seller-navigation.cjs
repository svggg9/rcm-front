/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
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
  else if (url.pathname === "/api/seller/brands") data = [{ id: 1, name: "Brand", description: "Описание магазина", wordmarkUrl: "/icons/like.svg" }];
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
  else if (url.pathname === "/api/seller/finance/summary") data = { availableAmount: 0, processingAmount: 0, inPayoutAmount: 0, failedPayoutAmount: 0, nextPayoutAmount: 0, reconciliationDifference: 0, operations: [], payouts: [], nextPayout: null, nextPayoutDate: null, bankDetailsReady: true, paidThisMonthAmount: 0, estimatedBalance: 0, salesAmount: 0, commissionAmount: 0, adjustmentsAmount: 0, paidOutAmount: 0 };
  else if (url.pathname === "/api/seller/finance/payouts") data = { content: [], totalElements: 0, totalPages: 0, number: 0 };
  else if (url.pathname === "/api/seller/finance/operations") data = { content: [{ id: 900, type: "SALE", direction: "CREDIT", amount: 500, grossAmount: 500, commissionAmount: 0, currency: "RUB", createdAt: "2026-10-22T10:00:00Z" }], totalElements: 21, totalPages: 2, number: Number(url.searchParams.get("page") || 0) };
  else if (url.pathname === "/api/seller/dashboard-summary") data = { activeProducts: 0, attentionProducts: 0, totalProducts: 0, readyOrders: 0, activeOrders: 0, totalOrders: 0, estimatedBalance: 0, salesAmount: 0, commissionAmount: 0, availablePayout: 0, processingPayout: 0, inPayoutAmount: 0, failedPayouts: 0, telegramLinked: false, supportTelegramUrl: null, recentEvents: [] };
  else if (url.pathname === "/api/cart") data = { items: [] };
  res.end(JSON.stringify(data));
});

async function assertAlignedNavigation(navigation, label, required = true) {
  const geometry = await navigation.evaluate(node => {
    const container = node.getBoundingClientRect();
    const links = Array.from(node.querySelectorAll("a"), link => link.getBoundingClientRect());
    return {
      containerLeft: container.left,
      containerWidth: container.width,
      left: Math.min(...links.map(link => link.left)),
      right: Math.max(...links.map(link => link.right)),
    };
  });
  const fits = geometry.right - geometry.left <= geometry.containerWidth + 1;
  if (required) assert.ok(fits, `${label}: all links should fit inside their navigation container`);
  if (fits) {
    assert.ok(Math.abs(geometry.left - geometry.containerLeft) <= 1,
      `${label}: links should start at their navigation container's left edge`);
  }
  assert.equal(await navigation.locator('[data-seller-attention]').count(), 0, `${label}: navigation does not contain counters`);
  const active = navigation.locator('[aria-current="page"]');
  assert.equal(await active.evaluate(node => {
    const underline = getComputedStyle(node, "::after");
    const box = getComputedStyle(node);
    return underline.content !== "none" && Number.parseFloat(underline.height) === 2
      && box.backgroundColor === "rgba(0, 0, 0, 0)";
  }), true, `${label}: the active link has a thin underline and no filled background`);
}

async function assertLinkVisible(page, link, label) {
  const handle = await link.elementHandle();
  try {
    await page.waitForFunction(node => {
      const navigation = node.closest("nav");
      if (!navigation) return false;
      const container = navigation.getBoundingClientRect();
      const item = node.getBoundingClientRect();
      return item.width > 0 && item.left >= container.left - 1 && item.right <= container.right + 1;
    }, handle);
  } finally { await handle.dispose(); }
  assert.equal(await link.evaluate(node => {
    const container = node.closest("nav").getBoundingClientRect();
    const item = node.getBoundingClientRect();
    return item.left >= container.left - 1 && item.right <= container.right + 1;
  }), true, `${label}: the complete link should be visible inside the horizontal scroller`);
}

async function assertKeyboardNavigation(page, navigation, label, startAtLast = false) {
  const links = navigation.getByRole("link");
  const count = await links.count();
  const sourceScroll = await page.evaluate(() => scrollY);
  await links.nth(startAtLast ? count - 1 : 0).focus();
  assert.equal(await page.evaluate(() => scrollY), sourceScroll, `${label}: initial focus must preserve page scroll`);
  if (startAtLast) {
    for (let index = count - 2; index >= 0; index--) {
      await page.keyboard.press("Shift+Tab");
      assert.equal(await links.nth(index).evaluate(node => node === document.activeElement), true,
        `${label}: Shift+Tab should follow link order`);
      await assertLinkVisible(page, links.nth(index), `${label}, previous link ${index + 1}`);
      assert.equal(await page.evaluate(() => scrollY), sourceScroll, `${label}: revealing a link must preserve page scroll`);
    }
  }
  for (let index = 1; index < count; index++) {
    await page.keyboard.press("Tab");
    assert.equal(await links.nth(index).evaluate(node => node === document.activeElement), true,
      `${label}: Tab should follow link order`);
    await assertLinkVisible(page, links.nth(index), `${label}, next link ${index + 1}`);
    assert.equal(await page.evaluate(() => scrollY), sourceScroll, `${label}: keyboard focus must preserve page scroll`);
  }
  assert.equal(await links.last().evaluate(node => {
    const style = getComputedStyle(node);
    return node.matches(":focus-visible") && style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) >= 1;
  }), true, `${label}: keyboard focus must have a visible outline`);
}

async function saveNavigationScreenshot(page, width) {
  const navigation = page.getByRole("navigation", { name: "Подразделы кабинета" });
  const box = await navigation.boundingBox();
  const directory = path.resolve(__dirname, "../build/navigation-screenshots");
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, `seller-navigation-${width}.png`),
    clip: { x: 0, y: 0, width, height: Math.ceil(box.y + box.height + 12) },
  });
}

async function main() {
  await new Promise(resolve => server.listen(19640, "127.0.0.1", resolve));
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "13040"], {
    cwd: require("node:path").resolve(__dirname, ".."), windowsHide: true,
    env: { ...process.env, RCM_TEST_DIST_DIR: "build/navigation-check", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin }, stdio: ["ignore", "pipe", "pipe"]
  });
  let logs = ""; child.stdout.on("data", d => { logs += d; }); child.stderr.on("data", d => { logs += d; });
  let browser;
  let page;
  const errors = [];
  try {
    for (let i = 0; i < 120; i++) {
      if (child.exitCode != null) throw new Error("Test Next server exited: " + logs);
      try { await fetch(origin + "/seller/returns/60", { signal: AbortSignal.timeout(2000) }); break; } catch { await new Promise(r => setTimeout(r, 500)); }
    }
    browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : { headless: true, channel: "msedge" });
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    fs.mkdirSync(path.resolve(__dirname, "../build/navigation-screenshots"), { recursive: true });
    page.on("pageerror", e => errors.push(e.message));
    const sections = [
      { path: "/seller/home", label: "Обзор магазина" }, { path: "/seller/products", label: "Товары" },
      { path: "/seller/orders", label: "Заказы" }, { path: "/seller/returns", label: "Заказы", activePath: "/seller/orders", secondary: "Возвраты" },
      { path: "/seller/finance", label: "Финансы" }, { path: "/seller/store", label: "Магазин" },
      { path: "/seller/legal", label: "Данные и документы" },
    ];
    const permanentSubsections = [
      ["Главная", "/seller/home"], ["Товары", "/seller/products"],
      ["Подборки", "/seller/products?section=collections"], ["Заказы", "/seller/orders"],
      ["Возвраты", "/seller/returns"], ["Финансы", "/seller/finance"],
      ["Магазин", "/seller/store"], ["Данные и документы", "/seller/legal"],
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
      assert.equal(await page.getByRole("navigation", { name: "Меню продавца" }).count(), 1, "One primary navigation in the header");
      assert.equal(await page.getByRole("navigation", { name: "Подразделы кабинета" }).count(), 1, "One contextual navigation in the header");
      const subsections = page.getByRole("navigation", { name: "Подразделы кабинета" });
      assert.deepEqual(await subsections.getByRole("link").evaluateAll(links => links.map(link => [link.textContent, link.getAttribute("href")])), permanentSubsections,
        "All subsection links stay present in the same order on every seller route");
      assert.equal(await subsections.locator('[aria-current="page"]').count(), 1, "Exactly one active subsection on every seller route");
      assert.equal(await subsections.locator('[aria-current="page"]').getAttribute("href"), section.path);
      assert.equal(await page.locator('[data-seller-content] nav[aria-label="Меню продавца"], [data-seller-content] nav[aria-label="Подразделы кабинета"]').count(), 0, "No duplicate header navigation in page content");
      await page.reload();
      assert.equal(await navigation.locator('[aria-current="page"]').getAttribute("href"), section.activePath ?? section.path,
        `Reload should preserve ${section.path}`);
    }
    for (const [legacy, canonical] of [["/seller", "/seller/home"], ["/seller?tab=products&section=collections", "/seller/products?section=collections"],
      ["/seller?tab=orders", "/seller/orders"], ["/seller?tab=finance&view=payouts", "/seller/finance?view=payouts"],
      ["/seller?tab=finance&view=operations&orderId=10", "/seller/finance?view=operations&orderId=10"]]) {
      await page.goto(origin + legacy);
      await page.waitForURL(url => url.pathname + url.search === canonical);
      assert.equal(page.url().replace(origin, ""), canonical, `Legacy route ${legacy} should redirect to ${canonical}`);
    }
    for (const [route, primary] of [["/seller/products?section=collections", "/seller/products"],
      ["/seller/finance?view=operations", "/seller/finance"], ["/seller/finance?view=payouts", "/seller/finance"],
      ["/seller/finance?view=operations&orderId=10", "/seller/finance"]]) {
      await page.goto(origin + route);
      const primaryNavigation = page.getByRole("navigation", { name: "Меню продавца" });
      const secondaryNavigation = page.getByRole("navigation", { name: "Подразделы кабинета" });
      await primaryNavigation.waitFor();
      assert.equal(await primaryNavigation.locator('[aria-current="page"]').getAttribute("href"), primary);
      const secondaryHref = route.startsWith("/seller/finance") ? "/seller/finance" : route;
      assert.equal(await secondaryNavigation.locator('[aria-current="page"]').getAttribute("href"), secondaryHref);
      assert.deepEqual(await secondaryNavigation.getByRole("link").evaluateAll(links => links.map(link => [link.textContent, link.getAttribute("href")])), permanentSubsections);
      if (route.startsWith("/seller/finance")) {
        const label = route.includes("operations") ? "Операции" : "Выплаты";
        assert.equal(await page.getByRole("tablist", { name: "Разделы финансов" }).getByRole("tab", { name: label, exact: true }).getAttribute("aria-selected"), "true");
      }
      await page.reload();
      assert.equal(await secondaryNavigation.locator('[aria-current="page"]').getAttribute("href"), secondaryHref, "Refresh keeps the selected permanent subsection");
    }
    await page.goto(origin + "/seller/finance");
    await page.getByRole("heading", { name: "Финансы", exact: true }).waitFor();
    const financeTabs = page.getByRole("tablist", { name: "Разделы финансов" });
    await financeTabs.getByRole("tab", { name: "Операции", exact: true }).click();
    await page.waitForURL(origin + "/seller/finance?view=operations");
    await page.getByRole("heading", { name: "Операции", exact: true }).waitFor();
    await page.getByLabel("Номер заказа", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Показать", exact: true }).click();
    await page.waitForURL(origin + "/seller/finance?view=operations&orderId=10");
    await page.getByRole("navigation", { name: "Страницы финансов" }).getByRole("link", { name: "Далее", exact: true }).click();
    await page.waitForURL(origin + "/seller/finance?view=operations&orderId=10&page=1");
    assert.equal(await page.getByRole("dialog").count(), 0, "Finance pagination with orderId must not open an order panel");
    await financeTabs.getByRole("tab", { name: "Выплаты", exact: true }).click();
    await page.waitForURL(origin + "/seller/finance?view=payouts");
    await page.getByRole("heading", { name: "Выплаты", exact: true }).waitFor();
    await page.goBack();
    await page.waitForURL(origin + "/seller/finance?view=operations&orderId=10&page=1");
    assert.equal(await page.getByLabel("Номер заказа", { exact: true }).inputValue(), "10", "Back restores finance view and operation filters");
    await page.reload();
    assert.equal(await financeTabs.getByRole("tab", { name: "Операции", exact: true }).getAttribute("aria-selected"), "true");
    assert.equal(await page.getByLabel("Номер заказа", { exact: true }).inputValue(), "10");
    assert.equal(calls.filter(p => p === "/api/seller/orders/10").length, 0, "Finance order filter must not load order details");
    await financeTabs.getByRole("tab", { name: "Обзор", exact: true }).click();
    await page.waitForURL(origin + "/seller/finance");
    await page.getByRole("heading", { name: "Обзор финансов", exact: true }).waitFor();
    await page.screenshot({ path: "build/navigation-screenshots/finance-1280.png", fullPage: true });
    await page.goto(origin + "/seller/home");
    const permanentNavigation = page.getByRole("navigation", { name: "Подразделы кабинета" });
    await permanentNavigation.getByRole("link", { name: "Возвраты", exact: true }).click();
    await page.waitForURL(origin + "/seller/returns");
    assert.equal(await permanentNavigation.locator('[aria-current="page"]').getAttribute("href"), "/seller/returns");
    await page.goBack();
    await page.waitForURL(origin + "/seller/home");
    assert.equal(await permanentNavigation.locator('[aria-current="page"]').getAttribute("href"), "/seller/home", "Back restores the active subsection");
    assert.deepEqual(errors, [], "Every canonical route and legacy redirect should render without browser errors");
    console.log("PASS: all seven seller routes open directly and after reload with the seller header and correct active section");
    console.log("PASS: root and legacy tab URLs redirect to canonical routes while preserving section/view parameters");

    for (const section of ["/seller/products", "/seller/orders", "/seller/finance?view=payouts"]) {
      await page.goto(origin + section);
      await page.waitForLoadState("networkidle");
      assert.deepEqual(errors, [], `Seller navigation route ${section} should render without browser errors`);
      await assertAlignedNavigation(page.getByRole("navigation", { name: "Меню продавца" }), `Primary navigation on ${section}`);
      await assertAlignedNavigation(page.getByRole("navigation", { name: "Подразделы кабинета" }), `Secondary navigation on ${section}`);
    }
    await saveNavigationScreenshot(page, 1280);

    await page.goto(origin + "/seller/legal");
    await page.waitForLoadState("networkidle");
    const resizedDocuments = page.getByRole("navigation", { name: "Меню продавца" })
      .getByRole("link", { name: "Данные и документы", exact: true });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await resizedDocuments.getAttribute("aria-current"), "page");
      await assertLinkVisible(page, resizedDocuments, `Documents section after resizing from desktop to ${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(origin + "/seller/legal");
      await page.waitForLoadState("networkidle");
      const primary = page.getByRole("navigation", { name: "Меню продавца" });
      const active = primary.getByRole("link", { name: "Данные и документы", exact: true });
      await assertLinkVisible(page, active, `Active documents section at ${width}`);
      assert.equal(await primary.evaluate(node => node.scrollWidth > node.clientWidth), true,
        `Primary navigation at ${width} should scroll instead of shrinking its links`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.reload();
      await page.waitForLoadState("networkidle");
      assert.equal(await active.getAttribute("aria-current"), "page");
      await assertLinkVisible(page, active, `Reloaded documents section at ${width}`);
      await page.evaluate(() => scrollTo(0, 24));
      assert.equal(await page.evaluate(() => scrollY), 24, "Use a nonzero page scroll position when checking horizontal focus reveal");
      await assertKeyboardNavigation(page, primary, `Primary navigation at ${width}`, true);

      await page.goto(origin + "/seller/finance?view=payouts");
      await page.waitForLoadState("networkidle");
      const secondary = page.getByRole("navigation", { name: "Подразделы кабинета" });
      const finance = secondary.getByRole("link", { name: "Финансы", exact: true });
      assert.equal(await finance.getAttribute("aria-current"), "page");
      await assertLinkVisible(page, finance, `Combined finance subsection at ${width}`);
      await assertAlignedNavigation(secondary, `Finance subsections at ${width}`, false);
      await page.reload();
      await page.waitForLoadState("networkidle");
      await assertLinkVisible(page, finance, `Reloaded combined finance subsection at ${width}`);
      const tabs = page.getByRole("tablist", { name: "Разделы финансов" });
      await tabs.getByRole("tab", { name: "Выплаты", exact: true }).focus();
      await page.keyboard.press("Home");
      await page.waitForURL(origin + "/seller/finance");
      await page.keyboard.press("ArrowRight");
      await page.waitForURL(origin + "/seller/finance?view=operations");
      await page.getByRole("heading", { name: "Операции", exact: true }).waitFor();
      assert.equal(await tabs.getByRole("tab", { name: "Операции", exact: true }).evaluate(node => node === document.activeElement), true);
      await page.keyboard.press("End");
      await page.waitForURL(origin + "/seller/finance?view=payouts");
      await page.getByRole("heading", { name: "Выплаты", exact: true }).waitFor();
      await page.screenshot({ path: `build/navigation-screenshots/finance-${width}.png`, fullPage: true });
      await assertKeyboardNavigation(page, secondary, `Secondary navigation at ${width}`, true);
      await page.evaluate(() => document.activeElement.blur());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await saveNavigationScreenshot(page, width);
    }
    console.log("PASS: seller header navigation starts at its left edge with active underlines and no counters; active/edge links, keyboard focus and unchanged page scroll at 390/320; navigation screenshots saved");
    console.log("PASS: one finance navigation item, internal views, operation filters/back/reload and finance keyboard tabs at 1280/390/320");
    if (process.argv.includes("--navigation-only")) return;

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(origin + "/seller/orders");
    await page.waitForLoadState("networkidle");
    const search = page.getByPlaceholder("Номер заказа, товар или получатель");
    await search.fill("Тестовый");
    await page.getByText("Ещё 1 товар", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Ещё 1 товар", exact: true }).count(), 0, "List composition must not expand inline");
    assert.match(page.url(), /\/seller\/orders$/, "Summary must not navigate");
    assert.equal(calls.filter(p => p === "/api/seller/orders/10").length, 0, "No speculative detail requests");
    const openOrder = page.getByRole("link", { name: /Открыть заказ|Подготовить отправку заказа/ });
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
  } catch (e) { console.error(logs.slice(-4000)); if (errors.length) console.error("Browser errors:", errors); if (page) console.error(await page.locator('body').innerText()); throw e; }
  finally { if (browser) await browser.close(); child.kill(); server.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
