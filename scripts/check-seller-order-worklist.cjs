/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
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

async function main() {
  await new Promise(resolve => server.listen(19652, "127.0.0.1", resolve));
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
    browser = await chromium.launch({ headless: true, channel: "msedge" });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin + "/seller/orders");
    const results = page.getByRole("tabpanel", { name: "Все", exact: true });
    await page.getByRole("link", { name: /Подготовить отправку заказа/ }).waitFor();
    assert.equal(await results.locator("article").count(), 5);
    assert.equal(await page.getByRole("button", { name: /Ещё .* товар/ }).count(), 0, "No inline expansion");
    for (const label of ["Нужно отправить", "Не оплачены", "В доставке", "Завершённые", "Отменённые"]) {
      await page.getByRole("tab", { name: label, exact: true }).click();
      assert.equal(await page.getByRole("tabpanel", { name: label, exact: true }).locator("article").count(), 1, label);
    }
    await page.getByRole("tab", { name: "Все", exact: true }).click();
    const search = page.getByPlaceholder("Номер заказа, товар или получатель");
    await search.fill("нет такого заказа");
    await page.getByText("Заказов нет", { exact: true }).waitFor();
    await search.fill("Тестовый");
    assert.equal(await results.locator("article").count(), 5);
    await page.getByRole("tab", { name: "Нужно отправить", exact: true }).click();
    await page.keyboard.press("ArrowRight");
    await page.getByRole("tab", { name: "Не оплачены", exact: true }).waitFor();
    assert.equal(await page.getByRole("tab", { name: "Не оплачены", exact: true }).getAttribute("aria-selected"), "true");
    await page.getByRole("tab", { name: "Все", exact: true }).click();
    fs.mkdirSync(path.resolve("build/order-worklist-screenshots"), { recursive: true });
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "No overflow at " + width);
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
    assert.equal(await search.inputValue(), "Тестовый");
    assert.match(page.url(), /orders$/);
    assert.deepEqual(errors, []);
    console.log("PASS: five order filters, search/empty, keyboard, row navigation/Escape/preserved search, no inline expansion, 1280/390/320 overflow and touch targets; mock API only");
  } catch (error) {
    console.error(logs.slice(-3000));
    throw error;
  } finally {
    if (browser) await browser.close();
    child.kill();
    server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
