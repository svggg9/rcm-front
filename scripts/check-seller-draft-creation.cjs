/* eslint-disable @typescript-eslint/no-require-imports -- Isolated API and handler regression */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
let request;
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
require.extensions[".ts"] = (module, filename) => module._compile(compile(fs.readFileSync(filename, "utf8")), filename);
const load = Module._load;
Module._load = function(name, ...args) {
  if (name === "../../lib/api") return { API_URL: "http://fixture", apiFetch: (...values) => request(...values) };
  return load.call(this, name, ...args);
};
const { createSellerProductDraft } = require("../app/seller/lib/createSellerProductDraft.ts");
const source = fs.readFileSync("app/seller/components/SellerLegalTab.tsx", "utf8");
const ast = ts.createSourceFile("legal.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "createProductDraft") handler = compile(node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
(async () => {
  let calls = 0;
  request = async (url, options) => {
    calls++;
    assert.equal(url, "http://fixture/api/seller/products/draft");
    assert.equal(options.method, "POST");
    assert.ok(options.signal instanceof AbortSignal);
    return new Response("123");
  };
  assert.equal(await createSellerProductDraft(), 123);
  assert.equal(calls, 1);
  for (const body of ["null", "0", "-1", '"123"', "{}", "<html>broken</html>"]) {
    request = async () => new Response(body);
    await assert.rejects(createSellerProductDraft(), /проверьте список товаров/);
  }
  request = async () => new Response('{"message":"SQL stack trace"}', { status: 500 });
  await assert.rejects(createSellerProductDraft(), error => !/SQL|stack|message|\{/.test(error.message));
  const timeout = AbortSignal.timeout;
  AbortSignal.timeout = ms => { assert.equal(ms, 20000); return timeout(5); };
  request = (_, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
  const keepAlive = setInterval(() => {}, 100);
  try { await assert.rejects(createSellerProductDraft(), /не подтвердил.*перед повтором/); }
  finally { clearInterval(keepAlive); AbortSignal.timeout = timeout; }

  const notifications = [], routes = [], states = [];
  const pending = { current: false };
  let finish, attempts = 0;
  const context = {
    creatingProductRef: pending, setCreatingProduct: value => states.push(value), setError() {},
    createSellerProductDraft: () => { attempts++; return new Promise((resolve, reject) => { finish = { resolve, reject }; }); },
    toast: { dismiss() {}, loading() {}, error: (message, options) => notifications.push({ message, options }) },
    router: { push: path => routes.push(path) },
  };
  const run = new Function(...Object.keys(context), `${handler}; return createProductDraft;`)(...Object.values(context));
  const first = run();
  await run();
  assert.equal(attempts, 1, "Double click cannot create two drafts");
  finish.reject(new Error("Не подтверждено — проверьте список товаров"));
  await first;
  assert.equal(pending.current, false);
  assert.deepEqual(states, [true, false], "Failure unlocks the form");
  assert.equal(notifications[0].options.id, "seller-legal-create", "Error replaces the spinner");
  assert.deepEqual(routes, []);
  const next = run(); finish.resolve(456); await next;
  assert.equal(attempts, 2, "Retry is explicit");
  assert.deepEqual(routes, ["/seller/products/456/create"]);
  assert.equal(pending.current, false);
  console.log("PASS: bounded draft creation, safe errors/IDs, no automatic retry, duplicate guard, spinner replacement, form unlock and explicit retry");
})().catch(error => { console.error(error); process.exitCode = 1; });
