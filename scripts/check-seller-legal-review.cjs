/* eslint-disable @typescript-eslint/no-require-imports -- Isolated seller/admin browser fixture; never uses the working API or DB. */
const assert = require("node:assert/strict"), http = require("node:http"), fs = require("node:fs"), path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const origin = "http://localhost:13063", api = "http://localhost:19663";
const calls = [], pageErrors = [];
let role = "SELLER", statusError = false, lostRequest = false;
let info = { id: 7, sellerId: 42, sellerType: "IP", inn: "123456789012", ogrn: null, ogrnip: "123456789012345", companyName: null,
  legalName: "ИП Петрова Анна", contactName: "Анна Петрова", phone: "+79990000000", legalAddress: "Москва",
  shippingCountryCode: "RU", shippingCityCode: 44, shippingCityName: "Москва", shippingAddress: "Москва, пункт СДЭК", cdekShipmentPoint: "MSK1",
  bankName: "Тестовый банк", bik: "044525225", checkingAccount: "40702810000000000000", correspondentAccount: "30101810400000000225",
  agreementAccepted: true, agreementAcceptedAt: "2026-10-22T10:00:00Z", createdAt: "2026-10-22T10:00:00Z", updatedAt: "2026-10-22T10:00:00Z" };
let review = { verified: false, verifiedAt: null, changeRequest: null };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, api), p = url.pathname;
  res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Content-Type", "application/json"); if (req.method === "OPTIONS") return res.end();
  let raw = ""; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : null; calls.push({ path: p, method: req.method, body });
  let data = [];
  if (p === "/api/auth/session") data = { id: role === "ADMIN" ? 1 : 42, username: "fixture@example.com", role };
  else if (p === "/api/profile") data = { id: 42, firstName: "Анна", email: "fixture@example.com" };
  else if (p === "/api/cart") data = { items: [] };
  else if (p === "/api/seller/legal-info") {
    if (req.method === "PUT" && review.verified && body.legalName !== info.legalName) {
      res.statusCode = 409; return res.end(JSON.stringify({ message: "LEGAL_VERIFIED_LOCKED" }));
    }
    if (req.method === "PUT") info = { ...info, ...body, updatedAt: new Date().toISOString() };
    data = info;
  } else if (p === "/api/seller/legal-info/review") {
    if (statusError) { res.statusCode = 503; data = { message: "PRIVATE_INTERNAL_ERROR" }; } else data = review;
  } else if (p === "/api/seller/legal-info/change-requests") {
    review.changeRequest ??= { id: 8, changes: body.changes, reason: body.reason, createdAt: "2026-10-22T11:00:00Z", reopenedAt: null, resolution: null };
    if (lostRequest) { lostRequest = false; res.statusCode = 503; data = { message: "PRIVATE_INTERNAL_ERROR" }; } else data = review;
  } else if (p === "/api/admin/sellers/legal-change-requests") data = { content: review.changeRequest && !review.changeRequest.reopenedAt ? [{ sellerId: 42, sellerName: "fixture@example.com", changeRequest: review.changeRequest }] : [], totalPages: 1, totalElements: 1, number: 0 };
  else if (p === "/api/admin/sellers/42/legal-review") data = { info, review };
  else if (p.endsWith("/legal-review/change-requests/8/reopen")) {
    review = { verified: false, verifiedAt: null, changeRequest: { ...review.changeRequest, reopenedAt: "2026-10-22T12:00:00Z", resolution: body.note } }; data = { info, review };
  } else if (p.endsWith("/legal-review/verify")) { review = { ...review, verified: true, verifiedAt: "2026-10-22T13:00:00Z" }; data = { info, review }; }
  else if (p === "/api/seller/legal-info/lookup/availability") data = { available: false };
  else if (p === "/api/seller/notification-preferences") data = { email: "fixture@example.com", emailEnabled: false, telegramEnabled: false, telegramLinked: false };
  else if (p === "/api/seller/telegram/status") data = { linked: false, username: null };
  else if (p === "/api/seller/brands") data = [{ id: 1, name: "Тестовый бренд" }];
  else if (p === "/api/seller/onboarding-status") data = { applicationCompleted: true, brandCompleted: true, legalCompleted: true, agreementAccepted: true, progress: 100, completedSteps: 4, totalSteps: 4 };
  else if (p === "/api/seller/dashboard-summary") data = { activeProducts: 0, attentionProducts: 0, totalProducts: 0, readyOrders: 0, activeOrders: 0, totalOrders: 0, estimatedBalance: 0, salesAmount: 0, commissionAmount: 0, availablePayout: 0, processingPayout: 0, telegramLinked: false, recentEvents: [] };
  else if (p.endsWith("status-counts")) data = { ALL: 0, NEW: 0, APPROVED: 0, REJECTED: 0 };
  else if (p.includes("/api/admin/") || p.endsWith("/list") || p.endsWith("/tasks")) data = { content: [], totalPages: 0, totalElements: 0, number: 0 };
  res.end(JSON.stringify(data));
});
async function main() {
  await new Promise(resolve => server.listen(19663, "127.0.0.1", resolve));
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", "13063"], { windowsHide: true,
    cwd: path.resolve(__dirname, ".."), env: { ...process.env, RCM_TEST_DIST_DIR: "build/seller-legal-review-next", SERVER_API_URL: api, NEXT_PUBLIC_API_URL: api, NEXT_PUBLIC_SITE_URL: origin }, stdio: ["ignore", "pipe", "pipe"] });
  let logs = ""; child.stdout.on("data", value => logs += value); child.stderr.on("data", value => logs += value);
  let browser;
  const directory = path.resolve(__dirname, "../build/seller-legal-review"); fs.mkdirSync(directory, { recursive: true });
  try {
    for (let i = 0; i < 120; i++) {
      if (child.exitCode !== null) throw Error(logs);
      try { await fetch(origin + "/seller/legal", { signal: AbortSignal.timeout(2000) }); break; } catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    browser = await chromium.launch({ headless: true, channel: "msedge" });
    const page = await browser.newPage({ viewport: { width: 1280, height: 960 } }); page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto(origin + "/seller/legal"); await page.getByRole("button", { name: "Редактировать", exact: true }).waitFor();
    assert.equal(await page.getByLabel("ИНН", { exact: true }).count(), 0);
    await page.getByRole("button", { name: "Редактировать", exact: true }).click();
    await page.getByLabel("ФИО", { exact: true }).fill("ИП Петрова Анна Сергеевна");
    await page.getByText("Проверьте правильность указанных данных перед сохранением", { exact: true }).waitFor();
    await page.getByRole("link", { name: "Товары", exact: true }).first().click();
    await page.getByRole("dialog", { name: "Есть несохранённые изменения", exact: true }).getByRole("button", { name: "Продолжить редактирование", exact: true }).click();
    assert.equal(await page.getByLabel("ФИО", { exact: true }).inputValue(), "ИП Петрова Анна Сергеевна");
    await page.getByRole("button", { name: "Отменить", exact: true }).click();
    await page.getByText("ИП Петрова Анна", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Редактировать", exact: true }).click();
    await page.getByLabel("ФИО", { exact: true }).fill("ИП Петрова Анна Сергеевна");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page.getByRole("button", { name: "Редактировать", exact: true }).waitFor(); assert.equal(info.legalName, "ИП Петрова Анна Сергеевна");
    await page.reload(); await page.getByRole("button", { name: "Редактировать", exact: true }).waitFor();
    await page.getByRole("button", { name: "Редактировать", exact: true }).click();
    await page.getByLabel("ФИО", { exact: true }).fill("Несохранённое имя");
    review = { verified: true, verifiedAt: "2026-10-22T10:00:00Z", changeRequest: null };
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page.getByRole("button", { name: "Запросить изменение", exact: true }).waitFor();
    assert.equal(await page.getByLabel("ФИО", { exact: true }).inputValue(), "Несохранённое имя");
    assert.equal(await page.getByLabel("ФИО", { exact: true }).isDisabled(), true);
    await page.getByRole("button", { name: "Отменить", exact: true }).click();
    await page.reload(); await page.getByRole("button", { name: "Запросить изменение", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Редактировать", exact: true }).count(), 0);
    await page.getByRole("button", { name: "Банк и оферта" }).click();
    assert.equal(await page.getByRole("button", { name: "Редактировать", exact: true }).count(), 0);
    await page.getByRole("button", { name: /^Контакты/ }).click();
    await page.getByRole("button", { name: "Редактировать", exact: true }).click();
    await page.getByLabel("Контактное лицо", { exact: true }).fill("Новый контакт");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page.getByRole("button", { name: "Редактировать", exact: true }).waitFor(); assert.equal(info.contactName, "Новый контакт");
    await page.getByRole("button", { name: "Юридические данные" }).click();
    for (const button of await page.getByRole("button", { name: "Закрыть уведомление", exact: true }).all()) await button.click();
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 960 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No overflow ${width}`);
      await page.screenshot({ path: path.join(directory, `verified-${width}.png`), fullPage: true });
    }
    await page.getByRole("button", { name: "Запросить изменение", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Запросить изменение реквизитов", exact: true }); await dialog.getByRole("button", { name: "Отправить запрос", exact: true }).click();
    await dialog.getByText("Укажите, какие данные нужно изменить", { exact: true }).waitFor();
    await dialog.getByLabel("Какие данные нужно изменить").fill("Изменить расчётный счёт"); await dialog.getByLabel("Причина изменения").fill("Открыт новый счёт");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: "Закрыть запрос без отправки", exact: true }).getByRole("button", { name: "Продолжить заполнение", exact: true }).click();
    assert.equal(await dialog.getByLabel("Причина изменения").inputValue(), "Открыт новый счёт");
    lostRequest = true; await dialog.getByRole("button", { name: "Отправить запрос", exact: true }).click();
    await dialog.getByRole("button", { name: "Повторить отправку", exact: true }).waitFor();
    assert.equal(await dialog.getByLabel("Причина изменения").getAttribute("readonly"), "");
    assert.equal(await dialog.getByText("PRIVATE_INTERNAL_ERROR").count(), 0);
    await dialog.getByRole("button", { name: "Повторить отправку", exact: true }).click();
    await page.getByText("Запрос №8 на рассмотрении", { exact: true }).waitFor();
    const posts = calls.filter(call => call.path.endsWith("/change-requests") && call.method === "POST");
    assert.equal(posts.length, 2); assert.equal(new Set(posts.map(call => call.body.requestId)).size, 1);
    await page.reload(); await page.getByText("Запрос №8 на рассмотрении", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Запросить изменение", exact: true }).count(), 0);
    role = "ADMIN"; await page.goto(origin + "/admin?tab=sellers");
    await page.getByRole("button", { name: "fixture@example.com · Запрос №8", exact: true }).click();
    await page.getByLabel("Ответ продавцу").fill("Внесите новые реквизиты и сохраните данные");
    await page.getByRole("button", { name: "Разрешить редактирование", exact: true }).click();
    await page.getByRole("button", { name: "Подтвердить реквизиты", exact: true }).waitFor(); assert.equal(review.verified, false);
    await page.getByRole("button", { name: "Подтвердить реквизиты", exact: true }).click();
    await page.getByRole("dialog", { name: "Подтвердить реквизиты продавца", exact: true }).getByRole("button", { name: "Подтвердить", exact: true }).click();
    await page.getByText("Реквизиты подтверждены", { exact: true }).waitFor(); assert.equal(review.verified, true);
    review.verified = false; review.verifiedAt = null;
    role = "SELLER"; await page.goto(origin + "/seller/legal"); await page.getByRole("button", { name: "Редактировать", exact: true }).waitFor();
    await page.getByText("Редактирование разрешено", { exact: true }).waitFor();
    statusError = true; await page.reload(); await page.getByRole("button", { name: "Повторить", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Редактировать", exact: true }).count(), 0);
    statusError = false; await page.getByRole("button", { name: "Повторить", exact: true }).click(); await page.getByRole("button", { name: "Редактировать", exact: true }).waitFor();
    assert.deepEqual(pageErrors, []); fs.writeFileSync(path.join(directory, "result.json"), JSON.stringify({ passed: true, calls, pageErrors }, null, 2));
    console.log("Seller legal review PASS: view/edit/cancel/save/refresh, confirmed lock, independent contacts, request validation/idempotent retry, admin reopening, status failure, 1280/390/320");
  } catch (failure) { fs.writeFileSync(path.join(directory, "next.log"), logs); throw failure; }
  finally { await browser?.close(); child.kill(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(failure => { console.error(failure); process.exitCode = 1; });
