/* eslint-disable @typescript-eslint/no-require-imports -- Offline public API regression; all requests and navigation are intercepted. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

function load(file, imports = {}) {
  return closure(fs.readFileSync(file, "utf8"), {
    require(name) { assert(Object.hasOwn(imports, name), `Unexpected fixture import ${name}`); return imports[name]; },
  });
}
function closure(source, scope) {
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", ...Object.keys(scope), code)(mod, mod.exports, ...Object.values(scope));
  return mod.exports;
}
function findNode(file, predicate) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) { if (!found && predicate(node, source)) found = node; if (!found) ts.forEachChild(node, visit); }
  visit(source); assert(found, `Fixture node not found in ${file}`);
  return found.getText(source);
}

const errors = load("app/lib/apiErrors.ts");
const publicErrors = load("app/lib/publicRequestErrors.ts", { "./apiErrors": errors });
const checkout = load("app/checkout/lib/checkoutErrors.ts", { "../../lib/publicRequestErrors": publicErrors });
const authRequests = load("app/lib/authRequests.ts", { "./api": {} });
const returns = load("app/lib/safeReturnPath.ts");
const apiCalls = [];
let reply;
const api = { API_URL: "https://fixture.invalid", apiFetch: async (url, options) => {
  apiCalls.push({ url, options }); return reply(url, options);
} };
const legal = load("app/seller/lib/sellerLegalApi.ts", {
  "../../lib/api": api, "../../lib/apiErrors": errors, "../../lib/publicRequestErrors": publicErrors,
});

function limited(status = 429) {
  return Response.json({ code: status === 429 ? "PUBLIC_API_RATE_LIMITED" : "PUBLIC_API_UNAVAILABLE",
    message: "private upstream details" }, { status, headers: { "Retry-After": "45" } });
}

async function main() {
  const now = Date.parse("2026-11-07T12:00:00Z");
  for (const [header, expected] of [["45", 45], [" 60 ", 60], ["99999", 3600], ["0", null],
    ["-1", null], ["Infinity", null], ["invalid", null], ["x".repeat(129), null],
    [new Date(now + 30_000).toUTCString(), 30], [new Date(now - 30_000).toUTCString(), null]]) {
    assert.equal(publicErrors.retryAfterSeconds({ headers: new Headers({ "Retry-After": header }) }, now), expected);
  }
  assert.equal(publicErrors.retryAfterSeconds({ headers: new Headers() }, now), null);
  for (const status of [429, 503]) {
    const failure = await publicErrors.readPublicRequestError(limited(status), "fallback");
    assert(failure instanceof errors.ApiRequestError);
    assert.equal(failure.status, status);
    assert.match(failure.message, /через 45 с$/);
    assert(!failure.message.includes("private"));
    assert.equal(await checkout.readCheckoutError(limited(status), "fallback", true), failure.message);
    assert.equal(await checkout.readCheckoutError(limited(status), "Исход денежного действия неизвестен"),
      "Исход денежного действия неизвестен", "Public limits must not replace uncertain monetary-result copy");
  }

  for (const status of [429, 503]) {
    apiCalls.length = 0; reply = () => limited(status);
    await assert.rejects(() => legal.searchDeliveryCities("Москва & область"), error =>
      error instanceof errors.ApiRequestError && error.status === status && /через 45 с$/.test(error.message));
    assert.equal(apiCalls.length, 1);
    assert.equal(new URL(apiCalls[0].url).searchParams.get("query"), "Москва & область");
    assert(apiCalls[0].options.signal instanceof AbortSignal);
  }
  reply = () => Response.json([{ code: 44, fullName: "Москва" }]);
  assert.equal((await legal.searchDeliveryCities("Москва"))[0].code, 44);

  // Execute the real seller city-search effect, not a copy of its error branch.
  const sellerEffect = findNode("app/seller/components/SellerLegalTab.tsx", node =>
    ts.isArrowFunction(node) && node.body.getText().includes("const query = form.shippingCityName.trim()")
      && node.body.getText().includes("searchDeliveryCities(query)"));
  for (const status of [429, 503]) {
    const form = Object.freeze({ shippingCityName: "Москва", shippingCityCode: "", inn: "unchanged", shippingAddress: "Введённый адрес" });
    let fields = { inn: "Прежняя ошибка" }, options = ["old"], open = true, pending;
    const effect = closure(`const effect = ${sellerEffect}; module.exports = effect;`, {
      form, ApiRequestError: errors.ApiRequestError,
      searchDeliveryCities: async () => { throw await publicErrors.readPublicRequestError(limited(status), "fallback"); },
      setCityOptions: value => { options = value; }, setCityOptionsOpen: value => { open = value; },
      setErrors: update => { fields = update(fields); },
      window: { setTimeout: callback => { pending = callback; return 1; }, clearTimeout() {} },
    });
    effect(); pending(); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(options, []); assert.equal(open, false);
    assert.match(fields.shippingCityName, /через 45 с$/); assert.equal(fields.inn, "Прежняя ошибка");
    assert.equal(form.shippingCityName, "Москва"); assert.equal(form.shippingAddress, "Введённый адрес");
  }

  // Execute the real checkout function and retain the confirmed city/query/draft.
  const citySearch = findNode("app/checkout/CheckoutPageClient.tsx", node =>
    ts.isFunctionDeclaration(node) && node.name?.text === "searchCities");
  for (const status of [429, 503]) {
    const selected = Object.freeze({ code: 44, fullName: "Москва" });
    let fields = { pickup: "Прежняя ошибка" }, loading = false, count = 0;
    const search = closure(`${citySearch}; module.exports = searchCities;`, {
      citySearchRequestRef: { current: 0 }, countryCode: "RU", CheckoutActionError: checkout.CheckoutActionError,
      readCheckoutError: checkout.readCheckoutError,
      apiFetch: async () => { count++; return limited(status); }, API_URL: api.API_URL,
      setCityLoading: value => { loading = value; }, setError() {}, setCityOptions() {},
      setDeliveryErrors: update => { fields = update(fields); },
      setSelectedCity() { assert.fail("A failed public lookup must retain the selected city"); },
      setCityQuery() { assert.fail("A failed public lookup must retain the query"); },
    });
    await search("Москва");
    assert.equal(count, 1); assert.equal(loading, false);
    assert.match(fields.city, /через 45 с$/); assert.equal(fields.pickup, "Прежняя ошибка");
    assert.deepEqual(selected, { code: 44, fullName: "Москва" });
  }

  const navigations = [];
  let cartCalls = 0;
  const originalWindow = global.window;
  global.window = { location: { pathname: "/auth/login", search: "", assign: url => navigations.push(url) } };
  try {
    const yandex = load("app/lib/yandexAuth.ts", {
      "./api": api, "./auth": { getGuestCartId: () => "guest_fixture", ensureGuestCartId: async () => { cartCalls++; return "guest_fixture"; } },
      "./safeReturnPath": returns, "./authRequests": authRequests, "./apiErrors": errors,
      "./publicRequestErrors": publicErrors,
    });
    for (const url of ["https://oauth.yandex.ru/authorize?state=fixture", "https://oauth.yandex.com/authorize?state=fixture"]) {
      apiCalls.length = 0; reply = () => Response.json({ authorizationUrl: url });
      await yandex.startYandexAuth("/account?tab=orders");
      assert.equal(navigations.at(-1), url);
      assert.equal(apiCalls.length, 1); const request = apiCalls[0];
      assert.equal(new URL(request.url).pathname, "/api/auth/yandex/start-url");
      assert.equal(new URL(request.url).searchParams.get("next"), "/account?tab=orders");
      assert.equal(new URL(request.url).searchParams.get("cartId"), "guest_fixture");
      assert.equal(request.options.credentials, "include"); assert.equal(request.options.cache, "no-store");
      assert.equal(request.options.headers.Accept, "application/json"); assert(request.options.signal instanceof AbortSignal);
    }
    for (const url of ["javascript:alert(1)", "http://oauth.yandex.ru/authorize", "https://attacker.invalid/",
      "https://oauth.yandex.ru.attacker.invalid/authorize", "https://user:password@oauth.yandex.ru/authorize",
      "https://oauth.yandex.ru:444/authorize", "/authorize", "", null]) {
      const previous = navigations.length; reply = () => Response.json({ authorizationUrl: url });
      await assert.rejects(() => yandex.startYandexAuth("/admin"), error => error instanceof authRequests.AuthRequestError && error.status === 502);
      assert.equal(navigations.length, previous);
    }
    for (const status of [429, 503]) {
      const previous = navigations.length; apiCalls.length = 0; reply = () => limited(status);
      await assert.rejects(() => yandex.startYandexAuth("//attacker.invalid"), error =>
        error instanceof authRequests.AuthRequestError && error.status === status && /через 45 с$/.test(error.message));
      assert.equal(apiCalls.length, 1); assert.equal(navigations.length, previous);
      assert.equal(new URL(apiCalls[0].url).searchParams.get("next"), "/");
    }
    reply = () => new Response("<html>private failure</html>");
    await assert.rejects(() => yandex.startYandexAuth(), error => error instanceof authRequests.AuthRequestError
      && error.status === 502 && !error.message.includes("private"));
    reply = () => { throw new TypeError("private endpoint unavailable"); };
    await assert.rejects(() => yandex.startYandexAuth(), error => error instanceof authRequests.AuthRequestError
      && error.status === 0 && !error.message.includes("private"));
    assert.equal(cartCalls, 0);
  } finally { if (originalWindow === undefined) delete global.window; else global.window = originalWindow; }
  console.log("Public API errors: bounded Retry-After, safe 429/503, city/draft preservation, single requests and validated Yandex navigation passed");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
