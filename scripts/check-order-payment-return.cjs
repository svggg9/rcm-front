/* eslint-disable @typescript-eslint/no-require-imports -- Isolated payment-return regression without bank or database writes. */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");
function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const testModule = { exports: {} };
  new Function("module", "exports", "require", code)(testModule, testModule.exports, name => imports[name]);
  return testModule.exports;
}
async function scenario(status, options = {}) {
  const effects = [], cleanups = [], updates = [], cleared = [], calls = [];
  let timer, visible;
  global.window = { setInterval(fn) { timer = fn; return 1; }, clearInterval() { timer = null; } };
  global.document = { hidden: false, addEventListener(_, fn) { visible = fn; }, removeEventListener() { visible = null; } };
  global.localStorage = { getItem: () => "cart" };
  const order = { id: 626, paymentStatus: "PENDING" };
  const updated = { ...order, paymentStatus: status === "SUCCEEDED" ? "PAID" : "PENDING" };
  const { useOrderPaymentSync } = load("app/account/lib/useOrderPaymentSync.ts", {
    react: { useRef: value => ({ current: value }), useState: value => [value, () => {}], useEffect: fn => effects.push(fn) },
    "../../lib/api": { API_URL: "", apiFetch: async (url, init = {}) => {
      calls.push([url, init.method ?? "GET"]);
      if (options.fail) throw new Error("private provider detail");
      if (url.endsWith("group-last")) return options.missing ? new Response(null, { status: 404 }) : Response.json({ status: "PENDING", externalId: "bank-626" });
      if (url.endsWith("/sync")) return Response.json({ status });
      assert.equal(url, "/api/orders/626");
      return Response.json(updated);
    } },
    "../../checkout/lib/pendingPayment": { clearSucceededPendingPayment: (...args) => cleared.push(args) },
  });
  useOrderPaymentSync(order, value => updates.push(value));
  for (const effect of effects) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
  const flush = () => new Promise(resolve => setImmediate(resolve));
  await flush();
  if (options.fail) { assert.equal(updates.length, 0); }
  else if (options.missing) { assert.equal(calls.some(([url]) => url.endsWith("/sync")), false); }
  else {
    assert.deepEqual(cleared[0], ["cart", 626, status]);
    assert.equal(calls[1][1], "POST");
    if (status === "SUCCEEDED") assert.equal(updates[0].paymentStatus, "PAID");
  }
  const before = calls.length;
  document.hidden = true; timer(); await flush(); assert.equal(calls.length, before);
  document.hidden = false; visible(); await flush();
  if (status === "SUCCEEDED" || status === "FAILED" || options.missing) assert.equal(calls.length, before);
  else assert.ok(calls.length > before);
  assert.equal(calls.some(([url, method]) => method === "POST" && !url.endsWith("/sync")), false, "Polling must never create an order or payment");
  cleanups.forEach(fn => fn());
  assert.equal(timer, null);
  assert.equal(visible, null);
}
async function main() {
  const redirect = value => { throw { redirect: value }; };
  const query = load("app/checkout/result/page.tsx", { "next/navigation": { redirect } }).default;
  const path = load("app/checkout/result/[orderId]/page.tsx", { "next/navigation": { redirect } }).default;
  for (const [page, props, expected] of [
    [query, { searchParams: Promise.resolve({ orderId: "626" }) }, "/account?tab=orders&orderId=626"],
    [path, { params: Promise.resolve({ orderId: "626" }) }, "/account?tab=orders&orderId=626"],
    [query, { searchParams: Promise.resolve({}) }, "/account?tab=orders"],
    [path, { params: Promise.resolve({ orderId: "bad" }) }, "/account?tab=orders"],
  ]) await assert.rejects(page(props), error => error.redirect === expected);
  await scenario("SUCCEEDED"); await scenario("FAILED"); await scenario("PENDING");
  await scenario("NOT_STARTED", { missing: true }); await scenario("PENDING", { fail: true });
  console.log("Payment return: legacy redirects, pending → paid/failed, missing attempt, polling failure, visibility pause and cleanup passed; no order/payment creation");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
