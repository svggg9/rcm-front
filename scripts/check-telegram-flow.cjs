/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression, no real backend or Telegram requests. */
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const ts = require("typescript");
require.extensions[".ts"] = (loaded, filename) => loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);
const { telegramUrl, telegramLinkPending, mergeTelegramStatus } = require("../app/lib/telegram.ts");
for (const unsafe of ["javascript:alert(1)", "https://t.me.evil.example/bot", "https://user@t.me/bot", "http://t.me/bot", "https://t.me:8443/bot"]) assert.equal(telegramUrl(unsafe), null);
const pending = { linked: false, telegramUsername: null, status: "PENDING", url: "https://t.me/rcmarket_test_bot?start=test", expiresAt: "2026-10-19T20:10:00Z" };
const legacy = { linked: false, telegramUsername: null, url: null, expiresAt: null };
const now = Date.parse("2026-10-19T20:00:00Z");
assert(telegramLinkPending(pending, now));
assert.equal(mergeTelegramStatus(pending, legacy, now).url, pending.url);
assert.equal(mergeTelegramStatus({ ...pending, linked: true, status: "RELINK_PENDING" }, { ...legacy, linked: true }, now).url, pending.url);
assert.equal(mergeTelegramStatus(pending, { ...legacy, status: "UNLINKED" }, now).url, null);
assert.equal(mergeTelegramStatus(pending, { ...legacy, linked: true, status: "LINKED" }, now).url, null);
assert.equal(mergeTelegramStatus({ ...legacy, status: "EXPIRED" }, legacy, now).status, "EXPIRED");
assert(!telegramLinkPending(pending, now + 600001));
const origin = "http://localhost:13076";
const api = "http://localhost:19676";
const root = path.resolve(__dirname, "..");
const calls = [];
const stamp = "2026-10-19T20:00:00Z";
const empty = () => ({ linked: false, telegramUsername: null, url: null, expiresAt: null, status: "UNLINKED", botUsername: "rcmarket_test_bot", linkEnvironment: "test" });
let status = empty();
let role = "SELLER";
let statusFailure = false;
let linkFailure = false;
let unlinkFailure = false;
let delayedStatusRead = null;
let legacyGet = false;
let linkTtl = 60000;
let enabled = false;
let replies = [];
let replyStatus = "SENDING";
const pageResult = content => ({ content, number: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0 });
const legal = { id: 1, sellerId: 1, sellerType: "IP", inn: "", contactName: "", phone: "", agreementAccepted: false };
const telegramContact = { id: 301, name: "Анна", email: null, channel: "TELEGRAM", telegramUsername: "anna", topic: "OTHER", message: "Подскажите по заказу", status: "NEW", createdAt: stamp, updatedAt: stamp };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, api);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end();
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : null;
  calls.push({ method: req.method, path: url.pathname, body });
  let result = [];
  if (url.pathname === "/api/auth/session") result = { id: 1, username: "seller@example.test", role };
  else if (url.pathname === "/api/profile") result = { id: 1, displayName: "Тестовый продавец", email: "seller@example.test" };
  else if (url.pathname === "/api/cart") result = { items: [] };
  else if (url.pathname === "/api/profile/telegram") {
    if (req.method === "DELETE") { await new Promise(resolve => setTimeout(resolve, 300)); if (!unlinkFailure) status = empty(); }
    if (req.method === "DELETE" && unlinkFailure) { res.statusCode = 503; result = { message: "RAW_PRIVATE_MARKER" }; }
    else if (req.method === "GET" && delayedStatusRead) {
      const read = delayedStatusRead;
      delayedStatusRead = null;
      read.started();
      await read.hold;
      result = read.status;
    }
    else if (statusFailure && req.method === "GET") { res.statusCode = 503; result = { message: "RAW_PRIVATE_MARKER" }; }
    else if (legacyGet && req.method === "GET") result = { linked: false, telegramUsername: null, url: null, expiresAt: null };
    else {
      if (status.url && Date.parse(status.expiresAt) <= Date.now()) status = { ...status, url: null, status: "EXPIRED" };
      result = status;
    }
  } else if (url.pathname === "/api/profile/telegram/link") {
    await new Promise(resolve => setTimeout(resolve, 150));
    if (linkFailure) { res.statusCode = 503; result = { message: "RAW_PRIVATE_MARKER" }; }
    else result = status = { ...status, url: "https://t.me/rcmarket_test_bot?start=seller_test_fixture", expiresAt: new Date(Date.now() + linkTtl).toISOString(), status: status.linked ? "RELINK_PENDING" : "PENDING" };
  } else if (url.pathname === "/api/seller/notification-preferences") {
    if (req.method === "PUT") enabled = body.telegramEnabled;
    result = { email: "seller@example.test", emailEnabled: false, telegramEnabled: enabled, telegramLinked: status.linked, telegramUsername: status.telegramUsername };
  } else if (url.pathname === "/api/seller/legal-info") result = { ...legal, ...body };
  else if (url.pathname === "/api/seller/brands") result = [{ id: 1, name: "Тестовый магазин", slug: "test", description: "Описание", wordmarkUrl: "/examples/versace-wordmark.svg" }];
  else if (url.pathname === "/api/seller/onboarding-status") result = { applicationCompleted: true, brandCompleted: true, legalCompleted: true, agreementAccepted: true, progress: 100, totalSteps: 4, completedSteps: 4 };
  else if (url.pathname === "/api/seller/dashboard-summary") result = { activeProducts: 0, attentionProducts: 0, totalProducts: 0, readyOrders: 0, activeOrders: 0, totalOrders: 0, availablePayout: 0, processingPayout: 0, inPayoutAmount: 0, telegramLinked: status.linked, telegramEnabled: enabled, supportTelegramUrl: "https://t.me/rcmarket_test_bot?start=support_test", recentEvents: [] };
  else if (url.pathname === "/api/seller/application" || url.pathname === "/api/seller-applications/me") result = { id: 1, status: "NEW", createdAt: stamp };
  else if (url.pathname === "/api/admin/contact-messages") result = pageResult([telegramContact]);
  else if (url.pathname === "/api/admin/contact-messages/301/replies") {
    if (req.method === "POST") {
      assert.match(body.requestId, /^[0-9a-f-]{36}$/i);
      await new Promise(resolve => setTimeout(resolve, 150));
      result = { id: 601, contactMessageId: 301, body: body.body, recipientEmail: null, channel: "TELEGRAM", recipientChatId: "123", deliveryMessageId: null, authorId: 1, authorName: "Администратор", status: replyStatus, createdAt: stamp, updatedAt: stamp, attempts: 0, canRetry: false, sentAt: null };
      replies.push(result);
    } else result = replies;
  } else if (/\/list$/.test(url.pathname) || url.pathname === "/api/seller/dashboard/tasks") result = pageResult([]);
  res.end(JSON.stringify(result));
});

async function main() {
  await new Promise(resolve => server.listen(19676, "127.0.0.1", resolve));
  const nextEnv = path.join(root, "next-env.d.ts");
  const originalEnv = fs.existsSync(nextEnv) ? fs.readFileSync(nextEnv, "utf8") : null;
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "13076"], {
    cwd: root, windowsHide: true, env: { ...process.env, RCM_TEST_DIST_DIR: "build/telegram-flow-next", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin }, stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", chunk => { logs += chunk; });
  child.stderr.on("data", chunk => { logs += chunk; });
  let browser;
  try {
    let ready = false;
    for (let step = 0; step < 100; step++) {
      if (child.exitCode !== null) throw Error(logs.slice(-2500));
      try { if ((await fetch(origin + "/contacts", { signal: AbortSignal.timeout(1500) })).ok) { ready = true; break; } } catch { /* Isolated startup only. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert(ready);
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => { window.open = () => { throw Error("No automatic Telegram popup allowed"); }; });
    status = { ...empty(), linked: true, telegramUsername: "known_seller", status: "LINKED" };
    enabled = true;
    statusFailure = true;
    await page.goto(origin + "/seller/legal?section=contacts");
    const notification = page.getByRole("region", { name: "Уведомления", exact: true });
    await notification.getByText("Не удалось проверить подключение Telegram", { exact: true }).waitFor();
    assert(!await page.getByText("RAW_PRIVATE_MARKER").count());
    assert.equal(await notification.getByRole("checkbox", { name: "Telegram", exact: true }).isChecked(), true);
    assert.equal(await notification.getByText("Аккаунт не подключён", { exact: true }).count(), 0, "Failed status read must not imply an unlinked account");
    assert.equal(await notification.getByRole("button", { name: "Подключить Telegram", exact: true }).count(), 0);
    statusFailure = false;
    await notification.getByRole("button", { name: "Повторить проверку", exact: true }).click();
    await notification.getByText("@known_seller подключён", { exact: true }).waitFor();
    status = empty(); enabled = false;
    await page.reload();
    const connect = notification.getByRole("button", { name: "Подключить Telegram", exact: true });
    await connect.waitFor();
    const beforeLink = calls.filter(call => call.path.endsWith("/telegram/link")).length;
    await connect.evaluate(button => { button.click(); button.click(); });
    const botLink = notification.getByRole("link", { name: "Открыть бота", exact: true });
    await botLink.waitFor();
    assert.equal(calls.filter(call => call.path.endsWith("/telegram/link")).length, beforeLink + 1);
    assert.match(await botLink.getAttribute("href"), /^https:\/\/t.me\/rcmarket_test_bot\?start=/);
    assert.equal(await notification.getByRole("checkbox", { name: "Telegram", exact: true }).isChecked(), false);
    legacyGet = true;
    await notification.getByRole("button", { name: "Проверить подключение", exact: true }).click();
    await page.waitForTimeout(200);
    assert(await botLink.isVisible(), "Legacy null URL must not discard a live link");
    legacyGet = false;
    await page.reload();
    await botLink.waitFor();
    assert.equal(calls.filter(call => call.path.endsWith("/telegram/link")).length, beforeLink + 1, "Refresh restores pending status without POST");
    await page.goto(origin + "/seller/home");
    await page.goBack();
    await botLink.waitFor();
    assert.equal(calls.filter(call => call.path.endsWith("/telegram/link")).length, beforeLink + 1, "Back restores a pending link without creating another");
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Telegram flow overflow at ${width}`);
      fs.mkdirSync(path.join(root, "build/telegram-flow-screenshots"), { recursive: true });
      await notification.screenshot({ path: path.join(root, `build/telegram-flow-screenshots/pending-${width}.png`) });
    }
    linkTtl = 1200;
    await notification.getByRole("button", { name: "Новая ссылка", exact: true }).click();
    await notification.getByRole("button", { name: "Отменить подключение", exact: true }).click();
    await notification.getByRole("group", { name: "Подтвердить отвязку Telegram", exact: true }).waitFor();
    await notification.getByText("Срок ссылки истёк — создайте новую", { exact: true }).waitFor();
    linkTtl = 60000;
    linkFailure = true;
    await notification.getByRole("button", { name: "Создать новую ссылку", exact: true }).click();
    await notification.getByText("Не удалось создать ссылку подключения", { exact: true }).waitFor();
    assert(!await page.getByText("RAW_PRIVATE_MARKER").count());
    linkFailure = false;
    await notification.getByRole("button", { name: "Создать новую ссылку", exact: true }).click();
    await botLink.waitFor();
    assert.equal(await notification.getByRole("group", { name: "Подтвердить отвязку Telegram", exact: true }).count(), 0, "Expired confirmation must not apply to a new link");
    status = { ...empty(), linked: true, telegramUsername: "seller_fixture", status: "LINKED" };
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await notification.getByText("@seller_fixture подключён", { exact: true }).waitFor();
    const channel = notification.getByRole("checkbox", { name: "Telegram", exact: true });
    assert.equal(await channel.isChecked(), false, "Linking does not implicitly enable notifications");
    await channel.focus();
    await channel.press("Space");
    const preferenceSaved = page.waitForResponse(response => response.url() === api + "/api/seller/notification-preferences" && response.request().method() === "PUT");
    const legalWrites = calls.filter(call => call.path === "/api/seller/legal-info" && call.method === "PUT").length;
    await notification.getByRole("button", { name: "Сохранить уведомления", exact: true }).click();
    await preferenceSaved;
    assert.equal(enabled, true);
    assert.equal(calls.filter(call => call.path === "/api/seller/legal-info" && call.method === "PUT").length, legalWrites, "Notification save must work with empty legal data and never PUT the legal form");
    await channel.focus();
    await channel.press("Space");
    const disabledSaved = page.waitForResponse(response => response.url() === api + "/api/seller/notification-preferences" && response.request().method() === "PUT");
    await notification.getByRole("button", { name: "Сохранить уведомления", exact: true }).click();
    await disabledSaved;
    await page.reload();
    await notification.getByText("@seller_fixture подключён", { exact: true }).waitFor();
    assert.equal(await channel.isChecked(), false, "Turning notifications off survives refresh without unlinking");
    assert.equal(status.linked, true);
    await channel.focus();
    await channel.press("Space");
    const enabledSaved = page.waitForResponse(response => response.url() === api + "/api/seller/notification-preferences" && response.request().method() === "PUT");
    await notification.getByRole("button", { name: "Сохранить уведомления", exact: true }).click();
    await enabledSaved;
    await notification.getByRole("button", { name: "Отвязать", exact: true }).click();
    const beforeDelete = calls.filter(call => call.method === "DELETE").length;
    await notification.getByRole("button", { name: "Нет", exact: true }).click();
    assert.equal(await notification.getByRole("button", { name: "Отвязать", exact: true }).evaluate(button => button === document.activeElement), true);
    assert.equal(calls.filter(call => call.method === "DELETE").length, beforeDelete);
    status = { ...status, deliveryStatus: "UNAVAILABLE", lastDeliveryErrorCode: "TELEGRAM_BLOCKED" };
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await notification.getByText("Доставка недоступна — проверьте, что бот не заблокирован, или подключите другой аккаунт", { exact: true }).waitFor();
    await notification.getByRole("button", { name: "Сменить аккаунт", exact: true }).click();
    await botLink.waitFor();
    await notification.getByText("@seller_fixture пока подключён — подтвердите новый аккаунт в боте", { exact: true }).waitFor();
    assert.equal(await channel.isChecked(), true);
    status = { ...empty(), linked: true, telegramUsername: "new_seller", status: "LINKED" };
    const beforeHiddenRead = calls.filter(call => call.path === "/api/profile/telegram" && call.method === "GET").length;
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(150);
    assert.equal(calls.filter(call => call.path === "/api/profile/telegram" && call.method === "GET").length, beforeHiddenRead, "Hidden page does not poll on focus or visibility events");
    await page.evaluate(() => Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }));
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await notification.getByText("@new_seller подключён", { exact: true }).waitFor();
    assert.equal(await botLink.count(), 0, "Completed relink clears the pending URL and shows the new account");
    assert.equal(await channel.isChecked(), true, "Relink preserves the saved notification preference");
    await page.reload();
    await notification.getByText("@new_seller подключён", { exact: true }).waitFor();
    await notification.getByRole("button", { name: "Сменить аккаунт", exact: true }).click();
    await botLink.waitFor();
    unlinkFailure = true;
    await notification.getByRole("button", { name: "Отключить Telegram", exact: true }).click();
    await notification.getByText("Отключить текущий аккаунт и отменить новую ссылку?", { exact: true }).waitFor();
    await notification.getByRole("button", { name: "Да", exact: true }).click();
    await notification.getByText("Не удалось отвязать Telegram", { exact: true }).waitFor();
    assert.equal(status.linked, true, "Failed unlink preserves the current account and pending link");
    assert(await botLink.isVisible());
    assert.equal(await page.getByText("RAW_PRIVATE_MARKER").count(), 0);
    unlinkFailure = false;
    let releaseRead;
    let startedRead;
    const started = new Promise(resolve => { startedRead = resolve; });
    delayedStatusRead = { status: { ...status }, started: startedRead, hold: new Promise(resolve => { releaseRead = resolve; }) };
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await started;
    await notification.getByRole("button", { name: "Отключить Telegram", exact: true }).click();
    const deletion = page.waitForRequest(request => request.url() === api + "/api/profile/telegram" && request.method() === "DELETE");
    await notification.getByRole("button", { name: "Да", exact: true }).evaluate(button => { button.click(); button.click(); });
    await deletion;
    assert.equal(await notification.getByRole("button", { name: "Новая ссылка", exact: true }).isDisabled(), true, "All mutations are disabled during unlink");
    releaseRead();
    await notification.getByText("Аккаунт не подключён", { exact: true }).waitFor();
    assert.equal(calls.filter(call => call.method === "DELETE").length, beforeDelete + 2, "One failed attempt and one retry, no double DELETE");
    assert.equal(await botLink.count(), 0, "A stale status read cannot restore a cancelled pending link");
    assert.equal(enabled, true, "Unlink preserves the independent preference");
    assert.equal(await channel.isChecked(), true, "Saved selection is visible even without a linked account");
    await notification.getByText("Выбор Telegram сохранён — уведомления возобновятся после подключения аккаунта", { exact: true }).waitFor();

    await connect.click();
    await botLink.waitFor();
    await notification.getByRole("button", { name: "Отменить подключение", exact: true }).click();
    await notification.getByRole("button", { name: "Да", exact: true }).click();
    await notification.getByText("Аккаунт не подключён", { exact: true }).waitFor();

    await page.goto(origin + "/seller/home");
    await page.getByRole("link", { name: "Поддержка в Telegram →", exact: true }).waitFor();
    assert.match(await page.getByRole("link", { name: "Telegram Не подключён", exact: true }).getAttribute("href"), /legal\?section=contacts/);

    role = "BUYER";
    status = { ...empty(), status: "PENDING", url: "https://t.me/rcmarket_test_bot?start=seller_test_fixture", expiresAt: new Date(Date.now() + 60000).toISOString() };
    await page.goto(origin + "/seller/apply");
    await page.getByRole("heading", { name: "Получить решение в Telegram", exact: true }).waitFor();
    await page.getByRole("link", { name: "Открыть бота", exact: true }).waitFor();
    status = { ...empty(), linked: true, status: "LINKED", telegramUsername: "applicant" };
    await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
    await page.getByText("@applicant подключён", { exact: true }).waitFor();

    role = "ADMIN";
    await page.goto(origin + "/admin?tab=contact-messages");
    const card = page.getByRole("article", { name: "Обращение №301", exact: true });
    await card.getByText("Telegram", { exact: true }).waitFor();
    assert.equal(await card.locator('a[href^="mailto:"]').count(), 0);
    await card.getByRole("button", { name: "Ответить", exact: true }).click();
    const answer = card.getByRole("textbox", { name: /^Ответ на обращение/ });
    assert.equal(await answer.getAttribute("maxlength"), "4000");
    await answer.fill("Ваш вопрос передан специалисту");
    await card.getByRole("button", { name: "Отправить ответ", exact: true }).evaluate(button => { button.click(); button.click(); });
    await card.getByText("Ответ отправляется — результат появится в истории", { exact: true }).waitFor();
    assert.equal(replies.length, 1);
    replies[0].status = "SENT"; replies[0].deliveryMessageId = 123; replies[0].sentAt = stamp;
    await card.getByText("Принято Telegram", { exact: true }).waitFor();
    await card.getByText("Принятие Telegram подтверждает отправку в чат, но не прочтение пользователем", { exact: true }).waitFor();
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await card.screenshot({ path: path.join(root, `build/telegram-flow-screenshots/reply-${width}.png`) });
    }
    assert.deepEqual(errors, []);
    console.log("PASS: unknown status stays unknown, single mutations, explicit bot link, pending refresh/Back/expiry confirmation reset, legacy preservation, focus/visibility/pageshow, disable+refresh without unlink, completed relink+refresh, unlink retry/stale read, independent preference, dashboard/support, applicant/admin reply, 1280/390/320");
  } catch (error) { console.error(logs.slice(-3500)); throw error; }
  finally {
    if (browser) await browser.close();
    child.kill();
    await new Promise(resolve => server.close(resolve));
    const configPath = path.join(root, "tsconfig.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const count = config.include.length;
    config.include = config.include.filter(entry => !entry.startsWith("build/telegram-flow-next/"));
    if (config.include.length !== count) fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    if (fs.existsSync(nextEnv) && fs.readFileSync(nextEnv, "utf8").includes("build/telegram-flow-next/")) {
      if (originalEnv === null) fs.unlinkSync(nextEnv);
      else fs.writeFileSync(nextEnv, originalEnv);
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
