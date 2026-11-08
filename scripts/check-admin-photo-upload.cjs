/* eslint-disable @typescript-eslint/no-require-imports -- Isolated admin upload regression; fetch is always mocked. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { uploadAdminStorefrontHero, updateAdminNewArrivals, saveAdminStorefrontSection, reorderAdminStorefrontSections, deleteAdminStorefrontSection } = require("../app/admin/lib/adminApi.ts");
const { ApiRequestError } = require("../app/lib/apiErrors.ts");
const limit = 10 * 1024 * 1024;
const file = (type, size) => new File([new Uint8Array(size)], "selected-file", { type });
let calls = 0;
let respond = () => Response.json({ heroImageUrl: "/hero.webp", collections: [] });
global.fetch = async (url, options) => {
  calls++;
  assert.equal(new URL(url).pathname, "/api/admin/storefront/home/hero-image");
  assert.equal(options.method, "POST");
  assert.equal(options.credentials, "include");
  assert.ok(options.body instanceof FormData);
  return respond(options);
};
async function rejectPhoto(photo, message) {
  await assert.rejects(() => uploadAdminStorefrontHero(photo), error => {
    assert.equal(error.message, message);
    return true;
  });
}
async function responseError(response, expected, status) {
  respond = () => response;
  await assert.rejects(() => uploadAdminStorefrontHero(file("image/png", 1)), error => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.message, expected);
    assert.equal(error.status, status);
    assert.equal(error.kind, "http");
    return true;
  });
}
async function main() {
  for (const invalid of [
    [file("image/png", 0), "Выберите непустую фотографию"],
    [file("image/jpeg", limit + 1), "Фото должно быть не больше 10 МБ"],
    [file("image/gif", 1), "Разрешены только JPEG, PNG и WebP"],
  ]) await rejectPhoto(...invalid);
  assert.equal(calls, 0, "Invalid metadata must not reach the network");
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    const original = file(type, limit);
    respond = async options => {
      const uploaded = options.body.get("file");
      assert.equal(uploaded.type, type);
      assert.equal(uploaded.size, limit);
      assert.deepEqual(Buffer.from(await uploaded.arrayBuffer()), Buffer.from(await original.arrayBuffer()));
      return Response.json({ heroImageUrl: "/hero.webp", heroPositionX: 35, heroPositionY: 60, collections: [] });
    };
    assert.deepEqual(await uploadAdminStorefrontHero(original), { heroImageUrl: "/hero.webp", updatedAt: null, heroPositionX: 35, heroPositionY: 60, collections: [], sections: [], newArrivalsCollectionId: null, newArrivalsCount: 8 });
  }
  for (const response of [
    Response.json({ timestamp: "private", code: "PAYLOAD_TOO_LARGE", message: "private SQL details", path: "/private" }, { status: 413 }),
    new Response("<html>private proxy failure</html>", { status: 413 }),
  ]) await responseError(response, "Фото должно быть не больше 10 МБ", 413);
  const known = [
    [400, "Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне", "Фото должно быть не больше 48 мегапикселей и 16384 пикселей по стороне"],
    [400, "Выберите статичную фотографию без анимации", "Выберите статичную фотографию без анимации"],
    [400, "Не удалось прочитать фото или его содержимое не соответствует JPEG/PNG/WebP", "Не удалось прочитать фото — выберите JPEG, PNG или WebP"],
    [503, "Другая фотография ещё обрабатывается, повторите загрузку", "Другая фотография ещё обрабатывается — повторите загрузку"],
    [503, "Обработка фотографий временно недоступна", "Обработка фотографий временно недоступна — попробуйте ещё раз"],
  ];
  for (const [status, message, expected] of known) await responseError(Response.json({ message, detail: "private" }, { status }), expected, status);
  await responseError(new Response("<html>private queue details</html>", { status: 503 }), "Обработка фотографий временно недоступна — попробуйте ещё раз", 503);
  await responseError(Response.json({ message: "<script>private untrusted message</script>" }, { status: 400 }), "Не удалось загрузить изображение витрины", 400);
  await responseError(new Response("<html>private upstream failure</html>", { status: 502 }), "Не удалось загрузить изображение витрины", 502);
  console.log("PASS: admin hero JPEG/PNG/WebP exact 10 MiB original multipart, local empty/type/+1 rejection without network, safe 413 JSON/HTML, known pixel/animation/corruption/busy mappings and no raw server responses");
  for (const collectionId of [42, null]) {
    global.fetch = async (url, options) => {
      assert.equal(new URL(url).pathname, "/api/admin/storefront/home/new-arrivals");
      assert.equal(options.method, "PATCH");
      assert.equal(options.credentials, "include");
      assert.deepEqual(JSON.parse(options.body), { collectionId });
      return Response.json({ collections: [], newArrivalsCollectionId: collectionId });
    };
    assert.equal((await updateAdminNewArrivals(collectionId)).newArrivalsCollectionId, collectionId);
  }
  global.fetch = async (url, options) => {
    assert.deepEqual(JSON.parse(options.body), { collectionId: null, count: 36 });
    return Response.json({ collections: [], newArrivalsCollectionId: null, newArrivalsCount: 36 });
  };
  assert.equal((await updateAdminNewArrivals(null, 36)).newArrivalsCount, 36);
  global.fetch = async () => new Response("<html>private upstream detail</html>", { status: 502 });
  await assert.rejects(() => updateAdminNewArrivals(42), { message: "Не удалось сохранить источник новинок" });
  console.log("PASS: authenticated manual/automatic new-arrivals PATCH payload and safe upstream error");
  const section = { id: 7, kind: "CATEGORY", targetId: 13, title: "Одежда", targetSlug: "catalog-clothing", coverImageUrl: "/section.webp",
    coverPositionX: 25, coverPositionY: 70, sortOrder: 0, active: true, available: true };
  const payload = { kind: "CATEGORY", targetId: 13, active: true, coverPositionX: 25.1, coverPositionY: 69.9, file: file("image/png", 1) };
  let sectionCalls = 0;
  global.fetch = async (url, options) => {
    sectionCalls++;
    assert.equal(new URL(url).pathname, "/api/admin/storefront/home/sections"); assert.equal(options.method, "POST");
    assert.equal(options.credentials, "include"); assert(options.body instanceof FormData);
    assert.equal(options.body.get("kind"), "CATEGORY"); assert.equal(options.body.get("targetId"), "13");
    assert.equal(options.body.get("active"), "true"); assert.equal(options.body.get("coverPositionX"), "25");
    assert.equal(options.body.get("coverPositionY"), "70"); assert.equal(options.body.get("file").type, "image/png");
    return Response.json(section);
  };
  assert.deepEqual(await saveAdminStorefrontSection(null, payload), section);
  await assert.rejects(() => saveAdminStorefrontSection(null, { ...payload, file: file("image/gif", 1) }), /JPEG, PNG и WebP/);
  assert.equal(sectionCalls, 1, "Invalid file is rejected without a partial metadata request");
  global.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, "/api/admin/storefront/home/sections/7"); assert.equal(options.method, "PUT");
    assert.equal(options.body.has("file"), false); assert.equal(options.body.get("removeCover"), "true");
    return Response.json({ ...section, coverImageUrl: null, active: false });
  };
  assert.equal((await saveAdminStorefrontSection(7, { ...payload, file: undefined, removeCover: true, active: false })).coverImageUrl, null);
  for (const body of [{ ...section, id: 8 }, { ...section, targetId: 14 }, {}]) {
    global.fetch = async () => Response.json(body);
    await assert.rejects(() => saveAdminStorefrontSection(7, payload), error => error.kind === "invalid-response");
  }
  const nextSection = { ...section, id: 8, kind: "COLLECTION", targetId: 1, sortOrder: 1 };
  global.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, "/api/admin/storefront/home/sections/order"); assert.equal(options.method, "PATCH");
    assert.deepEqual(JSON.parse(options.body), { ids: [7, 8] });
    return Response.json([section, nextSection]);
  };
  assert.equal((await reorderAdminStorefrontSections([7, 8])).length, 2);
  for (const body of [{}, [], [section], [section, section], [section, nextSection, null], [nextSection, { ...section, sortOrder: 2 }]]) {
    global.fetch = async () => Response.json(body);
    await assert.rejects(() => reorderAdminStorefrontSections([7, 8]), error => error.kind === "invalid-response");
  }
  global.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, "/api/admin/storefront/home/sections/7"); assert.equal(options.method, "DELETE");
    return new Response(null, { status: 204 });
  };
  await deleteAdminStorefrontSection(7);
  for (const [response, message] of [
    [Response.json({ message: "Загрузите обложку перед публикацией" }, { status: 400 }), "Загрузите обложку перед публикацией"],
    [new Response("<html>private</html>", { status: 413 }), "Фото должно быть не больше 10 МБ"],
    [Response.json({ message: "private SQL detail" }, { status: 502 }), "Не удалось сохранить раздел — проверьте цель и обложку"],
  ]) {
    global.fetch = async () => response;
    await assert.rejects(() => saveAdminStorefrontSection(7, payload), { message });
  }
  console.log("PASS: section atomic multipart create/update/remove, local invalid upload rejection, exact reorder validation, authenticated delete and safe errors");
}
async function adminInterfaceErrors() {
  const admin = require("../app/admin/lib/adminApi.ts");
  const contact = require("../app/admin/lib/contactMessages.ts");
  const preview = require("../app/admin/lib/adminSellerBrandPreview.ts");
  const workspace = require("../app/admin/lib/workspaceApi.ts");
  for (const response of [
    new Response("<html>private upstream detail</html>", { status: 502 }),
    Response.json({ code: "UNKNOWN", message: "private SQL detail" }, { status: 500 }),
  ]) {
    global.fetch = async () => response;
    await assert.rejects(() => admin.getAdminOrders(), error => error instanceof ApiRequestError
      && error.kind === "http" && error.status === response.status && error.message === "Не удалось загрузить заказы");
  }
  global.fetch = async () => new Response("private malformed success", { status: 200 });
  await assert.rejects(() => admin.getAdminOrders(), error => error instanceof ApiRequestError && error.kind === "invalid-response"
    && !error.message.includes("private"));
  global.fetch = async () => Response.json({ message: "Название оттенка изменилось — обновите товар" }, { status: 409 });
  await assert.rejects(() => admin.assignProductColor(1, 2, 3, "Синий"), error => error instanceof ApiRequestError
    && error.status === 409 && error.message === "Название оттенка изменилось — обновите товар");
  let mutationCalls = 0;
  global.fetch = async () => { mutationCalls++; throw new TypeError("Failed to fetch private upstream"); };
  await assert.rejects(() => admin.refundAdminOrder(1), error => error instanceof ApiRequestError && error.kind === "network"
    && error.message === "Не удалось получить результат действия — обновите данные перед повтором");
  assert.equal(mutationCalls, 1, "A refund is never automatically retried");
  const cancelled = new AbortController(); cancelled.abort();
  global.fetch = async () => { throw new Error("Cancelled caller must not reach fetch"); };
  await assert.rejects(() => contact.getContactMessages("ALL", 0, cancelled.signal), { name: "AbortError" });
  global.fetch = async () => Response.json({ message: "private response detail" }, { status: 409 });
  await assert.rejects(() => contact.retryContactReply(1, 2, "request-1", new AbortController().signal), error => error instanceof ApiRequestError
    && error.status === 409 && error.message === "Этот запрос уже обработан или повтор недоступен — обновите историю ответов");
  mutationCalls = 0;
  global.fetch = async () => { mutationCalls++; throw new TypeError("private network detail"); };
  await assert.rejects(() => contact.createContactReply(1, "Ответ", "request-1", new AbortController().signal), error => error instanceof ApiRequestError
    && error.message === "Не удалось получить результат отправки — проверьте историю перед повтором");
  assert.equal(mutationCalls, 1, "An uncertain reply is never automatically sent again");

  const reference = { id: 7, name: "Бренд", slug: "brand", isActive: true };
  let profileFailure = true;
  global.fetch = async url => {
    const path = new URL(url).pathname;
    if (path.endsWith("/resolve")) return Response.json(reference);
    if (path === "/api/brands/brand") return profileFailure ? new Response("private", { status: 503 }) : Response.json(reference);
    return Response.json({ content: [], totalElements: 0 });
  };
  const params = { userId: 1001, brandName: "brand", allowNameFallback: false };
  await assert.rejects(() => preview.getAdminSellerBrandPreview(params), error => error instanceof ApiRequestError && error.status === 503);
  profileFailure = false;
  const recovered = await preview.getAdminSellerBrandPreview(params);
  assert.equal(recovered.totalProducts, 0, "A genuine empty catalog is distinct from its failed request");
  assert.deepEqual(recovered.products, []);
  let absent = true;
  global.fetch = async url => new URL(url).pathname.endsWith("/resolve") && absent
    ? new Response(null, { status: 404 })
    : Response.json(new URL(url).pathname.startsWith("/api/products/") ? { content: [], totalElements: 0 } : reference);
  const absentParams = { ...params, userId: 1002 };
  assert.equal(await preview.getAdminSellerBrandPreview(absentParams), null);
  absent = false;
  assert.ok(await preview.getAdminSellerBrandPreview(absentParams), "An absent brand must be re-resolved instead of cached forever");
  global.fetch = async url => Response.json(new URL(url).pathname.startsWith("/api/products/") ? { unexpected: [] } : reference);
  await assert.rejects(() => preview.getAdminSellerBrandPreview({ ...params, userId: 1003 }), error => error instanceof ApiRequestError
    && error.kind === "invalid-response");

  let resolves = 0;
  global.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/resolve") && ++resolves === 1) {
      return new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new DOMException("private abort", "AbortError")), { once: true });
      });
    }
    return Response.json(path.startsWith("/api/products/") ? { content: [], totalElements: 0 } : reference);
  };
  const first = new AbortController(), second = new AbortController();
  const cancelledPreview = preview.getAdminSellerBrandPreview({ ...params, userId: 1004, signal: first.signal });
  const activePreview = preview.getAdminSellerBrandPreview({ ...params, userId: 1004, signal: second.signal });
  first.abort();
  await assert.rejects(() => cancelledPreview, { name: "AbortError" });
  assert.ok(await activePreview, "Cancelling one preview cannot cancel another consumer");
  assert.equal(resolves, 2);

  global.fetch = async () => Response.json({});
  await assert.rejects(() => workspace.workspaceRequest("returns"), error => error instanceof ApiRequestError && error.kind === "invalid-response");
  global.fetch = async () => Response.json({ foo: 0 });
  await assert.rejects(() => workspace.workspaceRequest("summary"), error => error instanceof ApiRequestError && error.kind === "invalid-response");
  const zeroSummary = Object.fromEntries(["products", "sellers", "requisites", "returns", "payments", "refunds", "payouts", "deliveries", "chats", "messages"].map(key => [key, 0]));
  global.fetch = async () => Response.json(zeroSummary);
  assert.deepEqual(await workspace.workspaceRequest("summary"), zeroSummary, "A complete ten-key zero summary is a genuine empty workload");
  const errors = require("../app/lib/apiErrors.ts");
  const originalReadJson = errors.readApiJson;
  try {
    for (const failure of [new ApiRequestError("Сервер не ответил — попробуйте ещё раз", "timeout"), new DOMException("Запрос отменён", "AbortError")]) {
      errors.readApiJson = async () => { throw failure; };
      global.fetch = async () => Response.json({});
      for (const request of [
        () => admin.getAdminDictionary("categories"),
        () => admin.createAdminDictionaryItem("categories", { name: "Категория", parentId: null }),
        () => admin.saveAdminStorefrontSection(7, { kind: "BRAND", targetId: 1, active: false, coverPositionX: 50, coverPositionY: 50 }),
        () => admin.reorderAdminStorefrontSections([7]),
      ]) await assert.rejects(request, error => error === failure, "Feature validation must preserve an already normalized timeout or cancellation");
    }
  } finally { errors.readApiJson = originalReadJson; }
  await workspaceRefreshRetention();
  console.log("PASS: admin safe HTTP/network/JSON errors, preserved business status/code, single-attempt mutations, cancellation, brand failure-vs-empty/retry and independent preview cancellation, same-query workspace refresh retention");
}

async function workspaceRefreshRetention() {
  const vm = require("node:vm");
  const path = require("node:path");
  const { createRequire } = require("node:module");
  const filename = path.resolve(__dirname, "../app/admin/lib/workspaceApi.ts");
  const localRequire = createRequire(filename);
  const state = []; let cursor = 0, effect, effectDependencies, cleanup;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    },
    useCallback: value => value,
    useEffect(callback, dependencies) {
      if (!effectDependencies || dependencies.some((item, index) => !Object.is(item, effectDependencies[index]))) {
        effect = callback; effectDependencies = dependencies;
      }
    },
  };
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText, { module: mod, exports: mod.exports, AbortController,
    require: name => name === "react" ? hooks : localRequire(name) }, { filename });
  function render(query) {
    cursor = 0;
    const value = mod.exports.useAdminResource(query);
    if (effect) { const next = effect; effect = undefined; if (cleanup) cleanup(); cleanup = next(); }
    return value;
  }
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const page = { content: [{ id: 1 }], totalElements: 1, totalPages: 1, number: 0 };
  global.fetch = async () => Response.json(page);
  assert.equal(render("returns?status=ALL").loading, true);
  await flush();
  let current = render("returns?status=ALL");
  assert.equal(current.data.content[0].id, 1);
  current.refresh();
  global.fetch = async () => { throw new TypeError("private refresh failure"); };
  current = render("returns?status=ALL");
  assert.equal(current.loading, true);
  assert.equal(current.data.content[0].id, 1, "Confirmed data remains visible during refresh");
  await flush();
  current = render("returns?status=ALL");
  assert.equal(current.loading, false);
  assert.equal(current.data.content[0].id, 1, "Confirmed data remains after a failed refresh");
  assert.ok(current.error && !current.error.includes("private"));
  current = render("returns?status=APPROVED");
  assert.equal(current.data, undefined, "Confirmed rows from another filter must never leak into the new query");
  await flush();
  assert.equal(render("returns?status=APPROVED").data, undefined);
  global.fetch = async () => Response.json(page);
  current = render("returns?status=ALL");
  await flush();
  current = render("returns?status=ALL");
  assert.equal(current.data.content[0].id, 1);
  current.refresh();
  global.fetch = async () => Response.json({ message: "private denial" }, { status: 403 });
  render("returns?status=ALL");
  await flush();
  current = render("returns?status=ALL");
  assert.equal(current.data, undefined, "An authorization denial clears confirmed privileged rows");
  assert.equal(current.error, "Недостаточно прав для этого действия");
  if (cleanup) cleanup();
}

main().then(adminInterfaceErrors).catch(error => { console.error(error); process.exitCode = 1; });
