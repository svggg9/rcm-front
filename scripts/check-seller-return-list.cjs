/* eslint-disable @typescript-eslint/no-require-imports -- Isolated API contract regression, no real network or writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

function load(file, imports) {
  const testModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("module", "exports", "require", code)(testModule, testModule.exports, name => {
    assert(name in imports, `Unexpected import ${name}`);
    return imports[name];
  });
  return testModule.exports;
}

const calls = [];
let nextResponse;
const api = load("app/lib/returns.ts", {
  "./api": { API_URL: "https://invalid.test", apiFetch: async (url, options) => {
    calls.push({ url, options }); return nextResponse;
  } },
  "./returnPhotoUrls": { resolveReturnPhotoUrl() { throw new Error("List must not process photos"); } },
  "../account/lib/presentation": { accountApiError() { throw new Error("Buyer API must not be involved"); } },
});
const presentation = load("app/seller/lib/sellerReturnListPresentation.ts", {});
const row = (id, status = "REQUESTED") => ({ id, orderId: id + 100, productId: 10, variantId: 20,
  productTitle: "Тестовая рубашка", sku: "100216", quantity: 1, reason: "DEFECT", status, cdekNumber: null });
const page = (content, totalElements = content.length, number = 0, size = 20) => ({
  content, number, size, totalElements, totalPages: Math.ceil(totalElements / size), numberOfElements: content.length,
});
function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}
async function reject(body, description, status = 200) {
  nextResponse = response(body, status);
  await assert.rejects(api.getSellerReturns(), error => error.message === "Не удалось загрузить возвраты", description);
}

async function run() {
  nextResponse = response(page([]));
  assert.deepEqual(await api.getSellerReturns(), { items: [], page: 0, totalPages: 0, totalItems: 0 }, "Confirmed empty page remains empty");
  nextResponse = response({ content: [], number: 0, totalElements: 0, totalPages: 0 });
  assert.equal((await api.getSellerReturns()).totalItems, 0, "Optional Spring size and numberOfElements metadata may be absent");
  const initial = Array.from({ length: 20 }, (_, index) => row(index + 1));
  nextResponse = response(page(initial, 23));
  const controller = new AbortController();
  assert.deepEqual((await api.getSellerReturns({ signal: controller.signal })).items, initial);
  assert.match(calls.at(-1).url, /\/api\/seller\/returns\/list\?page=0&size=20$/);
  assert.equal(calls.at(-1).options.signal, controller.signal);
  nextResponse = response(page([row(21), row(22), row(23)], 23, 1));
  assert.equal((await api.getSellerReturns({ page: 1 })).page, 1, "Second page metadata stays available");
  nextResponse = response(page([], 23, 2));
  assert.equal((await api.getSellerReturns({ page: 2 })).items.length, 0, "Out-of-range page can be genuinely empty");
  nextResponse = response(page(initial.slice(0, 19), 23));
  assert.equal((await api.getSellerReturns()).items.length, 19, "Concurrent changes can produce a short nonempty page");

  await reject({ message: "Internal details" }, "HTTP404 must not become empty", 404);
  await reject({ message: "Internal details" }, "HTTP500 must not leak transport details", 500);
  for (const malformed of [null, [], {}, { content: [] }, { ...page([]), totalPages: -1 },
    { ...page([]), totalElements: "0" }, { ...page([]), number: 0.5 }, { ...page([]), size: 0 },
    { ...page([]), totalPages: 1 },
    { ...page([row(1)]), number: 1 }, { ...page([row(1)]), numberOfElements: 0 },
    page([null]), page([row(1, "UNKNOWN_STATUS")]), page([{ ...row(1), reason: "UNKNOWN_REASON" }]),
    page([{ ...row(1), id: -1 }]), page([{ ...row(1), productTitle: {} }]), page([row(1), row(1)]),
    page(Array.from({ length: 21 }, (_, index) => row(index + 1))),
  ]) await reject(malformed, "Malformed pages must not masquerade as empty or complete");
  nextResponse = { ok: true, status: 200, json: async () => { throw new SyntaxError("Secret response content"); } };
  await assert.rejects(api.getSellerReturns(), error => error.message === "Не удалось загрузить возвраты");

  const statuses = Object.keys(api.returnStatusLabels);
  const requests = statuses.map((status, index) => row(index + 1, status));
  const serialized = JSON.stringify(requests);
  const groups = ["active", "inspection", "completed"].flatMap(group => presentation.filterSellerReturns(requests, group, ""));
  assert.equal(groups.length, statuses.length);
  assert.equal(new Set(groups.map(item => item.id)).size, statuses.length, "Every status belongs to exactly one group");
  assert.equal(presentation.filterSellerReturns(requests, "inspection", "")[0].status, "RECEIVED", "Seller inspection is only available after receiving");
  assert.equal(presentation.sellerReturnGroup("REQUESTED"), presentation.sellerReturnGroup("SUBMITTED"));
  assert.equal(presentation.sellerReturnGroup("WAITING_FOR_ITEM"), presentation.sellerReturnGroup("AWAITING_SHIPMENT"));
  assert.equal(presentation.filterSellerReturns(requests, "inspection", "  РУБАШКА  ").length, 1);
  assert.equal(presentation.filterSellerReturns(requests, "inspection", "100216").length, 1);
  assert.equal(presentation.filterSellerReturns(requests, "inspection", "не найдено").length, 0);
  assert.equal(presentation.parseSellerReturnGroup("admin-review"), "all");
  assert.equal(JSON.stringify(requests), serialized, "Search/group selection never mutates confirmed data");
  console.log("PASS seller return list: Spring pages, genuine empty, safe HTTP/JSON/shape errors, pagination, status partition, normalized search");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
