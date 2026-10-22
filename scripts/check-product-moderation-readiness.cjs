/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser fixture. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

const origin = "http://localhost:13058";
const api = "http://localhost:19658";
const output = path.resolve(__dirname, "../build/moderation-readiness");
const brand = { id: 1, name: "Тестовый магазин", slug: "fixture-store" };
const calls = [];
let readinessError = false;
let legalCompleted = false;
let agreementAccepted = false;
let product;
function reset() {
  calls.length = 0;
  product = { id: 7, version: 1, publicId: "fixture-product", article: "100007", status: "DRAFT",
    title: "Тестовый товар", description: "Описание тестового товара", composition: "Хлопок",
    brandId: 1, brand: brand.name, categoryId: 1, category: "Одежда", audience: "UNISEX",
    packageWidthCm: 10, packageHeightCm: 10, packageLengthCm: 10, packageWeightKg: 1,
    variants: [{ id: 71, sku: "TEST-71", colorwayId: 1, size: "M", color: "Чёрный", price: 100,
      stockTrackingEnabled: true, stockQuantity: 5, availableQuantity: 5, reservedQuantity: 0 }],
    colorways: [{id: 1, colorName: "Чёрный", isDefault: true}],
    images: [], imageItems: [1,2,3].map(id => ({ id, url: "/icons/like.svg", sortOrder: id - 1, colorwayId: 1, width: 1200, height: 1600 })) };
}
const paged = { content: [], totalPages: 0, totalElements: 0, number: 0 };
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end();
  const url = new URL(req.url, api);
  calls.push({method: req.method, path: url.pathname});
  let data = [];
  if (url.pathname === "/api/auth/session") data = { id: 70, username: "seller", role: "SELLER" };
  else if (url.pathname === "/api/profile") data = { displayName: "Продавец", email: "seller@example.test" };
  else if (url.pathname === "/api/seller/brands") data = [brand];
  else if (url.pathname === "/api/seller/onboarding-status") {
    if (readinessError) { res.statusCode = 503; data = {message: "Unavailable"}; }
    else data = { applicationCompleted: true, brandCompleted: true, legalCompleted, agreementAccepted, totalSteps: 2, completedSteps: 0, progress: 0 };
  } else if (url.pathname === "/api/catalog/categories") data = [{ id: 1, name: "Одежда", label: "Одежда", slug: "clothes", isActive: true, effectiveActive: true, parentId: null }];
  else if (url.pathname === "/api/seller/products/7") data = product;
  else if (url.pathname === "/api/seller/products/7/publish" && req.method === "POST") {
    product.status = "MODERATION";
    res.statusCode = 204;
    return res.end();
  } else if (url.pathname === "/api/seller/legal-info") { res.statusCode = 204; return res.end(); }
  else if (url.pathname === "/api/cart") data = {items: []};
  else if (url.pathname.endsWith("/list") || url.pathname.endsWith("/tasks")) data = paged;
  res.end(JSON.stringify(data));
});

async function submissionButton(page) {
  const button = page.getByRole("button", {name: "Отправить на модерацию", exact: true});
  if (!await button.count()) await page.locator("#editor-tab-photos").click();
  return button;
}

async function submit(page) { await (await submissionButton(page)).click(); }

async function main() {
  fs.mkdirSync(output, {recursive: true});
  fs.rmSync(path.join(output, "result.json"), {force: true});
  reset();
  await new Promise(resolve => server.listen(19658, "127.0.0.1", resolve));
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--webpack", "-p", "13058"], {
    cwd: path.resolve(__dirname, ".."), windowsHide: true,
    env: {...process.env, RCM_TEST_DIST_DIR: "build/moderation-readiness-next", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin},
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", data => { logs += data; });
  child.stderr.on("data", data => { logs += data; });
  let browser;
  try {
    for (let attempt = 0; attempt < 90; attempt++) {
      if (child.exitCode !== null) throw new Error("Next exited: " + logs.slice(-1500));
      try { await fetch(origin + "/seller/products/7/create", {signal: AbortSignal.timeout(3000)}); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    browser = await chromium.launch({headless: true, channel: "msedge"});
    const page = await browser.newPage({viewport: {width: 1280, height: 1000}});
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const width of [1280, 390, 320]) {
      reset();
      await page.setViewportSize({width, height: 1000});
      await page.goto(origin + "/seller/products/7/create");
      await page.getByText("Заполните данные магазина до публикации", {exact: true}).waitFor();
      await page.screenshot({path: path.join(output, `warning-${width}.png`), fullPage: true});
      await submit(page);
      const dialog = page.getByRole("dialog", {name: "Товар отправлен на модерацию", exact: true});
      await dialog.waitFor();
      assert.equal(calls.filter(call => call.method === "POST" && call.path.endsWith("/publish")).length, 1);
      assert.equal(await dialog.getByRole("link", {name: "Заполнить данные", exact: true}).getAttribute("href"), "/seller/legal");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No overflow at ${width}`);
      await page.screenshot({path: path.join(output, `success-${width}.png`), animations: "disabled"});
      await page.keyboard.press("Escape");
      await dialog.waitFor({state: "hidden"});
      await page.goto(origin + "/seller/products/7/edit");
      await page.reload();
      await page.getByText("Заполните данные магазина до публикации", {exact: true}).waitFor();
      assert.equal(await (await submissionButton(page)).isDisabled(), true);
    }
    // An unavailable readiness API is advisory; the POST remains authoritative.
    reset(); readinessError = true;
    await page.goto(origin + "/seller/products/7/create");
    await page.getByText("Не удалось проверить готовность магазина", {exact: true}).waitFor();
    await submit(page);
    await page.getByRole("dialog", {name: "Товар отправлен на модерацию", exact: true}).waitFor();
    assert.equal(calls.filter(call => call.method === "POST").length, 1);
    // Missing product fields still block submission even with the new store policy.
    reset(); readinessError = false; product.description = "";
    await page.goto(origin + "/seller/products/7/create");
    await page.getByText("Заполните данные магазина до публикации", {exact: true}).waitFor();
    await submit(page);
    await page.getByText("Заполните описание", {exact: true}).first().waitFor();
    assert.equal(calls.filter(call => call.method === "POST").length, 0);
    // Ready stores have no completion warning in either the editor or success dialog.
    reset(); legalCompleted = true; agreementAccepted = true;
    await page.goto(origin + "/seller/products/7/create");
    await submit(page);
    await page.getByRole("dialog", {name: "Товар отправлен на модерацию", exact: true}).waitFor();
    assert.equal(await page.getByText("Заполните данные магазина до публикации", {exact: true}).count(), 0);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({passed: true, widths: [1280,390,320], readinessFailure: true, productValidation: true, completedStore: true}, null, 2));
    console.log("PASS: incomplete store submits once, reminder links before/after/refresh, readiness failure is advisory, product validation retained, ready store has no warning; 1280/390/320 fixture only");
  } catch (error) {
    fs.writeFileSync(path.join(output, "failure.log"), logs);
    fs.writeFileSync(path.join(output, "calls.json"), JSON.stringify(calls, null, 2));
    if (browser) for (const context of browser.contexts()) for (const page of context.pages()) {
      await page.screenshot({path: path.join(output, "failure.png"), fullPage: true}).catch(() => {});
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {windowsHide: true, stdio: "ignore"});
    else child.kill();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
