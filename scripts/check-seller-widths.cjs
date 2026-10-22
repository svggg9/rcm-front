/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const origin = "http://localhost:13053";
const api = "http://localhost:19653";
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
  if (url.pathname === "/api/seller/legal-info") { res.statusCode = 204; return res.end(); }
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

async function main() {
  await new Promise(resolve => server.listen(19653, "127.0.0.1", resolve));
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "13053"], {
    cwd: path.resolve(__dirname, ".."), windowsHide: true,
    env: { ...process.env, RCM_TEST_DIST_DIR: "build/seller-width-check", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin }, stdio: ["ignore", "pipe", "pipe"]
  });
  let logs = "";
  child.stdout.on("data", data => { logs += data; });
  child.stderr.on("data", data => { logs += data; });
  let browser;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      if (child.exitCode !== null) throw new Error("Next exited: " + logs);
      try { await fetch(origin + "/seller/home", { signal: AbortSignal.timeout(2000) }); ready = true; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    assert.ok(ready);
    browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : { headless: true, channel: "msedge" });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    fs.mkdirSync(path.resolve("build/seller-width-screenshots"), { recursive: true });
    for (const width of [1920, 1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const section of ["home", "products", "orders", "returns", "finance", "store", "legal"]) {
        await page.goto(origin + "/seller/" + section);
        await page.waitForLoadState("networkidle");
        const geometry = await page.locator("[data-seller-shell]").evaluate(shell => {
          const content = shell.querySelector("[data-seller-content]");
          const body = shell.querySelector("[data-seller-section-body]");
          const rect = node => { const box = node.getBoundingClientRect(); return { left: box.left, width: box.width }; };
          const children = [...body.children].filter(node => !node.hidden && node.getClientRects().length).map(rect);
          return { shell: rect(shell), content: rect(content), body: rect(body), header: rect(document.querySelector('[data-seller-header-inner]')), children, availableWidth: document.body.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        const gutter = width <= 768 ? 16 : 32;
        const expected = Math.min(1200, geometry.availableWidth - gutter * 2);
        assert.ok(Math.abs(geometry.shell.width - expected) < 1, section + " shell width at " + width + ": " + JSON.stringify(geometry));
        for (const box of [geometry.header, geometry.content, geometry.body, ...geometry.children]) {
          assert.ok(Math.abs(box.width - geometry.shell.width) < 1, section + " content width at " + width + ": " + JSON.stringify(geometry));
          assert.ok(Math.abs(box.left - geometry.shell.left) < 1, section + " left edge at " + width);
        }
        assert.equal(geometry.overflow, false, section + " overflow at " + width);
        if (section === "store") {
          const form = await page.locator("#seller-brand-profile").boundingBox();
          assert.ok(Math.abs(form.x - geometry.shell.left) < 1, "Store form left");
          assert.ok(form.width <= Math.min(800, geometry.shell.width) + 1, "Store form stays in the main column");
          assert.equal(await page.locator("[data-store-actions]").count(), 0, "Clean store has no save bar");
          const preview = await page.getByRole("complementary", { name: "Профиль на витрине" }).boundingBox();
          if (width > 800) {
            assert.ok(preview, "Desktop store preview is visible");
            assert.ok(preview.x > form.x + form.width, "Store preview stays to the right of the form");
            assert.ok(preview.x + preview.width <= geometry.shell.left + geometry.shell.width + 1, "Store preview stays within the common shell");
          } else assert.equal(preview, null, "Compact store uses a single column");
          const description = page.getByRole("textbox", { name: "Описание", exact: true });
          const savedDescription = await description.inputValue();
          await description.fill(savedDescription + " — проверка изменений");
          await page.locator("[data-store-actions]").waitFor({ state: "visible" });
          const actions = await page.locator("[data-store-actions]").boundingBox();
          assert.ok(Math.abs(actions.x - geometry.shell.left) < 1, "Store actions align to the common shell");
          assert.ok(Math.abs(actions.width - geometry.shell.width) < 1, "Store actions use the full shared width");
          await page.getByRole("button", { name: "Отменить", exact: true }).click();
          await page.locator("[data-store-actions]").waitFor({ state: "detached" });
          assert.equal(await description.inputValue(), savedDescription, "Cancel restores the saved description without an API mutation");
        }
        if (section === "legal") {
          const form = await page.locator("[data-seller-section-body] form").boundingBox();
          assert.ok(Math.abs(form.x - geometry.shell.left) < 1, "Legal form left");
          assert.ok(form.width <= 1120);
        }
        if (width === 1920 || width === 1280 || width === 390 || (section === "home" && width === 320)) await page.screenshot({ path: "build/seller-width-screenshots/" + section + "-" + width + ".png" });
      }
    }
    assert.deepEqual(errors, []);
    console.log("PASS: seven seller sections share header/shell/content edges with a 1200px maximum at 1920/1280/768/390/320; no overflow; store main/preview fit the shell and its dirty save bar shares the full width; mock API only");
  } catch (error) { console.error(logs.slice(-2500)); throw error; }
  finally { if (browser) await browser.close(); child.kill(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
