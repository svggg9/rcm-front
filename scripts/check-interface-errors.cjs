/* eslint-disable @typescript-eslint/no-require-imports -- Offline transport regression; fetch is always intercepted. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, filename);

let calls = [];
let respond = () => { throw new Error("A mock response must be configured"); };
global.fetch = async (url, options) => { calls.push({ url, options }); return respond(url, options); };
const errors = require("../app/lib/apiErrors.ts");
const { requestApiResponse } = require("../app/lib/apiRequest.ts");
const store = require("../app/seller/lib/sellerBrandApi.ts");
const fallback = "Не удалось загрузить данные";
const unknownResult = "Не удалось подтвердить результат — обновите данные перед повтором";

async function deadline(work) {
  let timer;
  try {
    return await Promise.race([work, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Regression did not settle")), 1500);
    })]);
  } finally { clearTimeout(timer); }
}

async function safeFailure(work, message, kind, status) {
  await assert.rejects(() => deadline(work()), error => {
    assert(error instanceof errors.ApiRequestError);
    assert.equal(error.message, message);
    assert.equal(error.kind, kind);
    if (status !== undefined) assert.equal(error.status, status);
    assert(!/private|SyntaxError|Unexpected token|Failed to fetch|<html>/.test(error.message));
    return true;
  });
}

function stalledBody(_url, options) {
  return new Response(new ReadableStream({ start(controller) {
    options.signal.addEventListener("abort", () => controller.error(new DOMException("private body failure", "AbortError")), { once: true });
  } }), { headers: { "Content-Type": "application/json" } });
}

async function main() {
  for (const response of [new Response("<html>private upstream failure</html>", { status: 502 }),
    new Response("{private malformed", { status: 400 }), Response.json({ message: "private SQL details" }, { status: 500 })]) {
    const error = await errors.readApiError(response, fallback);
    assert.equal(error.message, fallback);
    assert.equal(error.status, response.status);
  }
  const known = await errors.readApiError(Response.json({ code: "CONFLICT", message: "known_rule" }, { status: 409 }), fallback,
    { known_rule: "Данные изменились — обновите список" });
  assert.equal(known.message, "Данные изменились — обновите список");
  assert.equal(known.code, "known_rule");
  for (const [status, message] of [[401, "Войдите в аккаунт ещё раз"], [403, "Недостаточно прав для этого действия"],
    [429, "Слишком много запросов — попробуйте позже"]]) {
    assert.equal((await errors.readApiError(new Response("", { status }), fallback)).message, message);
  }
  for (const message of ["toString", "constructor", "__proto__"]) {
    assert.equal((await errors.readApiError(Response.json({ message }, { status: 400 }), fallback, {})).message, fallback);
  }
  await safeFailure(() => errors.readApiJson(new Response("<html>private</html>"), fallback), fallback, "invalid-response", 200);

  respond = () => { throw new TypeError("Failed to fetch private endpoint"); };
  calls = [];
  await safeFailure(() => requestApiResponse("https://invalid.test/mutation", { method: "POST", body: "{}" }, unknownResult),
    unknownResult, "network");
  assert.equal(calls.length, 1, "A transport error must not retry a mutation");
  assert.equal(calls[0].options.credentials, "include");

  const cancelled = new AbortController(); cancelled.abort();
  calls = [];
  await assert.rejects(() => requestApiResponse("https://invalid.test", { signal: cancelled.signal }, fallback), errors.isRequestCancelled);
  assert.equal(calls.length, 0, "An already cancelled request must never reach fetch");

  respond = (_url, options) => new Promise((_, reject) => {
    options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
  });
  await safeFailure(() => requestApiResponse("https://invalid.test", {}, fallback, 15),
    "Сервер не ответил — попробуйте ещё раз", "timeout");
  const caller = new AbortController();
  const pending = requestApiResponse("https://invalid.test", { signal: caller.signal }, fallback);
  caller.abort();
  await assert.rejects(() => deadline(pending), errors.isRequestCancelled);

  const any = Object.getOwnPropertyDescriptor(AbortSignal, "any");
  try {
    Object.defineProperty(AbortSignal, "any", { value: undefined, configurable: true });
    const parent = new AbortController();
    const waiting = requestApiResponse("https://invalid.test", { signal: parent.signal }, fallback);
    parent.abort();
    await assert.rejects(() => deadline(waiting), errors.isRequestCancelled);
    await safeFailure(() => requestApiResponse("https://invalid.test", { signal: new AbortController().signal }, fallback, 15),
      "Сервер не ответил — попробуйте ещё раз", "timeout");
  } finally { Object.defineProperty(AbortSignal, "any", any); }

  for (const read of [errors.readApiJson, errors.readApiBlob, errors.readApiError]) {
    respond = stalledBody;
    const response = await requestApiResponse("https://invalid.test", {}, fallback, 15);
    await safeFailure(() => read(response, fallback), "Сервер не ответил — попробуйте ещё раз", "timeout");
    const owner = new AbortController();
    const cancelledResponse = await requestApiResponse("https://invalid.test", { signal: owner.signal }, fallback);
    const body = read(cancelledResponse, fallback); owner.abort();
    await assert.rejects(() => deadline(body), errors.isRequestCancelled);
  }

  const collection = { id: 7, title: "Подборка", description: null, active: false, sortOrder: 0, products: [] };
  const payload = { title: "Черновик", description: "Введённый текст", active: false, productIds: [17] };
  const logo = new File(["image"], "logo.webp", { type: "image/webp" });
  const brand = { id: 17, name: "Бренд" };
  const operations = [
    [() => store.createSellerStorefrontCollection(17, payload), "Не удалось создать подборку", collection],
    [() => store.updateSellerStorefrontCollection(17, 7, payload), "Не удалось сохранить подборку", collection],
    [() => store.uploadSellerBrandLogo(17, logo), "Не удалось загрузить логотип производителя", brand],
  ];
  for (const [run, message, data] of operations) {
    respond = () => Response.json(data);
    assert.deepEqual(await run(), data);
    for (const response of [new Response("<html>private failure</html>", { status: 502 }),
      Response.json({ message: "private SQL failure" }, { status: 400 })]) {
      respond = () => response;
      await safeFailure(run, message, "http", response.status);
    }
    respond = () => new Response("{private malformed");
    await safeFailure(run, unknownResult, "invalid-response", 200);
    respond = () => { throw new DOMException("private timeout", "TimeoutError"); };
    calls = [];
    await safeFailure(run, unknownResult, "timeout");
    assert.equal(calls.length, 1);
    respond = () => Response.json({});
    await safeFailure(run, unknownResult, "invalid-response", 200);
    respond = () => { throw new TypeError("private connection refused"); };
    calls = [];
    await safeFailure(run, unknownResult, "network");
    assert.equal(calls.length, 1);
    assert.equal(payload.title, "Черновик"); assert.equal(payload.description, "Введённый текст");
  }
  respond = () => Response.json({ code: "CONFLICT", message: "На витрине можно разместить не более 12 подборок" }, { status: 409 });
  await safeFailure(() => store.createSellerStorefrontCollection(17, payload), "На витрине можно разместить не больше 12 подборок", "http", 409);
  respond = () => Response.json({});
  await safeFailure(() => store.getSellerStorefrontCollections(17), "Не удалось загрузить подборки", "invalid-response", 200);
  respond = () => Response.json({ content: [] });
  await safeFailure(() => store.getSellerStorefrontProducts(17), "Не удалось загрузить товары для подборки", "invalid-response", 200);
  respond = () => Response.json([]);
  assert.deepEqual(await store.getSellerStorefrontCollections(17), []);
  console.log("Interface errors: safe messages, business/status metadata, bounded fetch/body reads, cancellation fallback, single mutations and seller draft requests passed");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
