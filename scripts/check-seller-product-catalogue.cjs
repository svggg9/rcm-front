/* eslint-disable @typescript-eslint/no-require-imports -- Isolated pagination/API fixture */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
let request;
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === "../../lib/api") return { API_URL: "http://fixture", apiFetch: (...values) => request(...values) };
  return originalLoad.call(this, name, ...args);
};
const { getSellerProductCatalogueClient } = require("../app/seller/lib/sellerClientDataApi.ts");
const response = data => ({ ok: true, json: async () => data });
(async () => {
  const calls = [];
  request = async (url, options) => {
    calls.push({ url: new URL(url), options });
    const page = Number(new URL(url).searchParams.get("page"));
    return response({ content: page === 0 ? [{ id: 1, title: "Первый" }] : [{ id: 1, title: "Обновлённый" }, { id: 99, title: "Поздняя страница", categoryName: "Редкая категория" }], totalPages: 2 });
  };
  const result = await getSellerProductCatalogueClient({ key: "title", direction: "asc" });
  assert.deepEqual(result.map(item => item.id), [1, 99]);
  assert.equal(result[0].title, "Обновлённый");
  assert.equal(result[1].categoryName, "Редкая категория");
  assert.deepEqual(calls.map(call => call.url.searchParams.get("page")), ["0", "1"]);
  assert.ok(calls.every(call => call.url.pathname === "/api/seller/products/list" && call.url.searchParams.get("sort") === "title,asc"));
  request = async () => response({ content: [], totalPages: 0 });
  assert.deepEqual(await getSellerProductCatalogueClient(null), []);
  request = async () => response({ content: [], totalPages: 2 });
  await assert.rejects(getSellerProductCatalogueClient(null), /не полностью/);
  let pages = 0;
  request = async () => ++pages === 1 ? response({ content: [{ id: 1 }], totalPages: 2 }) : { ok: false };
  await assert.rejects(getSellerProductCatalogueClient(null), /Не удалось загрузить/);
  const controller = new AbortController();
  request = async () => { controller.abort(); return response({ content: [{ id: 1 }], totalPages: 2 }); };
  await assert.rejects(getSellerProductCatalogueClient(null, controller.signal), { name: "AbortError" });
  console.log("PASS: complete catalogue pagination, sorting, late categories, deduplication, empty catalogue, incomplete/error rejection and obsolete-request cancellation");
})().catch(error => { console.error(error); process.exitCode = 1; });
