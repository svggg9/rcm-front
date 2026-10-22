/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const origin = "http://localhost:13052";
const api = "http://localhost:19652";
const calls = [];
const item = { productId: 1, variantId: 1, productTitle: "Тестовый товар", brandName: "Бренд", quantity: 1, price: 500, lineTotal: 500, imageUrl: null, size: "M", color: "Чёрный" };
const order = { id: 10, orderGroupId: "test", status: "PROCESSING", paymentStatus: "PAID", deliveryStatus: "READY_FOR_SHIPMENT", createdAt: "2026-09-19T10:00:00Z", totalAmount: 500, subtotalAmount: 500, deliveryAmount: 0, discountAmount: 0, currency: "RUB", recipientName: "Тест", items: [item], firstProductTitle: item.productTitle, itemsCount: 1, delivery: null };
order.productTitles = [item.productTitle, "Второй товар", "Третий товар"];
const orders = [
  order,
  { ...order, id: 11, status: "CONFIRMED", paymentStatus: "PENDING", deliveryStatus: "PENDING" },
  { ...order, id: 12, status: "SHIPPED", deliveryStatus: "IN_TRANSIT" },
  { ...order, id: 13, status: "COMPLETED", deliveryStatus: "DELIVERED" },
  { ...order, id: 14, status: "CANCELED", paymentStatus: "CANCELED", deliveryStatus: "CANCELLED" },
];
order.items = [item, { ...item, productTitle: "Второй товар" }, { ...item, productTitle: "Третий товар" }];
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
  else if (url.pathname === "/api/seller/orders/list") data = { content: orders, totalElements: orders.length, totalPages: 1, number: 0 };
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
  else if (url.pathname === "/api/seller/finance/payouts" || url.pathname === "/api/seller/finance/operations") data = { content: [], totalElements: 0, totalPages: 0, number: 0 };
  else if (url.pathname === "/api/seller/dashboard-summary") data = { activeProducts: 0, attentionProducts: 0, totalProducts: 0, readyOrders: 0, activeOrders: 0, totalOrders: 0, estimatedBalance: 0, salesAmount: 0, commissionAmount: 0, availablePayout: 0, processingPayout: 0, inPayoutAmount: 0, failedPayouts: 0, telegramLinked: false, supportTelegramUrl: null, recentEvents: [] };
  else if (url.pathname === "/api/cart") data = { items: [] };
  res.end(JSON.stringify(data));
});

function checkSharedPresentation() {
  const ts = require("typescript");
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const Module = require("node:module");
  const originalLoad = Module._load;
  const originalExtensions = Object.fromEntries([".css", ".ts", ".tsx"].map(extension => [extension, require.extensions[extension]]));
  try {
    require.extensions[".css"] = module => {
      module.exports = { __esModule: true, default: new Proxy({}, { get: (_target, key) => key }) };
    };
    for (const extension of [".ts", ".tsx"]) {
      require.extensions[extension] = (module, filename) => {
        module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
          fileName: filename,
          compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
        }).outputText, filename);
      };
    }
    Module._load = function(name, ...args) {
      if (name.startsWith("@/")) return originalLoad.call(this, path.resolve(__dirname, "..", name.slice(2)), ...args);
      return originalLoad.call(this, name, ...args);
    };
    const { SellerOrdersTab } = require("../app/seller/components/SellerOrdersTab.tsx");
    const props = { orders: [], buildSellerStatusLabel: () => "В обработке" };
    const defaultHtml = renderToStaticMarkup(React.createElement(SellerOrdersTab, props));
    assert.doesNotMatch(defaultHtml, /<h1\b/, "The shared default presentation used by admin does not add a page heading");
    assert.match(defaultHtml, /role="tablist"/, "The default presentation keeps its existing tab navigation");
    assert.match(defaultHtml, /<button(?=[^>]*id="seller-order-filter-ALL")(?=[^>]*aria-selected="true")[^>]*>/, "The shared default/admin presentation still opens with All selected");
    assert.match(defaultHtml, /placeholder="Номер заказа, товар или получатель"/);
    for (const presentation of [undefined, "cabinet"]) {
      const buyerHtml = renderToStaticMarkup(React.createElement(SellerOrdersTab, { ...props, audience: "buyer", presentation }));
      assert.doesNotMatch(buyerHtml, /<h1\b|role="radiogroup"|role="tablist"|aria-label="Поиск заказов"/, "Buyer presentation does not inherit seller navigation or heading");
    }
    const cabinetHtml = renderToStaticMarkup(React.createElement(SellerOrdersTab, { ...props, presentation: "cabinet" }));
    assert.equal((cabinetHtml.match(/<h1\b/g) || []).length, 1, "Only the seller cabinet adds its section heading");
    assert.match(cabinetHtml, /role="radiogroup"/);
    assert.match(cabinetHtml, /<button(?=[^>]*role="radio")(?=[^>]*aria-checked="true")[^>]*>Нужно отправить<\/button>/, "The seller cabinet starts with Needs shipment selected");
    assert.match(cabinetHtml, /aria-label="Список заказов"/);
  } finally {
    Module._load = originalLoad;
    for (const [extension, handler] of Object.entries(originalExtensions)) {
      if (handler) require.extensions[extension] = handler;
      else delete require.extensions[extension];
    }
  }
}

async function main() {
  checkSharedPresentation();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(19652, "127.0.0.1", resolve);
  });
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "13052"], {
    cwd: path.resolve(__dirname, ".."), windowsHide: true,
    env: { ...process.env, RCM_TEST_DIST_DIR: "build/order-worklist-check", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin }, stdio: ["ignore", "pipe", "pipe"]
  });
  let logs = "";
  child.stdout.on("data", data => { logs += data; });
  child.stderr.on("data", data => { logs += data; });
  let browser;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      if (child.exitCode !== null) throw new Error("Next exited: " + logs);
      try { await fetch(origin + "/seller/orders", { signal: AbortSignal.timeout(2000) }); ready = true; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    assert.ok(ready, "Next must start");
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : { channel: "msedge" }) });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin + "/seller/orders");
    const results = page.getByRole("region", { name: "Список заказов", exact: true });
    const filters = page.getByRole("radiogroup", { name: "Фильтр заказов", exact: true });
    await page.getByRole("heading", { name: "Заказы", level: 1, exact: true }).waitFor();
    await page.getByRole("link", { name: /Подготовить отправку заказа/ }).waitFor();
    assert.equal(await filters.getByRole("radio", { name: "Нужно отправить", exact: true }).getAttribute("aria-checked"), "true", "Needs shipment is the default seller filter");
    assert.equal(await results.locator("article").count(), 1, "The initial seller worklist only contains the ready order");
    await filters.getByRole("radio", { name: "Все", exact: true }).click();
    assert.equal(await results.locator("article").count(), 5);
    assert.equal(await page.getByRole("button", { name: /Ещё .* товар/ }).count(), 0, "No inline expansion");
    for (const label of ["Нужно отправить", "Не оплачены", "В доставке", "Завершённые", "Отменённые"]) {
      await filters.getByRole("radio", { name: label, exact: true }).click();
      assert.equal(await results.locator("article").count(), 1, label);
    }
    await filters.getByRole("radio", { name: "Все", exact: true }).click();
    const search = page.getByPlaceholder("Номер заказа, товар или получатель");
    const searchTrigger = page.getByRole("button", { name: "Поиск заказов", exact: true });
    await searchTrigger.click();
    const searchPanel = page.getByRole("dialog", { name: "Поиск заказов", exact: true });
    await searchPanel.waitFor();
    assert.equal(await search.evaluate(element => element === document.activeElement), true, "Opening search focuses its input");
    await search.fill("нет такого заказа");
    await page.getByText("Заказов нет", { exact: true }).waitFor();
    await search.fill("Тестовый");
    assert.equal(await results.locator("article").count(), 5);
    await page.keyboard.press("Escape");
    await searchPanel.waitFor({ state: "hidden" });
    assert.equal(await searchTrigger.evaluate(element => element === document.activeElement), true, "Escape restores search trigger focus");
    await filters.getByRole("radio", { name: "Нужно отправить", exact: true }).click();
    await page.keyboard.press("ArrowRight");
    assert.equal(await filters.getByRole("radio", { name: "Не оплачены", exact: true }).getAttribute("aria-checked"), "true");
    assert.equal(await results.locator("article").count(), 1);
    await filters.getByRole("radio", { name: "Все", exact: true }).click();
    fs.mkdirSync(path.resolve("build/order-worklist-screenshots"), { recursive: true });
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "No overflow at " + width);
      const headingBox = await page.getByRole("heading", { name: "Заказы", level: 1, exact: true }).boundingBox();
      const resultsBox = await results.boundingBox();
      assert.ok(Math.abs(headingBox.x - resultsBox.x) <= 2, "The heading aligns with the list at " + width);
      const action = page.getByRole("link", { name: /Подготовить отправку заказа/ });
      assert.ok((await action.boundingBox()).height >= 44);
      await page.screenshot({ path: "build/order-worklist-screenshots/orders-" + width + ".png", fullPage: true });
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
    const title = results.locator("article").first().getByText("Тестовый товар", { exact: true });
    await title.scrollIntoViewIfNeeded();
    const titleBox = await title.boundingBox();
    await page.mouse.click(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2);
    await page.getByRole("dialog").waitFor();
    assert.match(page.url(), /orders\/10$/);
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await searchTrigger.click();
    await searchPanel.waitFor();
    assert.equal(await search.inputValue(), "Тестовый");
    await page.keyboard.press("Escape");
    assert.match(page.url(), /orders$/);
    assert.deepEqual(errors, []);
    console.log("PASS: seller defaults to Needs shipment/All restores five orders, radio filters/region, search popover focus/Escape/empty, keyboard, row navigation/Escape/preserved search, no inline expansion, 1280/390/320 overflow/touch targets, shared default/admin All and buyer presentations; mock API only");
  } catch (error) {
    console.error(logs.slice(-3000));
    throw error;
  } finally {
    if (browser) await browser.close();
    if (child.pid && child.exitCode === null) {
      if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
      else child.kill();
    }
    server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
