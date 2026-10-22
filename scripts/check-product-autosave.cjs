/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser/API fixture, no real data or providers. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn, spawnSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const origin = "http://localhost:13065", api = "http://localhost:19665";
const output = path.resolve("build/product-autosave-check");
fs.mkdirSync(output, { recursive: true });
const calls = [], products = new Map(), creationKeys = new Map();
let nextId = 500, failWrites = false, loseCreationResponse = false, delayWrite = 0;
const brand = { id: 1, name: "Тестовый магазин", slug: "fixture-store" };
const onboarding = { applicationCompleted: true, brandCompleted: true, legalCompleted: true, agreementAccepted: true, progress: 100 };
const pageData = (content = []) => ({ content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0 });
function draft(id) {
  return { id, version: 0, publicId: String(id), title: "", description: "", composition: null, article: String(100000 + id),
    brandId: 1, brand: brand.name, categoryId: null, category: null, audience: "UNISEX", status: "DRAFT",
    moderationComment: null, packageWidthCm: null, packageHeightCm: null, packageLengthCm: null, packageWeightKg: null,
    variants: [], images: [], imageItems: [], colorways: [] };
}
function apply(product, values) {
  const variants = values.variants.map((variant, index) => {
    const previous = product.variants.find(item => item.id === variant.id);
    const operational = product.revisionSourceId && variant.operationalChanged === false ? previous : null;
    return { ...variant, id: variant.id ?? product.id * 100 + index, colorwayId: variant.colorwayId ?? product.id * 10 + index,
      size: variant.suggestedSizeName ?? "", color: variant.suggestedColorName ?? "",
      price: operational?.price ?? variant.price,
      stockQuantity: operational?.stockQuantity ?? variant.stockQuantity ?? previous?.stockQuantity ?? 0,
      availableQuantity: operational?.stockQuantity ?? variant.stockQuantity ?? previous?.stockQuantity ?? 0,
      stockTrackingEnabled: operational?.stockTrackingEnabled ?? variant.stockTrackingEnabled, reservedQuantity: 0 };
  });
  return { ...product, ...values, version: product.version + 1, variants,
    colorways: variants.map(item => ({ id: item.colorwayId, color: item.color, images: [] })) };
}
products.set(400, { ...draft(400), title: "Опубликованный товар", status: "ACTIVE",
  variants: [{ id: 40001, colorwayId: 4001, sku: "live-sku", size: "M", color: "Белый", price: 100, stockQuantity: 5, availableQuantity: 5, stockTrackingEnabled: true },
    { id: 40002, colorwayId: 4002, sku: "live-black", size: "L", color: "Чёрный", price: 100, stockQuantity: 3, availableQuantity: 3, stockTrackingEnabled: true }] });
products.set(401, { ...products.get(400), id: 401, status: "DRAFT", revisionSourceId: 400,
  variants: products.get(400).variants.map((variant, index) => ({ ...variant, id: 40101 + index })) });
products.set(402, { ...products.get(401), id: 402,
  variants: products.get(401).variants.map((variant, index) => ({ ...variant, id: 40201 + index, price: index ? 200 : 100 })) });
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, api);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end();
  const call = { method: req.method, path: url.pathname }; calls.push(call);
  let body = ""; for await (const chunk of req) body += chunk;
  const values = body && req.headers["content-type"]?.includes("application/json") ? JSON.parse(body) : null;
  if (values) call.values = values;
  const writing = ["POST", "PUT", "DELETE"].includes(req.method) && url.pathname.includes("/products/");
  if (writing && failWrites) { res.statusCode = 503; return res.end(JSON.stringify({ message: "Сервер временно недоступен" })); }
  let data = [];
  if (url.pathname === "/api/auth/session") data = { id: 70, username: "seller", role: "SELLER" };
  else if (url.pathname === "/api/profile") data = { displayName: "Продавец", email: "seller@example.test" };
  else if (url.pathname === "/api/seller/brands") data = [brand];
  else if (url.pathname === "/api/seller/legal-info") { res.statusCode = 204; return res.end(); }
  else if (url.pathname === "/api/seller/onboarding-status") data = onboarding;
  else if (url.pathname === "/api/catalog/categories") data = [{ id: 1, label: "Одежда", name: "Одежда", slug: "clothing", parentId: null, sortOrder: 0, isActive: true, effectiveActive: true }];
  else if (url.pathname === "/api/seller/products/drafts") {
    let id = creationKeys.get(values.clientDraftId);
    if (!id) { id = ++nextId; creationKeys.set(values.clientDraftId, id); products.set(id, apply(draft(id), values.product)); }
    data = products.get(id);
    if (loseCreationResponse) { loseCreationResponse = false; return res.end("{"); }
  } else if (/^\/api\/seller\/products\/\d+\/images$/.test(url.pathname) && req.method === "POST") {
    const product = products.get(Number(url.pathname.split("/")[4]));
    const token = body.match(/name="clientUploadId"\r\n\r\n([^\r]+)/)?.[1];
    const colorwayId = Number(body.match(/name="colorwayId"\r\n\r\n([^\r]+)/)?.[1]);
    if (!product.imageItems.some(item => item.clientUploadId === token)) {
      product.imageItems.push({ id: product.id * 1000 + product.imageItems.length, clientUploadId: token, colorwayId,
        url: "/icon.png", width: 300, height: 400, sortOrder: product.imageItems.length });
      product.version++;
    }
    data = product.imageItems.map(item => item.url);
  } else if (/^\/api\/seller\/products\/\d+$/.test(url.pathname)) {
    const id = Number(url.pathname.split("/").pop());
    if (!products.has(id)) { res.statusCode = 404; return res.end("{}"); }
    const product = products.get(id);
    if (req.method === "PUT") {
      if (values.expectedVersion !== product.version) { res.statusCode = 409; return res.end(JSON.stringify({ message: "Карточка изменилась — обновите её перед сохранением" })); }
      if (values.variants.some(variant => variant.price !== values.variants[0].price)) { res.statusCode = 400; return res.end(JSON.stringify({ message: 'У всех вариантов и размеров товара должна быть одинаковая цена' })); }
      products.set(id, apply(product, values));
    }
    data = products.get(id);
  } else if (url.pathname === "/api/seller/products/list") data = pageData([...products.values()].map(item => ({ ...item, variantsCount: item.variants.length })));
  else if (/\/list$|\/operations$|\/payouts$|\/available-products$/.test(url.pathname)) data = pageData();
  else if (url.pathname === "/api/seller/dashboard-summary") data = { activeProducts: 1, totalProducts: products.size, recentEvents: [] };
  else if (url.pathname === "/api/seller/dashboard/tasks") data = { content: [], hasNext: false };
  else if (url.pathname === "/api/seller/finance/summary") data = { nextPayoutDate: null, operations: [] };
  else if (/\/publish$/.test(url.pathname)) { products.get(Number(url.pathname.split("/").at(-2))).status = "MODERATION"; data = {}; }
  if (writing && delayWrite) await new Promise(resolve => setTimeout(resolve, delayWrite));
  res.end(JSON.stringify(data));
});
const form = page => page.locator("section[data-editor-page]");
const titleTrigger = page => form(page).getByRole("button", { name: /^Изменить название товара:/ });
async function title(page, value) {
  await titleTrigger(page).click();
  await page.getByRole("textbox", { name: "Название товара", exact: true }).fill(value);
  await page.getByRole("textbox", { name: "Название товара", exact: true }).press("Tab");
}
async function saved(page) { await form(page).getByRole("status").filter({ hasText: "Все изменения сохранены" }).waitFor(); }
const createdCount = () => creationKeys.size;
async function waitUntil(predicate) {
  const until = Date.now() + 20000;
  while (!predicate()) { if (Date.now() > until) throw new Error("Fixture condition timed out"); await new Promise(resolve => setTimeout(resolve, 50)); }
}
async function main() {
  await new Promise(resolve => server.listen(19665, resolve));
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--webpack", "-p", "13065"], {
    windowsHide: true, env: { ...process.env, RCM_TEST_DIST_DIR: "build/product-autosave-next", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "", browser;
  child.stdout.on("data", chunk => { logs += chunk; }); child.stderr.on("data", chunk => { logs += chunk; });
  try {
    await waitUntil(() => logs.includes("Ready in"));
    browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, headless: true } : { channel: "msedge", headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [], dialogs = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("dialog", async dialog => { dialogs.push(dialog.type()); await dialog.dismiss(); });
    await page.goto(origin + "/seller/products/new"); await form(page).waitFor();
    assert.equal(createdCount(), 0);
    await title(page, "   ");
    await page.waitForTimeout(1100);
    assert.equal(createdCount(), 0, "Whitespace alone does not create an empty draft");
    await form(page).getByRole("button", { name: "Товары", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/seller/products");
    assert.equal(createdCount(), 0, "Opening and closing an untouched form creates no draft");
    await page.getByRole("button", { name: "Добавить товар", exact: true }).click();
    await page.waitForURL(/\/products\/new/); await form(page).waitFor();
    assert.equal(createdCount(), 0);
    delayWrite = 800;
    await title(page, "Первая карточка");
    await waitUntil(() => createdCount() === 1);
    const description = page.getByRole("textbox", { name: "Описание товара", exact: true });
    assert.equal(await description.isEnabled(), true, "Typing remains available during background saving");
    await description.fill("Продолжаю ввод во время сохранения");
    delayWrite = 0;
    await saved(page);
    await page.waitForURL(/\/products\/501\/create/);
    assert.equal(products.get(501).description, "Продолжаю ввод во время сохранения");
    assert.equal(createdCount(), 1);
    await page.reload(); await form(page).waitFor(); await page.waitForLoadState("networkidle");
    assert.equal(await description.inputValue(), "Продолжаю ввод во время сохранения");
    delayWrite = 800;
    await description.fill("Сохранено при выходе"); await description.press("Tab");
    await waitUntil(() => calls.some(call => call.method === "PUT" && call.values?.description === "Сохранено при выходе"));
    await form(page).getByRole("button", { name: "Товары", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/seller/products");
    delayWrite = 0;
    assert.equal(products.get(501).description, "Сохранено при выходе");
    assert.equal(dialogs.length, 0, "Successful flush on close needs no native prompt");
    console.log("PASS: lazy creation, blur/debounce, continued typing, refresh and close flush");

    await page.goto(origin + "/seller/products/new"); await form(page).waitFor();
    loseCreationResponse = true;
    await title(page, "Потерянный ответ");
    await form(page).getByRole("status").filter({ hasText: "Не удалось сохранить" }).waitFor();
    assert.equal(createdCount(), 2);
    await form(page).getByRole("button", { name: "Повторить сохранение" }).click(); await saved(page);
    assert.equal(createdCount(), 2, "Lost creation response retry uses the same key");
    await page.waitForURL(/\/products\/502\/create/);
    failWrites = true;
    await description.fill("Несохранённый текст"); await description.press("Tab");
    await form(page).getByRole("status").filter({ hasText: "Не удалось сохранить" }).waitFor();
    await form(page).getByRole("button", { name: "Товары", exact: true }).click();
    const warning = page.getByRole("dialog", { name: "Есть несохранённые изменения" }); await warning.waitFor();
    await warning.getByRole("button", { name: "Вернуться к редактированию" }).click();
    assert.equal(await description.inputValue(), "Несохранённый текст");
    failWrites = false;
    await form(page).getByRole("button", { name: "Повторить сохранение" }).click(); await saved(page);
    assert.equal(products.get(502).description, "Несохранённый текст");
    const beforePublish = calls.filter(call => call.path.endsWith("/publish")).length;
    await form(page).getByRole("button", { name: "Отправить на модерацию" }).click();
    await page.locator('[aria-invalid="true"]').first().waitFor();
    assert.equal(calls.filter(call => call.path.endsWith("/publish")).length, beforePublish, "Incomplete draft is saved but cannot be submitted");
    const photo = await require("sharp")({ create: { width: 300, height: 400, channels: 3, background: "#cccccc" } }).png().toBuffer();
    await page.locator('input[type="file"]').setInputFiles({ name: "fixture.png", mimeType: "image/png", buffer: photo });
    await waitUntil(() => products.get(502).imageItems.length === 1);
    await saved(page);
    assert.ok(products.get(502).imageItems[0].clientUploadId, "Photo autosave has a stable upload key");
    await page.reload(); await form(page).waitFor(); await page.waitForLoadState("networkidle");
    assert.equal(products.get(502).imageItems.length, 1, "Photo survives refresh without re-upload");
    const beforeBack = page.url();
    await description.fill("Сохранено при Back");
    await page.evaluate(() => history.back());
    await page.waitForURL(url => url.href !== beforeBack);
    assert.equal(products.get(502).description, "Сохранено при Back", "Back flushes the current snapshot");
    console.log("PASS: lost response idempotency, failed save/close guard, retry and moderation validation");

    await page.goto(origin + "/seller/products/401/create"); await form(page).waitFor(); await page.waitForLoadState("networkidle");
    const price = page.getByRole("textbox", { name: /^Цена(?::| товара$)/ });
    await price.fill("150"); await price.press("Tab");
    await form(page).getByRole("status").filter({ hasText: "Цены и остатки ожидают сохранения" }).waitFor();
    assert.equal(products.get(401).variants[0].price, 100, "Revision autosave never applies live operational changes");
    await description.fill("Новое описание опубликованного товара"); await description.press("Tab");
    await waitUntil(() => products.get(401).description === "Новое описание опубликованного товара");
    assert.equal(await price.inputValue(), "150", "Pending manual price is preserved through content autosave");
    await page.getByRole('button', { name: 'Добавить оттенок', exact: true }).click();
    await page.getByRole('region', { name: 'Вариант 3', exact: true }).getByRole('textbox', { name: /Название оттенка/ }).fill('Красный');
    await page.keyboard.press('Tab');
    await waitUntil(() => products.get(401).variants.length === 3);
    assert.ok(products.get(401).variants.every(variant => variant.price === 100), 'Content autosave keeps one old price for existing and newly added shades');
    assert.equal(await price.inputValue(), '150', 'New shades keep the pending common price in the editor');
    await form(page).getByRole("button", { name: "Сохранить цены и остатки" }).click(); await saved(page);
    assert.ok(products.get(401).variants.every(variant => variant.price === 150), 'Explicit save applies the common price to every shade');
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 950 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "No overflow at " + width);
      await page.screenshot({ path: path.join(output, `autosave-${width}.png`) });
    }
    await page.goto(origin + "/seller/products/400/edit");
    const activeEditor = page.locator("dialog[open]").first(); await activeEditor.waitFor(); await page.waitForLoadState("networkidle");
    const livePrice = activeEditor.getByRole("textbox", { name: /^Цена(?::| товара$)/ });
    await livePrice.fill("175"); await livePrice.press("Tab");
    await page.waitForTimeout(1200);
    assert.ok(products.get(400).variants.every(variant => variant.price === 100), "ACTIVE operational fields never autosave");
    await activeEditor.getByRole("button", { name: "Закрыть редактор", exact: true }).click();
    await page.getByRole("dialog", { name: "Есть несохранённые изменения" }).getByRole("button", { name: "Вернуться к редактированию" }).click();
    await activeEditor.getByRole("button", { name: "Сохранить цены и остатки" }).click();
    await waitUntil(() => products.get(400).variants.every(variant => variant.price === 175));
    await page.getByText("Товар сохранён", { exact: true }).waitFor();
    await activeEditor.getByRole("button", { name: "Закрыть редактор", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/seller/products");
    assert.deepEqual(errors, []);
    console.log("PASS: revision content autosave and explicit prices/stock, 320/390/1280, no browser errors; fixture only");
    await page.goto(origin + '/seller/products/402/create'); await form(page).waitFor();
    const legacyPrice = page.getByRole('textbox', { name: 'Цена товара', exact: true });
    assert.equal(await legacyPrice.inputValue(), '');
    await legacyPrice.fill('180'); await legacyPrice.press('Tab');
    await form(page).locator('[data-state="error"]').waitFor();
    assert.deepEqual(products.get(402).variants.map(variant => variant.price), [100, 200], 'Autosave never silently normalizes legacy prices');
    await form(page).getByRole('button', { name: 'Повторить сохранение', exact: true }).click(); await saved(page);
    assert.ok(products.get(402).variants.every(variant => variant.price === 180), 'Explicit save resolves legacy prices even when the content autosave is rejected');
    assert.deepEqual(errors, []);
    console.log('PASS: legacy revision prices can be explicitly unified after a rejected content autosave');
    fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({ passed: true, created: createdCount(), errors, legacyPriceResolution: true, completedAt: new Date().toISOString() }, null, 2));
  } catch (error) {
    if (browser) for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
    console.error(logs.slice(-2000)); throw error;
  } finally {
    fs.writeFileSync(path.join(output, "calls.json"), JSON.stringify(calls, null, 2));
    fs.writeFileSync(path.join(output, "next.log"), logs);
    if (browser) await browser.close();
    if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    else child.kill();
    await new Promise(resolve => server.close(resolve));
    // Remove only this runner's generated type references, preserving other local configurations.
    const configPath = path.resolve("tsconfig.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const includes = config.include.filter(item => !item.startsWith("build/product-autosave-next/"));
    if (includes.length !== config.include.length) fs.writeFileSync(configPath, JSON.stringify({ ...config, include: includes }, null, 2) + "\n");
    const nextEnvPath = path.resolve("next-env.d.ts");
    const nextEnv = fs.readFileSync(nextEnvPath, "utf8");
    if (nextEnv.includes("build/product-autosave-next/")) fs.writeFileSync(nextEnvPath, nextEnv.replace("./build/product-autosave-next/dev/types/routes.d.ts", "./.next/dev/types/routes.d.ts"));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
