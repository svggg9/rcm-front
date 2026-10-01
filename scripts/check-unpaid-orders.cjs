/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression. */
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const origin = "http://localhost:13041", api = "http://localhost:19641";
let role = "USER", cancels = 0, refunds = 0, reconciles = 0, recoveries = 0, initializationPending = false;
let executed = 0, retried = 0, confirmed = 0, selectedLate = null;
let operations = [
 { id: 81, paymentId: 1, orderId: 10, orderGroupId: "group", amount: 100, currency: "RUB", status: "PENDING", dispatchState: "READY", dispatchAttempts: 0, requestReference: "11111111-1111-4111-8111-111111111111", externalId: null },
 { id: 82, paymentId: 1, orderId: 10, orderGroupId: "group", amount: 200, currency: "RUB", status: "PENDING", dispatchState: "ACKNOWLEDGED", dispatchAttempts: 0, requestReference: null, externalId: "legacy" },
 { id: 83, paymentId: 1, orderId: 10, orderGroupId: "group", amount: 50, currency: "RUB", status: "PENDING", dispatchState: "SENDING", dispatchAttempts: 1, dispatchedAt: new Date().toISOString(), requestReference: "33333333-3333-4333-8333-333333333333", externalId: null }
];
let returnStatus = "REFUND_PENDING";
const returnRequest = () => ({id:91,orderId:10,productId:1,variantId:1,productTitle:"Товар для возврата",quantity:1,reason:"DEFECT",status:returnStatus,photoUrls:[],requestedAmount:200,approvedRefundAmount:200,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
let late = [1,2].map(paymentId => ({paymentId, externalPaymentId: "bank-"+paymentId, orderGroupId: "group", amount: 500, currency: "RUB", refundedAmount: 0, pendingRefundAmount: 0, paidAt: new Date().toISOString()}));
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
  else if (url.pathname === "/api/orders/10/returns") data = [returnRequest()];
  else if (url.pathname === "/api/orders/10/cancel") {
    cancels++; order = { ...order, paymentAllowed: false, cancellationAllowed: false, unpaidCancellationPending: true, paymentReviewRequired: true }; data = order;
  } else if (url.pathname === "/api/admin/payment-review") data = { content: [{ orderId: 10, orderGroupId: "group", status: "CANCELED", paymentStatus: "FAILED", paymentDueAt: order.paymentDueAt, reservationReleasedAt: new Date().toISOString(), initializationPending, initializationRecoverable: initializationPending, latePaymentId: initializationPending ? null : 1 }], totalElements: 1, totalPages: 1, number: 0 };
  if (url.pathname === "/api/admin/payment-review" && url.searchParams.get("size") === "100") { data.content.push({...data.content[0],orderId:11}); data.totalElements=2; }
  if (url.pathname === "/api/admin/payment-review/group/reconcile") { reconciles++; data = {}; }
  else if (/\/api\/admin\/payment-review\/\d+\/late-refund$/.test(url.pathname)) { refunds++; selectedLate = {orderId: Number(url.pathname.split("/")[4]), paymentId: Number(url.searchParams.get("paymentId"))}; late.find(p => p.paymentId === selectedLate.paymentId).pendingRefundAmount = 500; data = {status: "PENDING"}; }
  else if (url.pathname === "/api/admin/payment-review/late-payments") data = {content: late, totalElements: late.length, totalPages: 1, number: 0};
  else if (url.pathname === "/api/payments/refund-operations") data = {content: operations.filter(r=>r.status === "PENDING"), totalElements: operations.filter(r=>r.status === "PENDING").length, totalPages: 1, number: 0};
  else if (url.pathname.startsWith("/api/payments/refund-operations/")) {
    const id = Number(url.pathname.split("/")[4]), action = url.pathname.split("/")[5], row = operations.find(r=>r.id === id);
    if (action === "execute") { executed++; row.dispatchState="REVIEW"; row.dispatchAttempts=1; row.failureReason="Ответ банка потерян"; }
    else if (action === "retry") { retried++; row.status="SUCCEEDED"; row.dispatchState="ACKNOWLEDGED"; }
    else if (action === "confirm-resolution") {
      confirmed++; let body=""; req.on("data",d=>body+=d); req.on("end",()=>{ const proof=JSON.parse(body); assert.equal(proof.amount,200); assert.equal(proof.currency,"RUB"); assert.equal(proof.requestReference,null); assert.equal(proof.evidence,"Реестр банка 123"); row.status="SUCCEEDED"; res.end(JSON.stringify(row)); }); return;
    }
    data=row;
  }
  else if (url.pathname === "/api/admin/payment-review/group/recover-initialization") { recoveries++; initializationPending = false; data = {}; }
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
    await page.getByText("Возврат денег оформляется", {exact:true}).filter({visible:true}).waitFor();
    returnStatus="REFUNDED";
    await page.getByText("Деньги возвращены", {exact:true}).filter({visible:true}).waitFor({timeout:20000});
    role = "ADMIN";
    await page.goto(origin + "/admin?tab=orders");
    const queue = page.getByRole("region", { name: "Проверка оплат" });
    await queue.getByText("Поздняя оплата", { exact: true }).waitFor();
    await queue.getByRole("button", { name: "Проверить", exact: true }).click();
    await queue.getByText(/Сверка выполнена/).waitFor(); assert.equal(reconciles, 1);
    page.on("dialog", dialog => dialog.accept());
    assert.equal(await queue.getByRole("button", { name: "Вернуть оплату", exact: true }).count(), 0);
    const lateQueue = page.getByRole("region", {name: "Поздние платежи"});
    await lateQueue.getByRole("article", {name: "Поздний платёж №2", exact: true}).getByRole("button", {name:"Выбрать заказ для возврата"}).click();
    await page.getByRole("dialog").getByRole("button", {name:"Возврат по заказу №11"}).click();
    await lateQueue.getByText(/Запрос возврата по платежу №2 создан/).waitFor();
    assert.equal(refunds,1); assert.deepEqual(selectedLate,{orderId:11,paymentId:2});
    assert.equal(late[0].pendingRefundAmount,0);
    const refundQueue = page.getByRole("region", {name:"Очередь возвратов"});
    const ready = refundQueue.getByRole("article", {name:"Возврат №81",exact:true});
    assert.equal(await ready.getByRole("button", {name:"Подтвердить по банковской сверке"}).count(),0);
    const sending = refundQueue.getByRole("article", {name:"Возврат №83",exact:true});
    assert.equal(await sending.getByRole("button").count(),1); // Only the order link; no concurrent sending/proof.
    await ready.getByRole("button", {name:"Отправить возврат",exact:true}).click();
    await ready.getByText("Требует сверки с банком",{exact:true}).waitFor(); assert.equal(executed,1);
    await ready.getByRole("button", {name:"Повторить ту же операцию",exact:true}).click();
    await refundQueue.getByText("Возврат №81: Возврат подтверждён",{exact:true}).waitFor(); assert.equal(retried,1);
    await ready.waitFor({state:"detached"});
    await refundQueue.getByRole("article", {name:"Возврат №82",exact:true}).getByRole("button", {name:"Подтвердить по банковской сверке"}).click();
    const proof = page.getByRole("dialog");
    await proof.getByRole("button", {name:"Подтвердить возврат",exact:true}).click();
    await proof.getByText("Укажите основание банковской сверки",{exact:true}).waitFor(); assert.equal(confirmed,0);
    await proof.getByRole("textbox", {name:"Основание банковской сверки"}).fill("Реестр банка 123");
    await proof.getByRole("button", {name:"Подтвердить возврат",exact:true}).click();
    await refundQueue.getByText("Возврат №82: Возврат подтверждён",{exact:true}).waitFor(); assert.equal(confirmed,1);
    initializationPending = true;
    await queue.getByRole("button", { name: "Обновить", exact: true }).click();
    await queue.getByRole("button", { name: "Восстановить платёж", exact: true }).click();
    await queue.getByText("Поздняя оплата", { exact: true }).waitFor();
    assert.equal(recoveries, 1);
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await queue.evaluate(node => node.scrollWidth > node.clientWidth), false);
      assert.equal(await refundQueue.evaluate(node => node.scrollWidth > node.clientWidth), false);
      assert.equal(await lateQueue.evaluate(node => node.scrollWidth > node.clientWidth), false);
      await page.screenshot({path: require("node:path").join(__dirname,"..","build",`payment-operations-${width}.png`), fullPage: true});
    }
    assert.deepEqual(errors, []);
    console.log("PASS: deadline, cancellation, admin reconciliation/late payment selection/queued refund/retry/manual proof/buyer status polling/initialization recovery, 1280/390/320");
  } catch (error) { console.error(logs.slice(-3000)); throw error; }
  finally { if (browser) await browser.close(); child.kill(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
