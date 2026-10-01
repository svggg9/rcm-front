/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression. */
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const origin = "http://localhost:13041", api = "http://localhost:19641";
let role = "USER", cancels = 0, refunds = 0, reconciles = 0;
let order = { id: 10, orderGroupId: "group", status: "NEW", paymentStatus: "PENDING", paymentMethod: "CARD",
  deliveryStatus: "PENDING", createdAt: new Date().toISOString(), totalAmount: 500, subtotalAmount: 500,
  deliveryAmount: 0, discountAmount: 0, currency: "RUB", recipientName: "Тест", recipientPhone: "79000000000",
  deliveryAddress: "Тест", deliveryMethod: "PICKUP_POINT", items: [], delivery: null, cancellationAllowed: true,
  paymentAllowed: true, paymentDueAt: null, unpaidCancellationPending: false, paymentReviewRequired: false };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, api);
  res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type"); res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Content-Type", "application/json"); if (req.method === "OPTIONS") return res.end();
  let data = [];
  if (url.pathname === "/api/auth/session") data = { id: 70, username: "test", role };
  else if (url.pathname === "/api/profile") data = { id: 70, username: "test", displayName: "Тест", email: "test@example.com", role };
  else if (url.pathname === "/api/orders/10") data = order;
  else if (url.pathname === "/api/orders/10/cancel") {
    cancels++; order = { ...order, paymentAllowed: false, cancellationAllowed: false, unpaidCancellationPending: true, paymentReviewRequired: true }; data = order;
  } else if (url.pathname === "/api/admin/payment-review") data = { content: [{ orderId: 10, orderGroupId: "group", status: "CANCELED", paymentStatus: "FAILED", paymentDueAt: order.paymentDueAt, reservationReleasedAt: new Date().toISOString(), initializationPending: false, latePaymentId: 1 }], totalElements: 1, totalPages: 1, number: 0 };
  else if (url.pathname === "/api/admin/payment-review/group/reconcile") { reconciles++; data = {}; }
  else if (url.pathname === "/api/admin/payment-review/10/late-refund") { refunds++; data = { status: "PENDING" }; }
  else if (url.pathname.includes("/list")) data = { content: [], totalElements: 0, totalPages: 0, number: 0 };
  res.end(JSON.stringify(data));
});
async function main() {
  await new Promise(resolve => server.listen(19641, "127.0.0.1", resolve));
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "13041"], {
    cwd: require("node:path").resolve(__dirname, ".."), windowsHide: true,
    env: { ...process.env, RCM_TEST_DIST_DIR: "build/unpaid-check", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let logs = "", browser;
  child.stdout.on("data", d => { logs += d; }); child.stderr.on("data", d => { logs += d; });
  try {
    for (let i = 0; i < 120; i++) {
      if (child.exitCode != null) throw new Error(logs);
      try { await fetch(origin + "/account?tab=orders&orderId=10", { signal: AbortSignal.timeout(2000) }); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    browser = await chromium.launch({ headless: true, channel: "msedge" });
    const page = await browser.newPage(); const errors = []; page.on("pageerror", error => errors.push(error.message));
    order.paymentDueAt = new Date(Date.now() + 8000).toISOString();
    await page.goto(origin + "/account?tab=orders&orderId=10");
    await page.getByRole("button", { name: "Оплатить", exact: true }).waitFor();
    await page.getByText(/Оплатить до/).filter({ visible: true }).waitFor();
    await page.getByText("Срок оплаты истёк. Проверяем завершение заказа", { exact: true }).filter({ visible: true }).waitFor({ timeout: 15000 });
    assert.equal(await page.getByRole("button", { name: "Оплатить", exact: true }).count(), 0);
    order.paymentDueAt = new Date(Date.now() + 60000).toISOString();
    await page.reload();
    await page.getByRole("button", { name: "Отменить заказ", exact: true }).click();
    await page.getByRole("button", { name: "Да, отменить", exact: true }).click();
    await page.getByText("Отмена оформляется", { exact: true }).filter({ visible: true }).waitFor();
    assert.equal(cancels, 1); assert.equal(await page.getByRole("button", { name: "Оплатить", exact: true }).count(), 0);
    role = "ADMIN";
    await page.goto(origin + "/admin?tab=orders");
    const queue = page.getByRole("region", { name: "Проверка оплат" });
    await queue.getByText("Поздняя оплата", { exact: true }).waitFor();
    await queue.getByRole("button", { name: "Проверить", exact: true }).click();
    await queue.getByText(/Сверка выполнена/).waitFor(); assert.equal(reconciles, 1);
    page.on("dialog", dialog => dialog.accept());
    await queue.getByRole("button", { name: "Вернуть оплату", exact: true }).click();
    await queue.getByText(/Запрос возврата создан/).waitFor(); assert.equal(refunds, 1);
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await queue.evaluate(node => node.scrollWidth > node.clientWidth), false);
    }
    assert.deepEqual(errors, []);
    console.log("PASS: payment deadline disables payment, unpaid cancellation shows reconciliation, admin queue/reconcile/confirmed refund, 1280/390/320");
  } catch (error) { console.error(logs.slice(-3000)); throw error; }
  finally { if (browser) await browser.close(); child.kill(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
