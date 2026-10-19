/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression runner. */
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const origin = "http://localhost:13058";
const api = "http://localhost:19658";
const calls = [];
const messages = [201, 202].map(id => ({
  id, name: "Анна", email: "buyer@example.com", topic: "OTHER", message: "Вопрос о работе магазина",
  status: "NEW", createdAt: "2026-10-06T10:00:00Z", updatedAt: "2026-10-06T10:00:00Z",
}));
const replies = new Map(messages.map(message => [message.id, []]));
const operations = new Map();
let nextId = 701;
let postError = false;
let historyError = false;
let mailFailure = false;
let sending = false;
let deliveries = 0;

function operationKey(id, kind, key) { return `${id}:${kind}:${key}`; }
function delivery(reply) {
  deliveries++;
  reply.attempts++;
  reply.status = mailFailure ? "FAILED" : "SENT";
  reply.canRetry = mailFailure;
  reply.sentAt = mailFailure ? null : "2026-10-06T10:01:00Z";
  reply.updatedAt = "2026-10-06T10:01:00Z";
  reply.errorCode = mailFailure ? "SMTP_NOT_CONFIGURED" : null;
  reply.errorMessage = mailFailure ? "Отправка почты не настроена" : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, api);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end();
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : null;
  calls.push({ method: req.method, path: url.pathname, body });
  let data = [];
  if (url.pathname === "/api/auth/session") data = { id: 1, username: "admin@example.com", role: "ADMIN" };
  else if (url.pathname === "/api/profile") data = { id: 1, firstName: "Администратор", email: "admin@example.com" };
  else if (url.pathname === "/api/cart") data = { items: [] };
  else if (url.pathname === "/api/admin/contact-messages") {
    const selected = messages.filter(row => !url.searchParams.get("status") || row.status === url.searchParams.get("status"));
    data = { content: selected, number: 0, size: 20, totalElements: selected.length, totalPages: selected.length ? 1 : 0 };
  } else {
    const match = url.pathname.match(/^\/api\/admin\/contact-messages\/(\d+)\/replies(?:\/(\d+)\/retry)?$/);
    if (match) {
      const id = Number(match[1]);
      if (req.method === "GET") {
        if (historyError) { res.statusCode = 503; data = { message: "История временно недоступна" }; }
        else data = replies.get(id) || [];
      } else if (req.method === "POST") {
        assert.match(body.requestId, /^[0-9a-f-]{36}$/i, "Mutations need a stable request UUID");
        if (postError) { res.statusCode = 503; data = { message: "Не удалось отправить ответ" }; }
        else {
          const kind = match[2] ? `retry:${match[2]}` : "create";
          const key = operationKey(id, kind, body.requestId);
          const previous = operations.get(key);
          if (previous) {
            if (!match[2] && previous.body !== body.body.trim()) {
              res.statusCode = 409; data = { message: "Запрос уже использован для другого ответа" };
            } else data = previous;
          } else {
            let reply;
            if (match[2]) reply = replies.get(id).find(row => row.id === Number(match[2]));
            else {
              const message = messages.find(row => row.id === id);
              reply = { id: nextId++, contactMessageId: id, body: body.body.trim(), recipientEmail: message.email,
                authorId: 1, authorName: "Администратор", status: "PENDING", attempts: 0,
                createdAt: "2026-10-06T10:00:30Z", updatedAt: "2026-10-06T10:00:30Z", sentAt: null,
                errorCode: null, errorMessage: null, canRetry: false };
              replies.get(id).push(reply);
              res.statusCode = 201;
            }
            operations.set(key, reply);
            if (sending) {
              reply.status = "SENDING"; reply.canRetry = false;
              setTimeout(() => delivery(reply), 400);
            } else delivery(reply);
            data = reply;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }
  }
  res.end(JSON.stringify(data));
});

async function main() {
  await new Promise(resolve => server.listen(19658, "127.0.0.1", resolve));
  const root = path.resolve(__dirname, "..");
  const envPath = path.join(root, "next-env.d.ts");
  const originalEnv = fs.readFileSync(envPath, "utf8");
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "13058"], {
    cwd: root, windowsHide: true,
    env: { ...process.env, RCM_TEST_DIST_DIR: "build/contact-replies-check", SERVER_API_URL: api,
      NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin }, stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", data => { logs += data; });
  child.stderr.on("data", data => { logs += data; });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (child.exitCode !== null) throw Error("Isolated Next stopped: " + logs.slice(-2000));
      try { if ((await fetch(origin + "/contacts", { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } }
      catch { /* Wait for this isolated server only. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert(ready);
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin + "/admin?tab=contact-messages");
    const card = page.getByRole("article", { name: "Обращение №201", exact: true });
    await card.waitFor();
    assert.equal(calls.filter(call => call.path.endsWith("/replies")).length, 0, "History should load lazily");
    async function openReplies() {
      const button = card.locator('[data-admin-contact-replies="201"] > button');
      if (await button.getAttribute('aria-expanded') !== 'true') await button.click();
    }
    historyError = true;
    await openReplies();
    await card.getByText('Не удалось загрузить ответы', { exact: true }).waitFor();
    historyError = false;
    await card.getByRole('button', { name: 'Попробовать ещё раз', exact: true }).click();
    await card.getByText('Ответов пока нет', { exact: true }).waitFor();
    const draft = card.getByRole("textbox", { name: /^Ответ/ });
    await draft.waitFor();
    const submit = card.getByRole("button", { name: "Отправить ответ", exact: true });
    await submit.click();
    assert.equal(calls.filter(call => call.method === "POST").length, 0, "Empty reply must not be submitted");
    await draft.fill("Черновик ответа");
    await page.getByRole("button", { name: "Обновить", exact: true }).click();
    await card.waitFor();
    await openReplies();
    assert.equal(await draft.inputValue(), "Черновик ответа", "Refresh must preserve the draft");

    postError = true;
    await submit.click();
    await card.getByText("Не удалось получить результат отправки — проверьте историю перед повтором", { exact: true }).waitFor();
    assert.equal(await draft.inputValue(), "Черновик ответа", "HTTP failure must preserve text");
    postError = false;
    mailFailure = true;
    await submit.click();
    await draft.locator("..").locator("..").evaluate(field => field.closest("form").dispatchEvent(new Event("submit", {bubbles:true,cancelable:true})));
    await card.getByText("Отправка почты не настроена", { exact: true }).waitFor();
    assert.equal(replies.get(201).length, 1);
    assert.equal(replies.get(201)[0].body, "Черновик ответа");
    assert.equal(messages[0].status, "NEW", "Reply must not close the contact message");
    mailFailure = false;
    await card.getByRole("button", { name: "Повторить отправку", exact: true }).click();
    await card.getByText("Отправлено", { exact: true }).waitFor();
    assert.equal(replies.get(201)[0].attempts, 2);
    assert.equal(await card.getByRole("button", { name: "Повторить отправку", exact: true }).count(), 0);
    await page.reload();
    await card.waitFor();
    await openReplies();
    await card.getByText("Черновик ответа", { exact: true }).waitFor();
    await card.getByText("Администратор", { exact: true }).waitFor();

    const injected = "Ответ\n<script>window.contactReplyXss=true</script>\n" + "ОченьДлинноеСлово".repeat(80);
    await draft.fill(injected);
    const replyUrl = api + '/api/admin/contact-messages/201/replies';
    await page.route(replyUrl, async route => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fetch();
      await route.abort();
    });
    const before = deliveries;
    await submit.click();
    await card.getByText("Не удалось получить результат отправки — проверьте историю перед повтором", { exact: true }).waitFor();
    assert.equal(await draft.inputValue(), injected);
    await page.unroute(replyUrl);
    await submit.click();
    await card.locator("[data-contact-reply]").getByText(injected, { exact: true }).waitFor();
    await page.waitForFunction(button => !button.disabled, await submit.elementHandle());
    assert.equal(deliveries, before + 1, "Network retry must reuse requestId and avoid another email");
    assert.equal(replies.get(201).length, 2);
    assert.equal(await page.evaluate(() => window.contactReplyXss), undefined);

    sending = true;
    await draft.fill("Ответ с обновлением статуса отправки");
    await submit.click();
    await card.locator("[data-contact-reply]").getByText("Ответ с обновлением статуса отправки", { exact: true }).waitFor();
    await card.locator(`[data-contact-reply="${replies.get(201).at(-1).id}"]`).getByText("Отправлено", { exact: true }).waitFor();
    sending = false;
    assert.equal(replies.get(201).length, 3);

    await draft.fill('Ответ при обновлении списка во время отправки');
    const beforeRefresh = deliveries;
    await submit.click();
    await page.getByRole('button', { name: 'Обновить', exact: true }).click();
    await card.waitFor();
    await openReplies();
    assert.equal(await draft.inputValue(), 'Ответ при обновлении списка во время отправки');
    await submit.click();
    await card.locator('[data-contact-reply]').getByText('Ответ при обновлении списка во время отправки', { exact: true }).waitFor();
    await page.waitForFunction(button => !button.disabled, await submit.elementHandle());
    assert.equal(deliveries, beforeRefresh + 1, 'Refresh/abort must retain the request identity');
    const uncertain = replies.get(201).at(-1);
    uncertain.status = 'UNKNOWN'; uncertain.canRetry = true; uncertain.errorCode = 'EMAIL_SEND_UNCONFIRMED';
    await page.getByRole('button', { name: 'Обновить', exact: true }).click();
    await card.waitFor(); await openReplies();
    await card.getByText('Результат отправки неизвестен — письмо могло уйти', { exact: true }).waitFor();
    await card.getByRole('button', { name: 'Повторить отправку', exact: true }).click();
    await card.locator('[data-contact-reply="'+uncertain.id+'"]').getByText('Отправлено', { exact: true }).waitFor();
    const screenshots = path.join(root, "build", "contact-reply-screenshots");
    fs.mkdirSync(screenshots, { recursive: true });
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await card.screenshot({ path: path.join(screenshots, `replies-${width}.png`) });
    }
    assert.deepEqual(errors, []);
    console.log("PASS: lazy history, draft preservation, HTTP/SMTP failure, retry, persisted author/text, no automatic closing, idempotent network retry, polling, escaped content, 1280/390/320");
  } catch (error) { console.error(logs.slice(-2500)); throw error; }
  finally {
    if (browser) await browser.close();
    child.kill();
    await new Promise(resolve => server.close(resolve));
    const configPath = path.join(root, "tsconfig.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const oldCount = config.include.length;
    config.include = config.include.filter(entry => !entry.startsWith("build/contact-replies-check/"));
    if (config.include.length !== oldCount) fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    if (fs.readFileSync(envPath, "utf8").includes("build/contact-replies-check/")) fs.writeFileSync(envPath, originalEnv);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
