/* eslint-disable @typescript-eslint/no-require-imports -- Browser regression against an already running local frontend. */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

// This runner never starts a server, signs in, or writes application data. API
// search responses are intercepted in the browser; non-GET requests and remote
// network access are blocked. Set RCM_SEARCH_ORIGIN for a different local port.
const origin = process.env.RCM_SEARCH_ORIGIN || "http://localhost:3000";
const edge = process.env.RCM_BROWSER_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const calls = [];
const observed = [];
const product = (id, title, brand = "Тестовый бренд") => ({ id, publicId: null, title, brand, coverImage: null, minPrice: 1200 });
const fixtures = {
  сумка: [product(90001, "Тестовая сумка"), product(90002, "Вторая сумка")],
  старый: [product(90003, "Устаревший ответ")],
  новый: [product(90004, "Новый ответ")],
  состав: [product(90005, "Подсказка после IME")],
  ничего: [],
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(predicate, message, timeout = 7000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await predicate()) return; await delay(40); }
  throw new Error(message);
}
function count(query) { return calls.filter(call => call.q === query).length; }

async function realSmoke() {
  const browser = await chromium.launch({ headless: true, executablePath: edge });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    await context.route("**/*", route => {
      const request = route.request(); const url = new URL(request.url());
      if (!["GET", "HEAD"].includes(request.method()) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return route.abort();
      return route.continue();
    });
    for (const [width, query, expected] of [[1280, "красовки", "Кроссовки Future Rider"], [390, "сума", "Сумка с короткими ручками"]]) {
      const page = await context.newPage();
      await page.setViewportSize({ width, height: 844 });
      page.setDefaultTimeout(12000);
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      await page.locator('button[aria-label="Поиск"]:visible').first().click();
      const input = page.getByRole("combobox", { name: "Поиск товаров" }).filter({ visible: true });
      await input.waitFor({ state: "visible" });
      const response = page.waitForResponse(result => {
        const url = new URL(result.url());
        return url.pathname === "/api/products/page" && url.searchParams.get("q") === query && url.searchParams.get("size") === "5";
      });
      await input.fill(query);
      assert.equal((await response).status(), 200, `Real backend request for ${query}`);
      await page.getByRole("option", { name: new RegExp(expected, "i") }).waitFor();
      await page.close();
    }
    console.log("Live product search: real local backend, desktop and 390px mobile passed");
  } finally { await context.close(); await browser.close(); }
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: edge });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    await context.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === "/api/products/page") observed.push({ origin: url.origin, size: url.searchParams.get("size"), q: url.searchParams.get("q") });
      if (!["GET", "HEAD"].includes(request.method())) return route.abort();
      if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return route.abort();
      if (url.pathname === "/api/products/page" && url.searchParams.get("size") === "5") {
        const q = url.searchParams.get("q") || "";
        calls.push({ q, page: url.searchParams.get("page"), size: url.searchParams.get("size"), at: Date.now() });
        if (q === "старый") await delay(1300);
        try {
          if (q === "ошибка") return await route.fulfill({ status: 503, headers: { "access-control-allow-origin": "*" }, body: "{}" });
          if (q === "неверный") return await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, json: { content: "bad" } });
          const content = fixtures[q] || [];
          return await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, json: { content, totalElements: content.length, totalPages: 1 } });
        } catch { return; } // An intentionally superseded request can already be aborted.
      }
      return route.continue();
    });

    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const browserErrors = [];
    page.on("pageerror", error => browserErrors.push(error.message));
    page.on("console", message => { if (message.type() === "error") browserErrors.push(message.text()); });
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    const input = page.getByRole("combobox", { name: "Поиск товаров" }).filter({ visible: true });
    // The server-rendered control can precede React hydration in Next dev.
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    assert.equal(await input.count(), 0, "Desktop search field must be closed initially");
    const desktopOpen = page.locator('button[aria-label="Поиск"]:visible').first();
    await desktopOpen.click();
    await input.waitFor({ state: "visible" });
    await waitFor(() => input.evaluate(el => document.activeElement === el), "Desktop search field did not receive focus");

    await input.fill("черновик");
    await page.mouse.click(5, 200);
    await input.waitFor({ state: "hidden" });
    await desktopOpen.click();
    await input.waitFor({ state: "visible" });
    await waitFor(() => input.evaluate(el => document.activeElement === el), "Desktop search field did not regain focus");
    assert.equal(await input.inputValue(), "черновик", "Outside click must preserve the search draft");

    await input.fill("а");
    await delay(650);
    assert.equal(count("а"), 0, "One-character query must not request suggestions");
    await input.fill("сумка");
    await delay(200);
    assert.equal(count("сумка"), 0, "A request must not start before debounce");
    await waitFor(() => count("сумка") === 1, "Debounced suggestion request missing").catch(async error => {
      const react = await input.evaluate(el => Object.keys(el).filter(key => key.startsWith("__react")));
      error.message += `; observed: ${JSON.stringify(observed)}; value=${await input.inputValue()} expanded=${await input.getAttribute("aria-expanded")}; react=${JSON.stringify(react)}; browserErrors=${JSON.stringify(browserErrors)}`; throw error;
    });
    const call = calls.find(item => item.q === "сумка");
    assert.equal(call.page, "0"); assert.equal(call.size, "5");
    const list = page.getByRole("listbox", { name: "Подсказки товаров" });
    await list.getByRole("option", { name: /Тестовая сумка/ }).waitFor();
    assert.equal(await input.getAttribute("aria-expanded"), "true");
    assert.equal(await page.evaluate(() => Boolean(document.elementFromPoint(5, 200)?.closest("a,button,input,select,[tabindex]"))), false,
      "Outside-click target must be noninteractive");
    await page.mouse.click(5, 200);
    await input.waitFor({ state: "hidden" });
    await desktopOpen.click();
    await input.waitFor({ state: "visible" });
    assert.equal(await input.inputValue(), "сумка", "Outside click on noninteractive area must preserve draft");
    await list.getByRole("option", { name: /Тестовая сумка/ }).waitFor();
    await input.press("ArrowDown");
    const activeId = await input.getAttribute("aria-activedescendant");
    assert(activeId, "ArrowDown must set aria-activedescendant");
    assert.equal(await page.locator(`[id="${activeId}"]`).getAttribute("aria-selected"), "true");
    await input.press("Escape");
    await input.waitFor({ state: "hidden" });
    await waitFor(() => desktopOpen.evaluate(el => document.activeElement === el), "Escape must restore focus to the search button");
    await desktopOpen.click();
    await input.waitFor({ state: "visible" });
    assert.equal(await input.inputValue(), "сумка", "Escape must preserve the search draft");

    await input.fill("старый");
    await waitFor(() => count("старый") === 1, "Slow request did not start");
    await input.fill("новый");
    await page.getByRole("option", { name: /Новый ответ/ }).waitFor();
    await delay(1500);
    assert.equal(await page.getByText("Устаревший ответ", { exact: true }).count(), 0, "Old response replaced current results");
    assert.equal(await page.getByText("Новый ответ", { exact: true }).isVisible(), true);

    await input.fill("ничего");
    await page.getByText("Товары не найдены", { exact: true }).waitFor();
    await input.fill("ошибка");
    await page.getByText("Не удалось загрузить подсказки", { exact: true }).waitFor();
    await input.fill("неверный");
    await page.getByText("Не удалось загрузить подсказки", { exact: true }).waitFor();

    const longQuery = "а б в г д е ж з и к л";
    await input.fill(longQuery);
    await delay(650);
    assert.equal(count(longQuery), 0, "Invalid query must not request suggestions");
    await input.press("Enter");
    await page.getByText("Не больше 10 разных слов", { exact: true }).waitFor();

    await input.dispatchEvent("compositionstart");
    await input.fill("состав");
    await delay(650);
    assert.equal(count("состав"), 0, "Suggestions must wait until IME composition ends");
    await input.dispatchEvent("compositionend");
    await page.getByRole("option", { name: /Подсказка после IME/ }).waitFor();

    await input.fill("сумка");
    await page.getByRole("option", { name: /Тестовая сумка/ }).waitFor();
    await input.press("ArrowDown");
    await input.press("Enter");
    await page.waitForURL(url => url.pathname === "/product/90001");

    const searchPage = await context.newPage();
    searchPage.setDefaultTimeout(12000);
    await searchPage.goto(origin, { waitUntil: "domcontentloaded" });
    await searchPage.waitForLoadState("networkidle", { timeout: 15000 });
    await searchPage.locator('button[aria-label="Поиск"]:visible').first().click();
    const searchInput = searchPage.getByRole("combobox", { name: "Поиск товаров" }).filter({ visible: true });
    await searchInput.fill("сумка");
    await searchInput.press("Enter");
    await searchPage.waitForURL(url => url.pathname === "/catalog" && url.searchParams.get("q") === "сумка");

    const clickPage = await context.newPage();
    clickPage.setDefaultTimeout(12000);
    await clickPage.goto(origin, { waitUntil: "domcontentloaded" });
    await clickPage.waitForLoadState("networkidle", { timeout: 15000 });
    await clickPage.locator('button[aria-label="Поиск"]:visible').first().click();
    await clickPage.getByRole("combobox", { name: "Поиск товаров" }).filter({ visible: true }).fill("сумка");
    await clickPage.getByRole("option", { name: /Тестовая сумка/ }).click();
    await clickPage.waitForURL(url => url.pathname === "/product/90001");

    const mobile = await context.newPage();
    await mobile.setViewportSize({ width: 390, height: 844 });
    mobile.setDefaultTimeout(12000);
    await mobile.goto(origin, { waitUntil: "domcontentloaded" });
    await mobile.waitForLoadState("networkidle", { timeout: 15000 });
    const mobileOpen = mobile.locator('button[aria-label="Поиск"]:visible').first();
    await mobileOpen.click();
    const mobileInput = mobile.getByRole("combobox", { name: "Поиск товаров" }).filter({ visible: true });
    await mobileInput.waitFor({ state: "visible" });
    await mobileInput.fill("сумка");
    const mobileList = mobile.getByRole("listbox", { name: "Подсказки товаров" });
    await mobileList.getByRole("option", { name: /Тестовая сумка/ }).waitFor();
    const box = await mobileList.boundingBox();
    assert(box && box.x >= 0 && box.x + box.width <= 390, "Mobile suggestions overflow viewport");
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Mobile page has horizontal overflow");
    await mobileInput.press("Escape");
    assert.equal(await mobileInput.getAttribute("aria-expanded"), "false");
    await mobileInput.press("Escape");
    await mobileInput.waitFor({ state: "hidden" });

    await mobileOpen.click();
    await mobileInput.waitFor({ state: "visible" });
    await mobile.goBack();
    await mobileInput.waitFor({ state: "hidden" });
    await mobileOpen.click();
    await mobileInput.fill("сумка");
    await mobile.getByRole("option", { name: /Тестовая сумка/ }).click();
    await mobile.waitForURL(url => url.pathname === "/product/90001");

    console.log("Live product search: debounce, race, errors, IME, limit, keyboard navigation and mobile layout passed");
  } finally {
    await context.close();
    await browser.close();
  }
}
(process.argv.includes("--real") ? realSmoke() : main()).catch(error => { console.error(error); process.exitCode = 1; });
