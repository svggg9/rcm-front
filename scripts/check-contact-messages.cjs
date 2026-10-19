/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression runner. */
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const origin = "http://localhost:13041";
const api = "http://localhost:19641";
const calls = [];
let publicError = 0;
let patchError = false;
let listError = false;
let rows = [];
let profileDelayMs = 0;
let profileError = 0;
let completedProfiles = 0;
const profiles = {
  2: { id: 2, firstName: "  Анна  ", displayName: "Анна Петрова", lastName: "Петрова", email: "  anna.profile@example.com  " },
  3: { id: 3, firstName: " ", displayName: "  Мария  ", email: "maria.profile@example.com" },
};
const time = "2026-10-06T09:00:00Z";
const topicLabels = ["Заказ и доставка", "Оплата", "Возврат товара или денег", "Аккаунт и вход", "Ошибка на сайте", "Продажи и сотрудничество", "Другой вопрос"];
const longMessage = "Вопрос о заказе\n<script>window.contactXss = true</script>\n" + "ДлинныйТекст".repeat(80);
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, api);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end();
  let body = "";
  for await (const chunk of req) body += chunk;
  calls.push({ method: req.method, path: url.pathname, query: url.search, body: body ? JSON.parse(body) : null });
  const userId = Number((req.headers.cookie || "").match(/(?:^|;\s*)test-user=([23])(?:;|$)/)?.[1] || 0);
  let data = [];
  if (url.pathname === "/api/auth/session") {
    if (userId) data = { id: userId, username: `login${userId}@example.com`, role: "BUYER" };
    else if ((req.headers.cookie || "").includes("test-admin=1")) data = { id: 1, username: "test-admin", role: "ADMIN" };
    else { res.statusCode = 204; return res.end(); }
  } else if (url.pathname === "/api/profile") {
    data = profiles[userId] || { id: 1, firstName: "Администратор", email: "admin@example.com" };
    const status = profileError;
    if (profileDelayMs) await new Promise(resolve => setTimeout(resolve, profileDelayMs));
    if (status) { res.statusCode = status; data = { message: "unavailable" }; }
    completedProfiles++;
  } else if (url.pathname === "/api/cart") data = { items: [] };
  else if (req.method === "POST" && url.pathname === "/api/contact-messages") {
    await new Promise(resolve => setTimeout(resolve, 250));
    if (publicError) {
      res.statusCode = publicError;
      data = { code: "VALIDATION_ERROR", message: "message: Сообщение должно быть длиннее" };
    } else {
      const id = 101 + rows.length;
      rows.unshift({ ...JSON.parse(body), id, status: "NEW", createdAt: time, updatedAt: time });
      res.statusCode = 201; data = { id, createdAt: time };
    }
  } else if (req.method === "GET" && url.pathname === "/api/admin/contact-messages") {
    if (listError) { res.statusCode = 503; data = { message: "unavailable" }; }
    else {
      const selected = rows.filter(row => !url.searchParams.get("status") || row.status === url.searchParams.get("status"));
      const number = Number(url.searchParams.get("page") || 0);
      const size = Number(url.searchParams.get("size") || 20);
      data = { content: selected.slice(number * size, (number + 1) * size), number, totalElements: selected.length,
        totalPages: Math.ceil(selected.length / size), size };
    }
  } else if (req.method === "PATCH" && /^\/api\/admin\/contact-messages\/\d+\/status$/.test(url.pathname)) {
    if (patchError) { res.statusCode = 503; data = { message: "unavailable" }; }
    else {
      const id = Number(url.pathname.split("/")[4]);
      const row = rows.find(item => item.id === id);
      row.status = JSON.parse(body).status; row.updatedAt = "2026-10-06T09:01:00Z"; data = row;
    }
  }
  res.end(JSON.stringify(data));
});

async function main() {
  await new Promise(resolve => server.listen(19641, "127.0.0.1", resolve));
  const nextEnvPath = path.join(__dirname, "..", "next-env.d.ts");
  const originalNextEnv = fs.readFileSync(nextEnvPath, "utf8");
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "13041"], {
    cwd: path.resolve(__dirname, ".."), windowsHide: true,
    env: { ...process.env, RCM_TEST_DIST_DIR: "build/contact-check", SERVER_API_URL: api,
      NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin }, stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = ""; child.stdout.on("data", data => { logs += data; }); child.stderr.on("data", data => { logs += data; });
  let browser;
  const screenshots = path.join(__dirname, "..", "build", "contact-screenshots");
  fs.mkdirSync(screenshots, { recursive: true });
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (child.exitCode !== null) throw new Error("Next test process stopped: " + logs.slice(-3000));
      try {
        const response = await fetch(origin + "/contacts", { signal: AbortSignal.timeout(2000) });
        if (response.ok) { ready = true; break; }
      } catch { /* Wait for the isolated Next server. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert(ready, "Isolated Next server must start");
    browser = await chromium.launch({ headless: true, channel: "msedge" });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin + "/contacts");
    await page.getByRole("heading", { name: "Связаться с рцмаркет", exact: true }).waitFor();
    await page.getByRole("button", { name: "Отправить обращение", exact: true }).click();
    await page.getByText("Укажите ваше имя", { exact: true }).waitFor();
    assert.equal(calls.filter(call => call.method === "POST" && call.path === "/api/contact-messages").length, 0);
    const topic = page.getByRole("combobox", { name: /^Тема обращения/ });
    async function chooseTopic(label) {
      await topic.click();
      await page.getByRole("option", { name: label, exact: true }).click();
    }
    assert.equal(await topic.getAttribute("aria-invalid"), "true");
    assert.equal(await topic.getAttribute("aria-required"), "true");
    await topic.click();
    assert.deepEqual(await page.getByRole("option").allTextContents(), topicLabels);
    await page.keyboard.press("Escape");
    assert.equal(await topic.getAttribute("aria-expanded"), "false");
    assert.equal(await topic.evaluate(node => node === document.activeElement), true);
    await topic.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    assert.match(await topic.innerText(), /Оплата/);
    await page.getByLabel("Номер заказа (необязательно)").fill("Черновик номера");
    await chooseTopic("Аккаунт и вход");
    assert.equal(await page.getByLabel("Номер заказа (необязательно)").count(), 0);
    await topic.press("Home");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    assert.match(await topic.innerText(), /Другой вопрос/);
    await topic.press("ArrowDown");
    await page.keyboard.press("Tab");
    assert.equal(await topic.getAttribute("aria-expanded"), "false");
    await chooseTopic("Заказ и доставка");
    assert.equal(await page.getByLabel("Номер заказа (необязательно)").inputValue(), "Черновик номера");
    assert.equal(await topic.evaluate(node => node === document.activeElement), true);
    await page.getByRole("textbox", { name: /^Имя/ }).fill("  Анна  ");
    await page.getByRole("textbox", { name: /^Электронная почта/ }).fill("anna@example.com");
    await page.getByLabel("Номер заказа (необязательно)").fill(" RCM-123 ");
    await page.getByRole("textbox", { name: /^Сообщение/ }).fill("  Подскажите, когда будет доставлен мой заказ?  ");
    await page.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
    assert.equal(await page.getByRole("link", { name: "политикой конфиденциальности" }).getAttribute("href"), "/legal/privacy");
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await topic.click();
      await page.getByRole("option", { name: "Другой вопрос", exact: true }).scrollIntoViewIfNeeded();
      assert.equal(await page.getByRole("option", { name: "Другой вопрос", exact: true }).isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false,
        `Open DS topic menu must not overflow at ${width}`);
      await page.screenshot({ path: path.join(screenshots, `topics-${width}.png`), fullPage: true });
      await page.keyboard.press("Escape");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false,
        `Contact form must not overflow at ${width}`);
      await page.screenshot({ path: path.join(screenshots, `form-${width}.png`), fullPage: true });
    }
    for (const status of [400, 429, 503]) {
      publicError = status;
      await page.getByRole("button", { name: "Отправить обращение", exact: true }).click();
      await page.locator('form[aria-busy="false"]:visible').waitFor();
      assert.equal(await page.getByRole("textbox", { name: /^Имя/ }).inputValue(), "  Анна  ");
      assert.equal(await page.getByRole("textbox", { name: /^Сообщение/ }).inputValue(), "  Подскажите, когда будет доставлен мой заказ?  ");
      assert.equal(await page.getByRole("checkbox", { name: /Согласен на обработку/ }).isChecked(), true);
      assert.equal(await page.getByRole("alert").count() > 0, true);
    }
    publicError = 0;
    await page.route(api + "/api/contact-messages", route => route.abort());
    await page.getByRole("button", { name: "Отправить обращение", exact: true }).click();
    await page.getByText("Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.", { exact: true }).waitFor();
    await page.unroute(api + "/api/contact-messages");
    const before = calls.filter(call => call.method === "POST" && call.path === "/api/contact-messages").length;
    await page.getByRole("button", { name: "Отправить обращение", exact: true }).click();
    await page.locator("form:visible").evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await page.getByRole("heading", { name: "Обращение №101 отправлено", exact: true }).waitFor();
    assert.equal(calls.filter(call => call.method === "POST" && call.path === "/api/contact-messages").length, before + 1);
    assert.equal(rows[0].name, "Анна"); assert.equal(rows[0].orderNumber, "RCM-123");
    await page.getByRole("button", { name: "Написать ещё", exact: true }).click();
    assert.equal(await page.getByRole("textbox", { name: /^Имя/ }).inputValue(), "");
    await chooseTopic("Другой вопрос");
    assert.equal(await page.getByLabel("Номер заказа (необязательно)").count(), 0);
    await chooseTopic("Ошибка на сайте");
    await page.getByRole("textbox", { name: /^Имя/ }).fill("Иван");
    await page.getByRole("textbox", { name: /^Электронная почта/ }).fill("technical@example.com");
    await page.getByRole("textbox", { name: /^Сообщение/ }).fill("При открытии каталога не работает фильтр");
    await page.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
    await page.getByRole("button", { name: "Отправить обращение", exact: true }).click();
    await page.getByRole("heading", { name: "Обращение №102 отправлено", exact: true }).waitFor();
    assert.equal(rows[0].topic, "TECHNICAL"); assert.equal(rows[0].orderNumber, undefined);
    assert.equal(calls.filter(call => call.path === "/api/profile").length, 0, "Guests must not request a profile");
    console.log("PASS: seven DS topics, keyboard/focus, conditional order number, new topic payload, public validation, retained input after 400/429/503/network error, duplicate-submit guard, receipt and reset, widths 1280/390/320");

    const profileContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const profilePage = await profileContext.newPage();
    profilePage.on("pageerror", error => errors.push(error.message));
    const nameInput = profilePage.getByRole("textbox", { name: /^Имя/ });
    const emailInput = profilePage.getByRole("textbox", { name: /^Электронная почта/ });
    const profileCalls = () => calls.filter(call => call.path === "/api/profile").length;
    async function setUser(userId) {
      await profileContext.clearCookies();
      if (userId) await profileContext.addCookies([{ name: "test-user", value: String(userId), url: origin }]);
    }
    async function expectContacts(name, email) {
      await profilePage.waitForFunction(expected =>
        document.querySelector('input[name="name"]')?.value === expected.name &&
        document.querySelector('input[name="email"]')?.value === expected.email, { name, email });
    }
    async function waitForMockProfiles(count) {
      for (let i = 0; i < 200 && completedProfiles < count; i++) await new Promise(resolve => setTimeout(resolve, 10));
      assert(completedProfiles >= count, "Delayed mock profile response must complete");
      await profilePage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    async function startDelayedProfile() {
      profileDelayMs = 700;
      const completed = completedProfiles;
      const request = profilePage.waitForRequest(api + "/api/profile");
      await profilePage.goto(origin + "/contacts");
      await request;
      return completed + 1;
    }
    async function authChanged() {
      await profilePage.evaluate(() => window.dispatchEvent(new Event("auth-changed")));
    }

    await setUser(2);
    await profilePage.goto(origin + "/contacts");
    await expectContacts("Анна", "anna.profile@example.com");
    await nameInput.fill("Другое имя");
    await emailInput.fill("other@example.com");
    await profilePage.getByRole("combobox", { name: /^Тема обращения/ }).click();
    await profilePage.getByRole("option", { name: "Другой вопрос", exact: true }).click();
    await profilePage.getByRole("textbox", { name: /^Сообщение/ }).fill("Проверка отправки обращения с другим адресом");
    await profilePage.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
    await profilePage.getByRole("button", { name: "Отправить обращение", exact: true }).click();
    await profilePage.getByRole("heading", { name: "Обращение №103 отправлено", exact: true }).waitFor();
    assert.equal(rows[0].name, "Другое имя"); assert.equal(rows[0].email, "other@example.com");
    await profilePage.getByRole("button", { name: "Написать ещё", exact: true }).click();
    await expectContacts("Анна", "anna.profile@example.com");
    assert.equal(await profilePage.getByRole("textbox", { name: /^Сообщение/ }).inputValue(), "");

    let completed = await startDelayedProfile();
    await nameInput.fill("Имя введено вручную");
    await emailInput.fill("clear@example.com");
    await emailInput.fill("");
    await waitForMockProfiles(completed);
    await expectContacts("Имя введено вручную", "");

    completed = await startDelayedProfile();
    await profilePage.getByRole("button", { name: "Отправить обращение", exact: true }).click();
    await profilePage.getByText("Укажите ваше имя", { exact: true }).waitFor();
    await waitForMockProfiles(completed);
    await expectContacts("Анна", "anna.profile@example.com");
    assert.equal(await profilePage.getByText("Укажите ваше имя", { exact: true }).count(), 0);
    assert.equal(await profilePage.getByText("Проверьте электронную почту", { exact: true }).count(), 0);
    profileDelayMs = 0;

    const beforeLogout = profileCalls();
    await setUser(null);
    const guestSession = profilePage.waitForResponse(response => response.url() === api + "/api/auth/session" && response.status() === 204);
    await authChanged();
    await guestSession;
    await expectContacts("", "");
    assert.equal(profileCalls(), beforeLogout, "Logging out must not request a guest profile");
    await setUser(3); await authChanged();
    await expectContacts("Мария", "maria.profile@example.com");
    await emailInput.fill("keep@example.com");
    await setUser(2); await authChanged();
    await expectContacts("Анна", "keep@example.com");
    await nameInput.fill("Ручное имя");
    await setUser(null); await authChanged();
    await expectContacts("Ручное имя", "keep@example.com");

    await setUser(2);
    completed = await startDelayedProfile();
    profileDelayMs = 0;
    await setUser(3); await authChanged();
    await expectContacts("Мария", "maria.profile@example.com");
    await waitForMockProfiles(completed + 1);
    await expectContacts("Мария", "maria.profile@example.com");
    await setUser(2);
    completed = await startDelayedProfile();
    await setUser(null); await authChanged();
    await waitForMockProfiles(completed);
    await expectContacts("", "");

    profileDelayMs = 0; profileError = 503;
    await setUser(2);
    const unavailableProfile = profilePage.waitForResponse(response => response.url() === api + "/api/profile" && response.status() === 503);
    await profilePage.goto(origin + "/contacts");
    await unavailableProfile;
    await expectContacts("", "");
    await nameInput.fill("Вручную без профиля"); await emailInput.fill("manual@example.com");
    await expectContacts("Вручную без профиля", "manual@example.com");
    profileError = 0;
    await profileContext.close();
    console.log("PASS: guest skips profile, firstName/email and displayName fallback, editable defaults, late response preserves manual input/clear, validation recovery, logout/account switch/stale responses, unavailable profile, authenticated receipt reset");

    rows = Array.from({ length: 21 }, (_, index) => ({ id: 201 + index, name: "Анна" + index,
      email: index ? `sender${index}@example.com` : "long".repeat(35) + "@example.com", topic: index ? "ORDER" : "TECHNICAL", message: longMessage,
      orderNumber: "RCM-123", status: "NEW", createdAt: time, updatedAt: time })).reverse();
    await context.addCookies([{ name: "test-admin", value: "1", url: origin }]);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(origin + "/admin?tab=contact-messages");
    await page.getByRole("heading", { name: "Обращения", exact: true }).waitFor();
    await page.getByRole("article", { name: "Обращение №221", exact: true }).waitFor();
    assert.equal(await page.getByRole("article").count(), 20);
    assert.equal(await page.evaluate(() => window.contactXss), undefined);
    await page.getByRole("button", { name: "Далее", exact: true }).click();
    const last = page.getByRole("article", { name: "Обращение №201", exact: true });
    await last.waitFor(); assert.equal(await page.getByRole("article").count(), 1);
    await last.getByText("Ошибка на сайте", { exact: true }).waitFor();
    assert.equal(await last.getByRole("link").getAttribute("href"), "mailto:" + rows[20].email);
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false,
        `Admin inbox must not overflow at ${width}`);
      await page.screenshot({ path: path.join(screenshots, `admin-${width}.png`), fullPage: true });
    }
    patchError = true;
    await last.getByRole("combobox").click();
    await last.getByRole("option", { name: "В работе", exact: true }).click();
    await page.getByText("Не удалось изменить статус обращения. Попробуйте ещё раз", { exact: true }).waitFor();
    assert.equal(rows[20].status, "NEW");
    patchError = false;
    await last.getByRole("combobox").click();
    await last.getByRole("option", { name: "В работе", exact: true }).click();
    await page.getByText("Обращение №201: В работе", { exact: true }).waitFor();
    await last.waitFor({ state: "detached" });
    assert.equal(rows[20].status, "IN_PROGRESS");
    await page.getByRole("tab", { name: "В работе", exact: true }).click();
    await last.waitFor();
    await last.getByRole("combobox").click();
    await last.getByRole("option", { name: "Закрыто", exact: true }).click();
    await page.getByText("Обращение №201: Закрыто", { exact: true }).waitFor();
    await page.getByRole("tab", { name: "Закрытые", exact: true }).click();
    await last.waitFor();
    listError = true;
    await page.getByRole("button", { name: "Обновить", exact: true }).click();
    await page.getByText("Не удалось загрузить обращения", { exact: true }).waitFor();
    listError = false;
    await page.getByRole("button", { name: "Попробовать ещё раз", exact: true }).click();
    await last.waitFor();
    await page.reload();
    await page.getByRole("heading", { name: "Обращения", exact: true }).waitFor();
    await page.getByRole("article", { name: "Обращение №221", exact: true }).waitFor();
    const nav = page.getByRole("navigation", { name: "Меню администратора" });
    assert.equal(await nav.getByRole("link", { name: "Обращения", exact: true }).getAttribute("aria-current"), "page");
    assert.deepEqual(errors, [], "Contact flows must have no runtime errors");
    console.log("PASS: admin direct URL/reload, pagination/filter/status changes, failed PATCH and list retry, mailto, escaped user text, widths 1280/390/320");
  } catch (error) {
    console.error(logs.slice(-3000)); throw error;
  } finally {
    if (browser) await browser.close();
    child.kill();
    await new Promise(resolve => server.close(resolve));
    // Next adds include entries for the isolated distDir. Remove only ours,
    // preserving any simultaneous configuration changes in another task.
    const configPath = path.join(__dirname, "..", "tsconfig.json");
    const configText = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configText);
    const originalLength = config.include.length;
    config.include = config.include.filter(entry => !entry.startsWith("build/contact-check/"));
    if (config.include.length !== originalLength) fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    if (fs.readFileSync(nextEnvPath, "utf8").includes("build/contact-check/")) fs.writeFileSync(nextEnvPath, originalNextEnv);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
