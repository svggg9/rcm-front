/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

// Separate frontend/API ports and dist directory leave the developer's servers alone.
const origin = "http://localhost:13055";
const api = "http://localhost:19655";
const output = path.resolve(__dirname, "../build/product-create-screenshots");
const onlyModals = process.argv.includes("--modals-only");
const calls = [];
const brand = { id: 1, name: "Тестовый магазин", slug: "fixture-store", description: "Описание магазина", wordmarkUrl: "/icons/like.svg" };
const onboarding = { applicationCompleted: true, brandCompleted: true, legalCompleted: true, agreementAccepted: true, progress: 100, completedSteps: 4, totalSteps: 4 };
const summary = { activeProducts: 0, attentionProducts: 0, totalProducts: 1, readyOrders: 0, activeOrders: 0, totalOrders: 0, estimatedBalance: 0, salesAmount: 0, commissionAmount: 0, availablePayout: 0, processingPayout: 0, inPayoutAmount: 0, failedPayouts: 0, telegramLinked: false, supportTelegramUrl: null, recentEvents: [] };
function draft(id, title = "Новый товар") {
  return { id, version: 1, publicId: String(id), title, description: "", composition: null, article: String(100000 + id), brandId: 1, brand: brand.name, categoryId: null, category: null, suggestedCategoryName: null, audience: "UNISEX", status: "DRAFT", moderationComment: null, packageWidthCm: null, packageHeightCm: null, packageLengthCm: null, packageWeightKg: null, variants: [], images: [], imageItems: [], colorways: [] };
}
const products = new Map([[400, draft(400, "Существующий товар")]]);
let nextId = 500;
const paged = (content = []) => ({ content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0 });
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, api);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end();
  const call = { method: req.method, path: url.pathname };
  calls.push(call);
  let data = [];
  if (url.pathname === "/api/auth/session") data = { id: 70, username: "seller", role: "SELLER" };
  else if (url.pathname === "/api/profile") data = { displayName: "Тестовый продавец", email: "seller@example.test" };
  else if (url.pathname === "/api/seller/legal-info") { res.statusCode = 204; return res.end(); }
  else if (url.pathname === "/api/seller/brands") data = [brand];
  else if (url.pathname === "/api/seller/onboarding-status") data = onboarding;
  else if (url.pathname === "/api/seller/dashboard-summary") data = summary;
  else if (url.pathname === "/api/seller/dashboard/tasks") data = { content: [], hasNext: false, number: 0 };
  else if (url.pathname === "/api/seller/finance/summary") data = { availableAmount: 0, processingAmount: 0, inPayoutAmount: 0, failedPayoutAmount: 0, nextPayoutAmount: 0, reconciliationDifference: 0, operations: [], nextPayout: null, nextPayoutDate: null, bankDetailsReady: true, paidThisMonthAmount: 0, estimatedBalance: 0, salesAmount: 0, commissionAmount: 0, adjustmentsAmount: 0, paidOutAmount: 0 };
  else if (url.pathname === "/api/catalog/categories") data = [{ id: 1, name: "Одежда", label: "Одежда", slug: "clothing", parentId: null, isActive: true, effectiveActive: true }];
  else if (url.pathname === "/api/seller/products/draft" && req.method === "POST") {
    data = ++nextId;
    products.set(data, draft(data));
  } else if (/^\/api\/seller\/products\/\d+$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/").pop());
    if (!products.has(id)) { res.statusCode = 404; return res.end(JSON.stringify({ message: "Товар не найден" })); }
    if (req.method === "PUT") {
      let body = ""; for await (const chunk of req) body += chunk;
      const values = JSON.parse(body);
      call.values = values;
      const product = products.get(id);
      products.set(id, { ...product, ...values, version: product.version + 1,
        variants: values.variants.map((variant, index) => ({ ...variant, id: variant.id ?? id * 10 + index, size: variant.suggestedSizeName ?? "", color: variant.suggestedColorName ?? "", availableQuantity: variant.stockQuantity, stockQuantity: variant.stockQuantity, reservedQuantity: 0, sku: variant.sku ?? `fixture-${id}-${index}` })) });
    }
    data = products.get(id);
  } else if (url.pathname === "/api/seller/products/list") data = paged([...products.values()].map(product => ({ id: product.id, title: product.title, status: product.status, article: product.article, brandName: brand.name, categoryName: null, coverImage: null, minPrice: 0, totalStock: 0, variantsCount: product.variants.length })));
  else if (/\/available-products$/.test(url.pathname)) data = paged();
  else if (url.pathname === "/api/seller/orders/list" || url.pathname === "/api/seller/returns/list" || url.pathname === "/api/seller/finance/payouts" || url.pathname === "/api/seller/finance/operations") data = paged();
  else if (url.pathname === "/api/cart") data = { items: [] };
  res.end(JSON.stringify(data));
});

function createdCount() { return calls.filter(call => call.method === "POST" && call.path === "/api/seller/products/draft").length; }
function form(page) { return page.locator("section[data-editor-page]"); }
function titleTrigger(page) { return form(page).getByRole("button", { name: /^Изменить название товара:/ }); }
function titleInput(page) { return form(page).getByRole("textbox", { name: "Название товара", exact: true }); }
async function changeTitle(page, value, key = "Enter") {
  await titleTrigger(page).click();
  await titleInput(page).fill(value);
  if (key === "blur") await titleInput(page).press("Tab");
  else await titleInput(page).press(key);
  await titleTrigger(page).waitFor();
}
async function assertTitle(page, expected) {
  assert.equal((await titleTrigger(page).innerText()).trim(), expected);
  assert.equal(await titleInput(page).count(), 0, "Title input closes after commit or cancellation");
}
async function ready(page) {
  await form(page).waitFor({ state: "visible" });
  await titleTrigger(page).waitFor();
  await page.waitForLoadState("networkidle");
}
async function ordinaryPage(page) {
  await ready(page);
  assert.equal(await page.locator("dialog[open]").count(), 0, "Creation is not a modal dialog");
  assert.equal(await form(page).locator("h1").count(), 1, "One editable product heading");
  assert.equal(await titleTrigger(page).count(), 1, "One product title editor");
  assert.equal(await form(page).getByLabel("Название", { exact: true }).count(), 0, "General card does not duplicate title editing");
  const state = await page.evaluate(() => ({ locked: document.body.style.overflow === "hidden", overflow: document.documentElement.scrollWidth > innerWidth, header: document.querySelector("[data-seller-header]")?.closest("header")?.getBoundingClientRect().bottom, back: document.querySelector("[data-editor-page] > button")?.getBoundingClientRect().top }));
  assert.equal(state.locked, false, "Page has normal document scroll");
  assert.equal(state.overflow, false, "No horizontal overflow");
  assert.ok(state.back >= state.header, "Back link is below the seller header");
  const heading = form(page).locator(":scope > header");
  const status = await heading.getByText("Черновик", { exact: true }).boundingBox();
  const store = await heading.getByText(brand.name, { exact: true }).boundingBox();
  assert.ok(status && store && Math.abs(status.y + status.height / 2 - store.y - store.height / 2) <= 3, "Draft status and store share one compact line");
}
async function stickySections(page, width) {
  await page.locator("#editor-tab-shipping").click();
  const panel = page.locator("#product-step-shipping");
  await panel.waitFor({ state: "visible" });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const beforeSticky = await page.evaluate(() => ({
    top: document.querySelector('[data-editor-navigation]')?.getBoundingClientRect().top,
    bottom: document.querySelector('[data-editor-navigation]')?.getBoundingClientRect().bottom,
    headerBottom: document.querySelector('[data-seller-header]')?.closest('header')?.getBoundingClientRect().bottom,
    panelTop: document.querySelector('#product-step-shipping')?.getBoundingClientRect().top,
    scroll: scrollY, height: document.documentElement.scrollHeight, viewport: innerHeight,
    htmlOverflow: getComputedStyle(document.documentElement).overflow,
    bodyOverflow: getComputedStyle(document.body).overflow
  }));
  fs.writeFileSync(path.join(output, `before-sticky-${width}.json`), JSON.stringify(beforeSticky, null, 2));
  assert.ok(beforeSticky.panelTop >= beforeSticky.bottom - 2, "Selected section is not covered by the section bar at " + width);
  await page.evaluate(distance => window.scrollBy(0, distance), Math.max(0, beforeSticky.top - beforeSticky.headerBottom) + 80);
  await page.waitForFunction(() => {
    const nav = document.querySelector("#editor-tab-shipping")?.parentElement;
    const header = document.querySelector("[data-seller-header]")?.closest("header");
    return nav && header && Math.abs(nav.parentElement.getBoundingClientRect().top - header.getBoundingClientRect().bottom) <= 2;
  });
  const geometry = await page.evaluate(() => {
    const nav = document.querySelector("#editor-tab-shipping").parentElement;
    const bar = nav.parentElement.getBoundingClientRect();
    const panel = document.querySelector("#product-step-shipping").getBoundingClientRect();
    const target = document.querySelector("#editor-tab-shipping").getBoundingClientRect();
    return { top: bar.top, bottom: bar.bottom, panel: panel.top, targetTop: target.top,
      targetLeft: target.left, targetRight: target.right, width: innerWidth, scroll: scrollY };
  });
  fs.writeFileSync(path.join(output, `sticky-geometry-${width}.json`), JSON.stringify(geometry, null, 2));
  assert.ok(geometry.scroll > 0, "Section navigation scrolls the document at " + width);
  assert.ok(geometry.targetTop >= geometry.top && geometry.targetLeft >= 0 && geometry.targetRight <= geometry.width, "Selected tab is visible at " + width);
  await page.evaluate(() => window.scrollBy(0, 100));
  await page.waitForFunction(expectedTop => {
    const bar = document.querySelector("#editor-tab-shipping")?.parentElement?.parentElement;
    return bar && Math.abs(bar.getBoundingClientRect().top - expectedTop) <= 2;
  }, geometry.top);
  await page.locator("#editor-tab-shipping").focus();
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(() => document.activeElement?.id === "editor-tab-variants");
  const focused = await page.locator("#editor-tab-variants").boundingBox();
  assert.ok(focused.y >= geometry.top - 2 && focused.x >= 0 && focused.x + focused.width <= width, "Keyboard section focus stays visible at " + width);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Sticky section navigation has no page overflow at " + width);
}
async function confirmation(page) {
  const dialog = page.getByRole("dialog", { name: "Есть несохранённые изменения" });
  await dialog.waitFor();
  return dialog;
}
async function fieldTypography(page, width) {
  const result = {};
  for (const name of ["Категория", "Размер (необязательно)", "На складе (необязательно)", "Длина, см"]) {
    result[name] = await form(page).getByText(name, { exact: true }).evaluate(node => {
      const style = getComputedStyle(node);
      return { size: parseFloat(style.fontSize), line: parseFloat(style.lineHeight), weight: Number(style.fontWeight) };
    });
    assert.deepEqual(result[name], { size: 15, line: 22, weight: 500 }, "Consistent field label at " + width + ": " + name);
  }
  fs.writeFileSync(path.join(output, `field-typography-${width}.json`), JSON.stringify(result, null, 2));
}
async function quantityGeometry(page, width) {
  const quantity = await form(page).getByLabel("На складе (необязательно)", { exact: true }).boundingBox();
  const remove = await form(page).getByRole("button", { name: "Удалить размер", exact: true }).boundingBox();
  assert.ok(quantity && remove, "Quantity and remove action are visible at " + width);
  assert.ok(Math.abs(remove.width - 44) <= 1 && Math.abs(remove.height - 44) <= 1, "Remove size has a 44px target at " + width);
  assert.ok(quantity.x + quantity.width <= remove.x && Math.abs(quantity.y - remove.y) <= 1, "Quantity and remove action share one row without overlap at " + width);
  assert.ok(remove.x + remove.width <= width, "Remove action fits the viewport at " + width);
  fs.writeFileSync(path.join(output, `quantity-geometry-${width}.json`), JSON.stringify({ quantity, remove }, null, 2));
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(19655, "127.0.0.1", resolve); });
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--webpack", "-p", "13055"], {
    cwd: path.resolve(__dirname, ".."), windowsHide: true,
    env: { ...process.env, RCM_TEST_DIST_DIR: "build/product-create-check", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin }, stdio: ["ignore", "pipe", "pipe"]
  });
  let logs = "";
  child.stdout.on("data", data => { logs += data; });
  child.stderr.on("data", data => { logs += data; });
  let browser;
  const nativeDialogs = [];
  let approvedDiscard = false;
  try {
    let started = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      if (child.exitCode !== null) throw new Error("Next exited: " + logs.slice(-2000));
      try { await fetch(origin + "/seller/products", { signal: AbortSignal.timeout(3000) }); started = true; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    assert.ok(started, "Fixture frontend started");
    browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : { headless: true, channel: "msedge" });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(40000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("dialog", dialog => {
      nativeDialogs.push({ type: dialog.type(), message: dialog.message(), approvedDiscard });
      // Accept an unexpected second prompt so its count fails promptly instead of
      // cancelling navigation and obscuring the defect behind a URL timeout.
      void (approvedDiscard ? dialog.accept() : dialog.dismiss());
    });

    if (!onlyModals) {
    await page.goto(origin + "/seller/products");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Добавить товар", exact: true }).click();
    await page.waitForURL(/\/seller\/products\/501\/create/);
    await ordinaryPage(page);
    await changeTitle(page, "");
    await assertTitle(page, "Наименование товара");
    await changeTitle(page, "Отменённое название", "Escape");
    await assertTitle(page, "Наименование товара");
    assert.equal(await titleTrigger(page).evaluate(node => node === document.activeElement), true, "Escape returns focus to title trigger");
    await changeTitle(page, "Название по Enter");
    await assertTitle(page, "Название по Enter");
    await changeTitle(page, "Название по blur", "blur");
    await assertTitle(page, "Название по blur");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page.getByText("Товар сохранён", { exact: true }).waitFor();
    assert.equal(createdCount(), 1, "One draft creation from the product list");
    await page.reload(); await ordinaryPage(page);
    assert.equal(createdCount(), 1, "Reload reads the same draft without creating another one");
    assert.ok(calls.some(call => call.method === "GET" && call.path === "/api/seller/products/501"));

    await titleTrigger(page).click();
    await titleInput(page).fill("Локальное название до blur");
    const promptsBeforeInlineReload = nativeDialogs.length;
    try { await page.reload({ timeout: 5000 }); } catch (error) { if (nativeDialogs.length === promptsBeforeInlineReload) throw error; }
    assert.equal(nativeDialogs.length, promptsBeforeInlineReload + 1, "Inline title input is protected before blur");
    assert.equal(await titleInput(page).inputValue(), "Локальное название до blur", "Cancelled reload retains uncommitted title input");
    await titleInput(page).press("Escape");
    await assertTitle(page, "Название по blur");
    await page.reload(); await ordinaryPage(page);
    assert.equal(nativeDialogs.length, promptsBeforeInlineReload + 1, "Escape restores clean title and reload needs no prompt");

    await titleTrigger(page).click();
    await titleInput(page).fill("Сохранённое название");
    const beforeDirectSave = calls.filter(call => call.method === "PUT" && call.path === "/api/seller/products/501").length;
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-editor-page]')?.getAttribute("aria-busy") !== "true");
    await page.getByText("Товар сохранён", { exact: true }).waitFor();
    assert.equal(products.get(501).title, "Сохранённое название");
    assert.equal(calls.filter(call => call.method === "PUT" && call.path === "/api/seller/products/501").length, beforeDirectSave + 1, "First Save click commits inline title once without Enter/Tab");
    await page.reload(); await ready(page);
    await assertTitle(page, "Сохранённое название");
    await page.goto(origin + "/seller/products");
    await page.goto(origin + "/seller/products/501/create"); await ordinaryPage(page);
    await page.goBack();
    await page.waitForURL(url => url.pathname === "/seller/products");
    assert.equal(await page.locator("dialog[open]").count(), 0, "Clean browser Back leaves without confirmation");
    console.log("PASS: editable product heading Enter/Escape/blur and placeholder; create/direct/reload/save and clean browser Back");

    await page.goto(origin + "/seller/products/501/create"); await ready(page);
    await changeTitle(page, "Несохранённое название");
    const promptsBeforeReload = nativeDialogs.length;
    try { await page.reload({ timeout: 5000 }); } catch (error) { if (nativeDialogs.length === promptsBeforeReload) throw error; }
    assert.equal(nativeDialogs.length, promptsBeforeReload + 1, "Dirty reload still prompts natively");
    assert.equal(nativeDialogs.at(-1).type, "beforeunload");
    await assertTitle(page, "Несохранённое название");
    await form(page).getByRole("button", { name: "Товары", exact: true }).click();
    await (await confirmation(page)).getByRole("button", { name: "Вернуться к редактированию" }).click();
    await assertTitle(page, "Несохранённое название");
    await page.getByRole("link", { name: "Заказы", exact: true }).first().click();
    await (await confirmation(page)).getByRole("button", { name: "Вернуться к редактированию" }).click();
    await page.evaluate(() => history.back());
    await (await confirmation(page)).getByRole("button", { name: "Вернуться к редактированию" }).click();
    await page.getByRole("link", { name: "Заказы", exact: true }).first().click();
    const discard = await confirmation(page);
    approvedDiscard = true;
    await discard.getByRole("button", { name: "Закрыть без сохранения" }).click();
    await page.waitForURL(url => url.pathname === "/seller/orders");
    approvedDiscard = false;
    assert.equal(nativeDialogs.length, promptsBeforeReload + 1, "Approved discard has no second native confirmation");
    assert.equal(products.get(501).title, "Сохранённое название", "Discard does not mutate the saved draft");
    assert.equal(await page.evaluate(() => document.body.style.overflow === "hidden"), false, "Closing dirty confirmation restores scroll");
    console.log("PASS: dirty reload, close/link/Back guards and approved discard without a second prompt");

    await page.goto(origin + "/seller/products/501/create"); await ready(page);
    await page.locator("#editor-tab-description").click();
    const description = page.getByRole("group", { name: "Описание товара", exact: true });
    await description.getByRole("textbox", { name: "Абзац 1", exact: true }).fill("Первый абзац");
    const addParagraph = description.getByRole("button", { name: "Добавить абзац", exact: true });
    const addList = description.getByRole("button", { name: "Добавить список", exact: true });
    assert.equal(await addParagraph.evaluate(node => node.classList.contains("buttonSecondary")), true, "Paragraph action uses DS secondary button");
    assert.equal(await addList.evaluate(node => node.classList.contains("buttonSecondary")), true, "List action uses DS secondary button");
    assert.ok(await addParagraph.locator("svg").count(), "Paragraph action has an icon");
    assert.ok(await addList.locator("svg").count(), "List action has an icon");
    await addParagraph.click();
    await description.getByRole("textbox", { name: "Абзац 2", exact: true }).fill("Второй абзац");
    await addList.click();
    await description.getByRole("textbox", { name: "Пункт 1 списка 3", exact: true }).fill("Первый пункт");
    await description.getByRole("button", { name: "Добавить пункт", exact: true }).click();
    await description.getByRole("textbox", { name: "Пункт 2 списка 3", exact: true }).fill("Второй пункт");
    await description.getByRole("button", { name: "Поднять пункт 2", exact: true }).click();
    await description.getByRole("button", { name: "Удалить пункт 2", exact: true }).click();
    await description.getByRole("button", { name: "Удалить блок 2", exact: true }).click();
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page.getByText("Товар сохранён", { exact: true }).waitFor();
    assert.equal(products.get(501).description, "Первый абзац\n\n▪ Второй пункт", "DS paragraph/list/reorder/delete actions preserve description serialization");
    await page.reload(); await ready(page);
    await page.locator("#editor-tab-description").click();
    assert.equal(await description.getByRole("textbox", { name: "Абзац 1", exact: true }).inputValue(), "Первый абзац");
    assert.equal(await description.getByRole("textbox", { name: "Пункт 1 списка 2", exact: true }).inputValue(), "Второй пункт", "Description blocks survive reload");
    const typography = await page.locator("#product-description").evaluate(node => {
      const heading = getComputedStyle(node.querySelector("h2"));
      const label = getComputedStyle(node.querySelector('[data-ui="field"] > span'));
      return { headingSize: parseFloat(heading.fontSize), headingWeight: Number(heading.fontWeight), labelSize: parseFloat(label.fontSize), labelWeight: Number(label.fontWeight) };
    });
    assert.ok(typography.headingSize >= 22 && typography.headingWeight >= 600, "Section heading has clearer hierarchy");
    assert.ok(typography.labelSize >= 15 && typography.labelWeight >= 500, "Field label is more readable");
    console.log("PASS: DS description controls add, reorder and remove blocks/items; serialized content survives refresh; heading and label hierarchy");

    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
      await page.goto(origin + "/seller/products/501/create");
      await ordinaryPage(page);
      await fieldTypography(page, width);
      const box = await page.locator("[data-seller-shell]").boundingBox();
      const availableWidth = await page.evaluate(() => document.body.getBoundingClientRect().width);
      assert.ok(box.width <= 1200.5, "Maximum seller width");
      assert.ok(Math.abs(box.width - Math.min(1200, availableWidth - (width <= 768 ? 32 : 64))) < 1, "Seller page gutters at " + width);
      await page.screenshot({ path: path.join(output, `create-${width}.png`), fullPage: width >= 700 });
      await stickySections(page, width);
      await page.screenshot({ path: path.join(output, `sticky-${width}.png`) });
      if (width < 700) {
        await page.locator("#editor-tab-description").click();
        await description.getByRole("button", { name: "Добавить абзац", exact: true }).click();
        assert.equal(await description.getByRole("textbox", { name: "Абзац 3", exact: true }).count(), 1, "Description action works at " + width);
        await description.getByRole("button", { name: "Удалить блок 3", exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Description toolbar and list actions fit at " + width);
        await page.getByRole("button", { name: "Сохранить", exact: true }).click();
        await page.getByText("Товар сохранён", { exact: true }).waitFor();
        await page.getByRole("tab", { name: /Варианты/ }).click();
        await page.locator("#product-step-variants").waitFor({ state: "visible" });
        await quantityGeometry(page, width);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(output, `variants-${width}.png`) });
      }
    }

    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(origin + "/seller/home");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Добавить товар", exact: true }).click();
    await page.waitForURL(/\/seller\/products\/502\/create/); await ordinaryPage(page);
    assert.equal(createdCount(), 2, "Home action creates exactly one more draft");
    }
    await page.goto(origin + "/seller/products/400/edit");
    await page.locator("dialog[open]").first().waitFor();
    assert.equal(await page.locator("section[data-editor-page]").count(), 0, "Existing editor keeps dialog presentation");
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden", "Existing modal editor keeps scroll lock");
    await page.getByRole("button", { name: "Закрыть редактор", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/seller/products");
    await page.goto(origin + "/seller/products?section=collections");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Добавить подборку", exact: true }).click();
    await page.getByRole("dialog", { name: "Создание подборки" }).waitFor();
    assert.equal(await page.locator("section[data-editor-page]").count(), 0, "Collection keeps dialog presentation");
    assert.deepEqual(errors, [], "No uncaught browser errors");
    const prefix = onlyModals ? "modals-" : "";
    fs.writeFileSync(path.join(output, `${prefix}calls.json`), JSON.stringify(calls, null, 2));
    fs.writeFileSync(path.join(output, `${prefix}native-dialogs.json`), JSON.stringify(nativeDialogs, null, 2));
    fs.writeFileSync(path.join(output, `${prefix}result.json`), JSON.stringify({ passed: true, mode: onlyModals ? "modals" : "full", completedAt: new Date().toISOString(), origin, api }, null, 2));
    console.log(onlyModals ? "PASS: existing product editor and collection creation keep native dialog presentation and modal scroll lock; fixture only"
      : "PASS: list/home create one draft per action; one editable title, Enter/Escape/blur, compact status/brand; sticky sections and visible keyboard focus; DS description serialization; direct/reload/save and dirty guards; 320/390/1280 no overflow; existing product/collection dialogs unchanged; fixture only");
  } catch (error) {
    fs.writeFileSync(path.join(output, "failure.log"), logs);
    fs.writeFileSync(path.join(output, "calls.json"), JSON.stringify(calls, null, 2));
    fs.writeFileSync(path.join(output, "native-dialogs.json"), JSON.stringify(nativeDialogs, null, 2));
    if (browser) for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
    console.error(logs.slice(-1600));
    throw error;
  } finally {
    if (browser) await browser.close();
    if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    else child.kill();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
