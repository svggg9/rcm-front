/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");

function load(file, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const target = { exports: {} };
  new Function("module", "exports", "require", code)(target, target.exports, name => {
    assert(name in imports, `Unexpected import ${name}`);
    return imports[name];
  });
  return target.exports;
}

const errors = load("app/lib/apiErrors.ts");
const mapper = load("app/lib/productMappers.ts");
const urls = load("app/lib/productUrls.ts");
const PRODUCT = {
  id: 7, sellerId: 51, publicId: "p_abc", title: "Сумка", description: "Описание",
  brand: "Марка", category: "Сумки", images: ["/bag.webp"],
  variants: [{ id: 8, size: "ONE", color: "Чёрный", price: 5000, availableQuantity: 2, sku: "A-8" }],
  details: { cityOfOrigin: "Италия" },
};
const loaderPath = "app/product/[id]/lib/getProductPage.ts";
const pagePath = "app/product/[id]/page.tsx";

function loader() {
  return load(loaderPath, {
    react: { cache(fn) {
      const cache = new Map();
      return key => {
        if (!cache.has(key)) cache.set(key, fn(key));
        return cache.get(key);
      };
    } },
    "../../../lib/config": { API_URL: "http://fixture.invalid" },
    "../../../lib/apiErrors": errors,
    "../../../lib/productMappers": mapper,
  });
}

function page(api, notFound) {
  return load(pagePath, {
    "react/jsx-runtime": jsx,
    "./ProductPageClient": { default: function ProductPageClient() {} },
    "next/navigation": { notFound },
    "../../lib/productUrls": urls,
    "./lib/getProductPage": api,
  });
}

function response(status, data) {
  return { status, ok: status >= 200 && status < 300, json: async () => data };
}

async function main() {
  const originalFetch = global.fetch;
  const originalTimeout = AbortSignal.timeout;
  let calls = [];
  function install(handler) {
    calls = [];
    global.fetch = async (url, options) => {
      assert.equal(new URL(url).origin, "http://fixture.invalid", "No real network is permitted");
      calls.push({ url, options });
      return handler(url, options);
    };
  }
  function safeError(error, kind, status) {
    assert(error instanceof errors.ApiRequestError);
    assert.equal(error.kind, kind);
    if (status !== undefined) assert.equal(error.status, status);
    assert(!error.message.includes("PRIVATE_SERVER_BODY"));
    assert(!error.message.includes("fetch failed"));
    return true;
  }
  try {
    install(async () => ({ status: 404, ok: false, json() { throw new Error("404 body must not be read"); } }));
    assert.equal(await loader().loadProductPage("missing"), null);
    assert.equal(calls.length, 1);

    for (const status of [401, 403, 410, 429, 500, 502, 503]) {
      install(async () => ({ status, ok: false, json() { throw new Error("Upstream error body must not be read"); } }));
      await assert.rejects(loader().loadProductPage("7"), error => safeError(error, "http", status));
      assert.equal(calls.length, 1, "A failed GET is not retried automatically");
    }
    install(async () => ({ status: 502, ok: false, json() { throw new SyntaxError("PRIVATE_SERVER_BODY"); } }));
    await assert.rejects(loader().loadProductPage("7"), error => safeError(error, "http", 502));

    install(async () => { throw new TypeError("fetch failed PRIVATE_SERVER_BODY"); });
    await assert.rejects(loader().loadProductPage("7"), error => safeError(error, "network"));

    for (const bodyFailure of [false, true]) {
      const controller = new AbortController();
      AbortSignal.timeout = ms => {
        assert.equal(ms, 20_000);
        controller.abort(new DOMException("PRIVATE_SERVER_BODY", "TimeoutError"));
        return controller.signal;
      };
      install(async () => {
        if (!bodyFailure) throw new DOMException("PRIVATE_SERVER_BODY", "AbortError");
        return { status: 200, ok: true, json() { throw new DOMException("PRIVATE_SERVER_BODY", "AbortError"); } };
      });
      await assert.rejects(loader().loadProductPage("7"), error => safeError(error, "timeout"));
    }
    AbortSignal.timeout = originalTimeout;

    for (const body of [null, [], {}, { product: null }, { product: [] }, { product: {} },
      { product: { ...PRODUCT, images: [null] } },
      { product: { ...PRODUCT, variants: [{ ...PRODUCT.variants[0], price: "PRIVATE_SERVER_BODY" }] } },
      { product: { ...PRODUCT, variants: [{ ...PRODUCT.variants[0], availableQuantity: -1 }] } },
      { product: { ...PRODUCT, colorways: [null] } },
      { product: { ...PRODUCT, brandDescription: {} } },
    ]) {
      install(async () => response(200, body));
      await assert.rejects(loader().loadProductPage("7"), error => safeError(error, "invalid-response"));
    }
    install(async () => ({ status: 200, ok: true, json() { throw new SyntaxError("PRIVATE_SERVER_BODY"); } }));
    await assert.rejects(loader().loadProductPage("7"), error => safeError(error, "invalid-response"));

    install(async () => response(200, { product: PRODUCT, related: [null, [], {}, { id: -1, title: "Нет" },
      { id: 21, title: "" }, { id: 22, title: "Рекомендация", brand: "Марка", minPrice: 700, coverImage: "/other.webp" },
      { id: 23, title: "Частичные данные", publicId: 99, images: [null, "/valid.webp"], variants: [null, { price: NaN }, { price: 100 }] },
    ] }));
    const loaded = await loader().loadProductPage("p_abc /?#");
    assert.deepEqual(loaded.product.details, PRODUCT.details, "Optional product details are preserved untouched");
    assert.deepEqual(loaded.related.map(product => product.id), [22, 23]);
    assert.equal(loaded.related[1].publicId, null);
    assert.equal(loaded.related[1].minPrice, 100);
    assert.deepEqual(loaded.related[1].images, ["/valid.webp"]);
    assert(calls[0].url.includes("p_abc%20%2F%3F%23/page?relatedLimit=12"));
    assert.equal(calls[0].options.cache, "no-store");
    assert(calls[0].options.signal instanceof AbortSignal);

    install(async () => response(200, { product: { ...PRODUCT, description: null, brand: null, category: null }, related: {} }));
    const nullable = await loader().loadProductPage("7");
    assert.equal(nullable.product.description, "");
    assert.equal(nullable.product.brand, "");
    assert.equal(nullable.product.category, "");
    assert.deepEqual(nullable.related, []);

    let notFoundCalls = 0;
    const notFound = () => { notFoundCalls += 1; throw new Error("NEXT_NOT_FOUND"); };
    install(async () => response(200, { product: PRODUCT, related: [] }));
    const cachedPage = page(loader(), notFound);
    const params = Promise.resolve({ id: "abc" });
    const metadata = await cachedPage.generateMetadata({ params });
    const element = await cachedPage.default({ params });
    assert.equal(calls.length, 1, "Metadata and RSC page share one cached response");
    assert.equal(metadata.title, "Марка Сумка | рцмаркет");
    assert.equal(metadata.alternates.canonical, "/p/abc/marka-sumka");
    assert.equal(element.props.product.id, PRODUCT.id);

    install(async () => response(404, null));
    const missingPage = page(loader(), notFound);
    assert.equal((await missingPage.generateMetadata({ params })).title, "Товар не найден | рцмаркет");
    await assert.rejects(missingPage.default({ params }), /NEXT_NOT_FOUND/);
    assert.equal(notFoundCalls, 1);

    install(async () => response(503, { message: "PRIVATE_SERVER_BODY" }));
    const failedPage = page(loader(), notFound);
    await assert.rejects(failedPage.generateMetadata({ params }), error => safeError(error, "http", 503));
    await assert.rejects(failedPage.default({ params }), error => safeError(error, "http", 503));
    assert.equal(notFoundCalls, 1, "An upstream outage never invokes Next notFound");
    assert.equal(calls.length, 1);
    install(async () => response(200, { product: PRODUCT, related: [] }));
    assert.equal((await page(loader(), notFound).default({ params })).props.product.id, PRODUCT.id,
      "A fresh RSC request after refresh can recover from the previous failed request");

    const events = [];
    const RequestError = function RequestError() {};
    const errorBoundary = load("app/product/[id]/error.tsx", {
      react: { useTransition: () => [false, callback => { events.push("transition"); callback(); }] },
      "react/jsx-runtime": jsx,
      "next/navigation": { useRouter: () => ({ refresh: () => events.push("refresh") }) },
      "../../components/ui/RequestError": { RequestError },
    });
    const errorElement = errorBoundary.default({ error: new Error("PRIVATE_SERVER_BODY"), reset: () => events.push("reset") });
    assert.equal(errorElement.props.className, "pageContainer");
    const feedback = errorElement.props.children;
    assert.equal(feedback.type, RequestError);
    assert.equal(feedback.props.message, "Не удалось загрузить товар");
    assert.equal(feedback.props.loading, false);
    assert(!JSON.stringify(feedback.props).includes("PRIVATE_SERVER_BODY"));
    feedback.props.onRetry();
    assert.deepEqual(events, ["transition", "refresh", "reset"]);
    const canonicalBoundary = load("app/p/[code]/[slug]/error.tsx", {
      "../../../product/[id]/error": errorBoundary,
    });
    assert.equal(canonicalBoundary.default, errorBoundary.default, "Canonical and legacy URLs reuse one boundary");
    console.log("PASS: product 404/HTTP failure/network/timeout/malformed payload; optional related data survives");
    console.log("PASS: metadata/page cache, truthful notFound, fresh-request recovery and shared canonical retry boundary");
  } finally {
    global.fetch = originalFetch;
    AbortSignal.timeout = originalTimeout;
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
