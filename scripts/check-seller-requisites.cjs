/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser fixture with a disposable mock API. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const origin = "http://localhost:13062";
const api = "http://localhost:19662";
const output = path.resolve(__dirname, "../build/seller-requisites");
const calls = [];
const initial = { id: 1, sellerId: 70, sellerType: "OOO", inn: "7707083893", ogrn: "1027700132195", ogrnip: "",
  companyName: "Старое название", legalName: "Прежнее юридическое название", contactName: "Контакт магазина",
  phone: "+79990000000", legalAddress: "Полный адрес продавца", shippingCountryCode: "RU", shippingCityCode: 44,
  shippingCityName: "Москва", shippingAddress: "Пункт приёма", cdekShipmentPoint: "MSK1", bankName: "Прежний банк",
  bik: "044525225", checkingAccount: "40702810000000000000", correspondentAccount: "30101810400000000225", agreementAccepted: true };
let saved = {...initial};
let enabled = true;
let verified = false;
let mode = "ok";
let delay = 0;
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end();
  const url = new URL(req.url, api);
  let body = ""; for await (const chunk of req) body += chunk;
  const values = body ? JSON.parse(body) : null;
  calls.push({path: url.pathname, method: req.method, values});
  let data = [];
  if (url.pathname === "/api/auth/session") data = {id: 70, username: "seller", role: "SELLER"};
  else if (url.pathname === "/api/profile") data = {displayName: "Контакт магазина", email: "seller@example.test"};
  else if (url.pathname === "/api/seller/brands") data = [{id: 1, name: "Тестовый магазин"}];
  else if (url.pathname === "/api/seller/legal-info/review") data = {verified, verifiedAt: verified ? "2026-10-22T10:00:00Z" : null, changeRequest: null};
  else if (url.pathname === "/api/seller/legal-info") {
    if (req.method === "PUT") saved = {...saved, ...values};
    data = saved;
  } else if (url.pathname === "/api/seller/legal-info/lookup/availability") data = {available: enabled};
  else if (url.pathname.includes("/legal-info/lookup/")) {
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    if (mode === "failure") { res.statusCode = 503; data = {message: "private-provider-error-secret"}; }
    else if (mode === "limit") { res.statusCode = 429; data = {message: "private-provider-error-secret"}; }
    else if (mode === "malformed") data = {inn: values.inn, sellerType: values.sellerType};
    else if (url.pathname.endsWith("/bank")) data = {bik: values.bik, bankName: "Банк из справочника", correspondentAccount: "30101810400000000225"};
    else data = {sellerType: values.sellerType, inn: values.inn, ogrn: values.sellerType === "OOO" ? "1027700132195" : null,
      ogrnip: values.sellerType === "IP" ? "304784722800160" : null, companyName: values.sellerType === "OOO" ? "ООО Тест" : null,
      legalName: values.sellerType === "OOO" ? "Общество Тест" : "Иванов Иван Иванович",
      legalAddress: values.sellerType === "OOO" ? "Москва, улица Тестовая, 1" : null,
      registrationCity: values.sellerType === "IP" ? "г Санкт-Петербург" : null};
  } else if (url.pathname === "/api/seller/onboarding-status") data = {applicationCompleted: true, brandCompleted: true, legalCompleted: true, agreementAccepted: true, progress: 100};
  else if (url.pathname === "/api/seller/notification-preferences") data = {email: "seller@example.test", emailEnabled: false, telegramEnabled: false, telegramLinked: false, telegramUsername: null};
  else if (url.pathname === "/api/profile/telegram") data = {linked: false, username: null};
  else if (url.pathname === "/api/cart") data = {items: []};
  else if (url.pathname.endsWith("/list") || url.pathname.endsWith("/tasks")) data = {content: [], totalPages: 0, totalElements: 0};
  res.end(JSON.stringify(data));
});

async function main() {
  fs.mkdirSync(output, {recursive: true});
  await new Promise(resolve => server.listen(19662, "127.0.0.1", resolve));
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--webpack", "-p", "13062"], {
    cwd: path.resolve(__dirname, ".."), windowsHide: true,
    env: {...process.env, RCM_TEST_DIST_DIR: "build/seller-requisites-next", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin},
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = ""; child.stdout.on("data", value => { logs += value; }); child.stderr.on("data", value => { logs += value; });
  let browser;
  try {
    for (let i = 0; i < 90; i++) {
      if (child.exitCode !== null) throw new Error(logs.slice(-1500));
      try { await fetch(origin, {signal: AbortSignal.timeout(2000)}); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    browser = await chromium.launch({headless: true, channel: "msedge"});
    const page = await browser.newPage({viewport: {width: 1280, height: 1000}});
    page.setDefaultTimeout(20000);
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    async function edit(section = "legal") {
      await page.goto(origin + "/seller/legal?section=" + section);
      await page.getByRole("button", {name: "Редактировать", exact: true}).click();
    }
    const legalName = () => page.getByRole("textbox", {name: /^Юридическое название/});
    const inn = () => page.getByRole("textbox", {name: /^ИНН/});
    const lookup = () => page.getByRole("button", {name: "Заполнить по ИНН", exact: true});
    for (const width of [1280, 390, 320]) {
      saved = {...initial}; await page.setViewportSize({width, height: 1000}); await edit();
      const before = calls.filter(call => call.path.endsWith("/lookup/party")).length;
      await lookup().evaluate(button => { button.click(); button.click(); });
      const dialog = page.getByRole("dialog", {name: "Найденные реквизиты", exact: true});
      await dialog.waitFor();
      assert.equal(calls.filter(call => call.path.endsWith("/lookup/party")).length, before + 1);
      assert.equal(await legalName().inputValue(), initial.legalName);
      assert.equal(calls.filter(call => call.method === "PUT").length, 0, "Lookup must never save");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No overflow at ${width}`);
      await page.screenshot({path: path.join(output, `preview-${width}.png`), animations: "disabled"});
      await dialog.getByRole("button", {name: "Отмена", exact: true}).click();
      assert.equal(await legalName().inputValue(), initial.legalName);
      await lookup().click(); await dialog.waitFor();
      await dialog.getByRole("button", {name: "Применить к форме", exact: true}).click();
      assert.equal(await legalName().inputValue(), "Общество Тест");
    }
    await page.getByRole("button", {name: "Сохранить", exact: true}).click();
    await page.getByRole("button", {name: "Редактировать", exact: true}).waitFor();
    assert.equal(saved.legalName, "Общество Тест"); assert.equal(saved.contactName, initial.contactName);
    assert.equal(saved.phone, initial.phone); assert.equal(saved.checkingAccount, initial.checkingAccount);
    assert.equal(saved.shippingAddress, initial.shippingAddress);
    await page.reload();
    await page.getByRole("region", {name: "Сохранённые данные"}).getByText("Общество Тест", {exact: true}).waitFor();
    await edit("bank"); await page.getByRole("button", {name: "Заполнить по БИК", exact: true}).click();
    await page.getByRole("dialog").getByRole("button", {name: "Применить к форме", exact: true}).click();
    assert.equal(await page.getByRole("textbox", {name: /^Банк/}).inputValue(), "Банк из справочника");
    assert.equal(await page.getByRole("textbox", {name: /^Расчетный счет/}).inputValue(), initial.checkingAccount);
    assert.equal(await page.getByRole("checkbox", {name: /оферту продавца/}).isChecked(), true);
    saved = {...initial, sellerType: "IP", inn: "784806113663", ogrnip: "304784722800160"}; await edit();
    await lookup().click(); await page.getByRole("dialog").getByRole("button", {name: "Применить к форме", exact: true}).click();
    assert.equal(await page.getByRole("textbox", {name: /^ФИО/}).inputValue(), "Иванов Иван Иванович");
    assert.equal(await page.getByRole("textbox", {name: /^Юридический адрес/}).inputValue(), initial.legalAddress);
    for (const failure of ["failure", "limit", "malformed"]) {
      mode = failure; await lookup().click(); await page.getByRole("alert").filter({hasText: /вручную/}).waitFor();
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(await page.getByText("private-provider-error-secret").count(), 0);
    }
    mode = "ok"; delay = 800;
    const response = page.waitForResponse(value => value.url().endsWith("/lookup/party"));
    await lookup().click(); await inn().fill("784806113664"); await response;
    await page.waitForFunction(() => !document.querySelector('#seller-data-legal button[aria-busy="true"]'));
    assert.equal(await page.getByRole("dialog").count(), 0, "Stale response cannot replace newer input");
    delay = 0;
    await page.getByText("Самозанятый", {exact: true}).click();
    assert.equal(await lookup().count(), 0);
    enabled = false; await edit(); assert.equal(await lookup().count(), 0);
    enabled = true; verified = true; await page.reload();
    await page.getByText("Реквизиты подтверждены", {exact: true}).waitFor();
    assert.equal(await page.getByRole("button", {name: "Редактировать", exact: true}).count(), 0);
    assert.equal(await lookup().count(), 0, "Verified seller remains protected");
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({passed: true, widths: [1280, 390, 320],
      cancel: true, applyThenSave: true, bankAccountPreserved: true, ipAddressPreserved: true,
      errorAndMalformedResponse: true, duplicateAndStaleRequests: true, manualWithoutKey: true, verifiedSeller: true}, null, 2));
    console.log("PASS: seller requisites preview/cancel/apply/save/refresh; bank and IP data preserved; failures, stale and duplicate requests, no key, verified seller; 1280/390/320 fixture only");
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
