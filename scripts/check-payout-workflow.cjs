/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser fixture, no real banking or database access. */
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const origin = "http://localhost:13072";
const api = "http://localhost:19672";
const calls = [];
const payout = { id: 901, sellerId: 77, sellerName: "Студия Север", status: "READY", scheduledDate: "2026-10-25", currency: "RUB",
  grossSalesAmount: 2000, commissionAmount: 300, adjustmentsAmount: 465.44, payoutAmount: 1234.56,
  inn: "7707083893", bankName: "Тестовый банк", bik: "044525225", checkingAccount: "40702810900000001234", correspondentAccount: "30101810400000000225",
  paymentOrderNumber: null, adminComment: null, createdAt: "2026-10-22T12:00:00Z", sentAt: null, paidAt: null, orderCount: 1,
  items: [{ id: 1, type: "ORDER", orderId: 42, grossAmount: 2000, commissionAmount: 300, adjustmentAmount: 465.44, netAmount: 1234.56, description: "Тестовая позиция" }] };
const state = { payout, version: 0, allowedActions: ["BEGIN", "CANCEL"], attempts: [], history: [] };
const transition = { BEGIN: ["IN_PROGRESS", ["SENT", "REVIEW", "FAILED"]], SENT: ["SENT", ["PAID", "REVIEW", "FAILED"]], REVIEW: ["REVIEW", ["PAID", "FAILED"]],
  PAID: ["PAID", []], FAILED: ["FAILED", ["RETRY", "CANCEL"]], RETRY: ["READY", ["BEGIN", "CANCEL"]], CANCEL: ["CANCELLED", []] };
let loseResult = false;
let rejectStale = false;
let readFailure = false;
function apply(action, body) {
  assert.equal(body.expectedVersion, state.version);
  assert(state.allowedActions.includes(action), "Only server-provided actions may be submitted");
  const previous = state.payout.status;
  if (action === "BEGIN") state.attempts.push({ id: 111 + state.attempts.length, number: state.attempts.length + 1, status: "IN_PROGRESS", startedAt: "2026-10-22T12:01:00Z", startedBy: 1, paymentOrderNumber: null, sentAt: null, resolvedAt: null, evidence: null, legacy: false });
  const attempt = state.attempts.at(-1);
  if (["SENT", "PAID", "REVIEW", "FAILED"].includes(action)) assert.equal(body.attemptId, attempt.id);
  if (["BEGIN", "REVIEW", "RETRY", "CANCEL"].includes(action)) assert(body.comment.trim());
  if (["PAID", "FAILED"].includes(action)) assert(body.evidence.trim());
  if (action === "SENT") { assert(body.paymentOrderNumber); attempt.paymentOrderNumber = body.paymentOrderNumber; attempt.sentAt = "2026-10-22T12:02:00Z"; state.payout.paymentOrderNumber = body.paymentOrderNumber; state.payout.sentAt = attempt.sentAt; }
  if (action === "PAID") state.payout.paidAt = "2026-10-22T12:03:00Z";
  if (attempt && action !== "RETRY" && action !== "CANCEL") { attempt.status = transition[action][0]; attempt.evidence = body.evidence || null; }
  state.payout.status = transition[action][0]; state.allowedActions = transition[action][1]; state.version++;
  state.history.push({ id: state.version, attemptId: attempt?.id || null, action, fromStatus: previous, toStatus: state.payout.status, actorId: 1, reason: body.comment || null, evidence: body.evidence || null, createdAt: "2026-10-22T12:03:00Z" });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, api);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.end();
  let raw = ""; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : null;
  calls.push({ method: req.method, path: url.pathname, query: url.search, body });
  let data = [];
  try {
    if (url.pathname === "/api/auth/session") data = { id: 1, username: "admin@example.com", role: "ADMIN" };
    else if (url.pathname === "/api/profile") data = { id: 1, firstName: "Администратор", email: "admin@example.com" };
    else if (url.pathname === "/api/admin/finance/payouts/stats") data = { totalCount: 1, readyAmount: 1234.56, sentAmount: 0, inProgressAmount: 0, reviewAmount: 0, failedAmount: 0, requiresAttentionCount: 0 };
    else if (url.pathname === "/api/admin/finance/payouts/list") {
      const content = !url.searchParams.get("status") || url.searchParams.get("status") === state.payout.status ? [state.payout] : [];
      data = { content, number: 0, totalPages: content.length ? 1 : 0, totalElements: content.length, size: 20 };
    } else if (url.pathname === "/api/admin/finance/payouts/generate") data = { scheduledDate: "2026-10-25", payouts: [], skipped: [{ sellerId: 77, sellerName: "Студия Север", reason: "An active payout already exists for this date" }] };
    else if (url.pathname === `/api/admin/finance/payouts/${state.payout.id}`) {
      if (readFailure) { res.statusCode = 503; data = { message: "secret SQL connection details" }; }
      else data = state;
    } else if (/^\/api\/admin\/finance\/payouts\/\d+\//.test(url.pathname)) {
      const action = url.pathname.split("/").at(-1).toUpperCase();
      if (rejectStale) { rejectStale = false; res.statusCode = 409; data = { message: "PAYOUT_STALE_VERSION" }; }
      else { apply(action, body); data = state.payout; if (loseResult) { loseResult = false; res.statusCode = 503; data = { message: "private gateway internals" }; } }
    } else if (url.pathname === "/api/cart") data = { items: [] };
    else if (url.pathname.includes("/ledger")) data = { content: [], totalElements: 0, totalPages: 0, number: 0 };
    res.end(JSON.stringify(data));
  } catch (error) { res.statusCode = 500; res.end(JSON.stringify({ message: error.message })); }
});

async function main() {
  await new Promise(resolve => server.listen(19672, "127.0.0.1", resolve));
  const root = path.resolve(__dirname, "..");
  const envFile = path.join(root, "next-env.d.ts"); const previousEnv = fs.readFileSync(envFile, "utf8");
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "13072"], {
    cwd: root, windowsHide: true, env: { ...process.env, RCM_TEST_DIST_DIR: "build/payout-workflow-check", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin }, stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = ""; child.stdout.on("data", data => { logs += data; }); child.stderr.on("data", data => { logs += data; });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (child.exitCode !== null) throw Error("Fixture Next stopped: " + logs.slice(-2000));
      try { if ((await fetch(origin + "/admin?tab=finance", { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch { /* Wait for this isolated fixture. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert(ready, logs.slice(-3000));
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } }); const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin + "/admin?tab=finance");
    const row = page.getByRole("article", { name: "Реестр №901", exact: true }); await row.waitFor();
    assert(calls.filter(call => call.path.endsWith("/payouts/list")).every(call => call.query.includes("size=20")), "No second unfiltered payout owner or SSR preload");
    assert.match(await row.innerText(), /1\s?234,56/);
    await page.getByLabel("Статус выплаты", { exact: true }).selectOption("REVIEW");
    await page.getByText("По выбранному статусу выплат пока нет", { exact: true }).waitFor();
    assert(calls.some(call => call.query.includes("status=REVIEW")));
    await page.getByLabel("Статус выплаты", { exact: true }).selectOption("ALL"); await row.waitFor();
    await page.getByRole("button", { name: "Сформировать реестры", exact: true }).click();
    await page.getByText("У продавца уже есть незавершённая выплата", { exact: true }).waitFor();
    await row.getByRole("button", { name: "Состав и действия" }).click();
    let dialog = page.getByRole("dialog", { name: "Реестр №901", exact: true });
    await dialog.getByRole("heading", { name: "Расчёт выплаты" }).waitFor();
    await dialog.getByRole("link", { name: "Заказ №42" }).waitFor();
    assert.match(await dialog.innerText(), /30101810400000000225/);
    async function choose(action) { await dialog.getByLabel("Действие", { exact: true }).selectOption(action); }
    async function confirm(label) {
      await dialog.getByRole("button", { name: label, exact: true }).click();
      const confirmation = page.getByRole("dialog", { name: label, exact: true });
      assert.match(await confirmation.innerText(), /1\s?234,56/);
      await confirmation.getByRole("button", { name: label, exact: true }).click();
      await confirmation.waitFor({ state: "hidden" });
    }
    await choose("BEGIN");
    assert(await dialog.getByRole("button", { name: "Начать обработку", exact: true }).isDisabled());
    await dialog.getByLabel("Причина действия").fill("Выплата за октябрь — проверена бухгалтером");
    rejectStale = true;
    await confirm("Начать обработку");
    await dialog.getByText("Реестр изменён другим оператором — обновите данные перед действием", { exact: true }).waitFor();
    assert.equal(await dialog.getByLabel("Действие", { exact: true }).count(), 0, "No action while version is stale");
    await dialog.getByRole("button", { name: "Обновить реестр", exact: true }).click();
    await choose("BEGIN"); await dialog.getByLabel("Причина действия").fill("Выплата за октябрь");
    await confirm("Начать обработку");
    await dialog.getByText("Попытка №1 · В обработке", { exact: true }).waitFor();
    await choose("SENT");
    assert(await dialog.getByRole("button", { name: "Зафиксировать отправку", exact: true }).isDisabled());
    await dialog.getByLabel("Номер платёжного поручения").fill("P-2026-101");
    await confirm("Зафиксировать отправку");
    await dialog.getByText("Попытка №1 · Отправлена в банк", { exact: true }).waitFor();
    await choose("REVIEW"); await dialog.getByLabel("Причина действия").fill("Банк не вернул результат исполнения");
    await confirm("Передать на сверку");
    await dialog.getByText("Результат перевода неизвестен. Повторная отправка заблокирована до подтверждённого результата банка", { exact: true }).waitFor();
    const actions = await dialog.getByLabel("Действие", { exact: true }).locator("option").evaluateAll(options => options.map(option => option.value));
    assert.deepEqual(actions, ["", "PAID", "FAILED"], "Unknown banking outcome must never offer retry, send or cancel");
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `Dialog overflows at ${width}`);
      await page.screenshot({ path: path.join(root, `build/payout-workflow-${width}.png`) });
    }
    await choose("PAID");
    assert(await dialog.getByRole("button", { name: "Подтвердить выплату", exact: true }).isDisabled());
    await dialog.getByLabel("Основание банковского результата").fill("Выписка №45 от 22.10.2026 — исполнено");
    loseResult = true; readFailure = true;
    await confirm("Подтвердить выплату");
    await dialog.getByText("Не удалось подтвердить результат действия — обновите реестр перед продолжением", { exact: true }).waitFor();
    assert.equal(await dialog.getByLabel("Действие", { exact: true }).count(), 0);
    assert.doesNotMatch(await dialog.innerText(), /private gateway internals|secret SQL/);
    await dialog.getByRole("button", { name: "Обновить реестр", exact: true }).click();
    await dialog.getByText("Не удалось загрузить выплаты — попробуйте ещё раз", { exact: true }).waitFor();
    assert.equal(await dialog.getByLabel("Действие", { exact: true }).count(), 0);
    readFailure = false;
    await dialog.getByRole("button", { name: "Обновить реестр", exact: true }).click();
    await dialog.getByText("Реестр завершён — изменений не требуется", { exact: true }).waitFor();
    assert.equal(calls.filter(call => call.path.endsWith("/paid") && call.method === "POST").length, 1, "Lost success response must not trigger another confirmation");
    assert(state.history.some(event => event.action === "REVIEW"));
    assert.equal(state.attempts[0].paymentOrderNumber, "P-2026-101");
    await dialog.getByRole("button", { name: "Закрыть", exact: true }).last().click();
    Object.assign(state, { payout: { ...structuredClone(payout), id: 902, status: "READY", paymentOrderNumber: null, sentAt: null, paidAt: null },
      version: 0, allowedActions: ["BEGIN", "CANCEL"], attempts: [], history: [] });
    await page.getByRole("button", { name: "Обновить очередь", exact: true }).click();
    await page.getByRole("article", { name: "Реестр №902", exact: true }).getByRole("button", { name: "Состав и действия" }).click();
    dialog = page.getByRole("dialog", { name: "Реестр №902", exact: true });
    await choose("BEGIN"); await dialog.getByLabel("Причина действия").fill("Выплата по проверенным реквизитам"); await confirm("Начать обработку");
    await choose("SENT"); await dialog.getByLabel("Номер платёжного поручения").fill("P-REFUSED"); await confirm("Зафиксировать отправку");
    await choose("FAILED");
    assert(await dialog.getByRole("button", { name: "Подтвердить отказ банка", exact: true }).isDisabled());
    await dialog.getByLabel("Основание банковского результата").fill("Банк подтвердил окончательный отказ — справка №91"); await confirm("Подтвердить отказ банка");
    await choose("RETRY");
    assert(await dialog.getByRole("button", { name: "Подготовить новую попытку", exact: true }).isDisabled());
    await dialog.getByLabel("Причина действия").fill("Отказ проверен, повтор согласован бухгалтером"); await confirm("Подготовить новую попытку");
    await choose("BEGIN"); await dialog.getByLabel("Причина действия").fill("Повтор после окончательного отказа"); await confirm("Начать обработку");
    await dialog.getByText("Попытка №2 · В обработке", { exact: true }).waitFor();
    assert.equal(state.attempts.length, 2);
    assert.equal(state.attempts[0].paymentOrderNumber, "P-REFUSED");
    assert.match(state.attempts[0].evidence, /окончательный отказ/);
    assert(state.history.some(event => event.action === "RETRY"));
    assert.deepEqual(errors, []);
    console.log("Payout workflow browser checks passed: precise amounts, one queue owner, filter, skip reasons, stale version, begin/send/review, evidence, lost result, failed/retry/new attempt with preserved history, 320/390/1280");
  } finally {
    if (browser) await browser.close();
    if (process.platform === "win32" && child.exitCode === null) { try { execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); } catch { /* Fixture process may already have exited. */ } }
    else child.kill("SIGTERM");
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(envFile, previousEnv);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
