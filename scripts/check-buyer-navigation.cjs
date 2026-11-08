/* eslint-disable @typescript-eslint/no-require-imports -- Isolated navigation regression; no browser server or application data. */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");

function load(file, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const testModule = { exports: {} };
  new Function("module", "exports", "require", code)(testModule, testModule.exports, name => {
    if (!(name in imports)) throw Error("Unexpected import " + name);
    return imports[name];
  });
  return testModule.exports;
}

const navigation = load("app/lib/buyerPanelReturn.ts", {
  "./safeReturnPath": load("app/lib/safeReturnPath.ts"),
});
const { BUYER_PANEL_RETURN_KEY: key, createBuyerPanelEntry: create, readBuyerPanelEntry: read } = navigation;
const origin = { href: "/catalog?category=4&q=shirt#products", x: 0, y: 740 };
const source = { target: origin, entry: null };
const cart = create("/cart", source, false);
assert.deepEqual(cart.back, origin);
assert.deepEqual(cart.close, origin, "Close preserves original query/hash and scroll position");

for (const history of [false, true]) {
  const direct = create("/cart?orderId=42&externalPaymentId=bank", history ? source : null, history);
  assert.equal(direct.back.href, "/catalog");
  assert.equal(direct.close.href, "/catalog", "Direct/bank return never assumes the previous browser entry is an app page");
}

const checkout = create("/cart?checkout=1", { target: { href: "/cart", x: 0, y: 180 }, entry: cart }, false);
assert.deepEqual(checkout.back, origin);
assert.deepEqual(checkout.close, origin, "Same-panel checkout query keeps its original source");
const favorites = create("/favorites", { target: { href: checkout.href, x: 0, y: 320 }, entry: checkout }, false);
assert.deepEqual(favorites.back, { href: checkout.href, x: 0, y: 320 });
assert.deepEqual(favorites.close, origin, "Nested panel Back goes one panel back; Close exits the whole panel sequence");

const nextState = { __NA: true, tree: { segment: "keep" }, [key]: favorites };
const before = structuredClone(nextState);
assert.deepEqual(read(nextState, "/favorites"), favorites, "Target entry metadata is sufficient after refresh/popstate");
assert.deepEqual(nextState, before, "Reading does not mutate Next history fields");
assert.equal(read(nextState, "/cart"), null, "Copied metadata cannot describe a different URL");
assert.equal(read({ [key]: { ...cart, version: 99 } }, "/cart"), null);
assert.equal(read({ [key]: { ...cart, close: { ...origin, href: "/favorites" } } }, "/cart"), null);
assert.equal(read({ [key]: { ...cart, back: { ...origin, href: "/cart" } } }, "/cart"), null);
for (const unsafe of ["", "https://bank.example/", "//bank.example", "javascript:alert(1)", "/%2fbank.example", "/\\bank.example"]) {
  assert.equal(read({ [key]: { ...cart, close: { ...origin, href: unsafe } } }, "/cart"), null);
  assert.equal(create("/cart", { target: { ...origin, href: unsafe }, entry: null }, false).close.href, "/catalog");
}
for (const y of [NaN, Infinity, -1]) {
  assert.equal(read({ [key]: { ...cart, back: { ...origin, y } } }, "/cart"), null);
}
assert.equal(navigation.isBuyerPanelPath("/cart?checkout=1#recipient"), true);
assert.equal(navigation.isBuyerPanelPath("/favorites"), true);
assert.equal(navigation.isBuyerPanelPath("/product/42"), false);

navigation.requestBuyerPanelScroll(origin);
assert.deepEqual(navigation.consumeBuyerPanelScroll(origin.href), origin);
assert.equal(navigation.consumeBuyerPanelScroll(origin.href), null, "Scroll target is consumed once");
navigation.requestBuyerPanelScroll(origin);
assert.equal(navigation.consumeBuyerPanelScroll("/catalog"), null, "Another route cannot receive the source's scroll");
assert.equal(navigation.consumeBuyerPanelScroll(origin.href), null, "Cancelled navigation cannot leave a stale pending target");

// Async content may be shorter than the saved position at the first route commit.
let nextFrame = 0;
const frames = new Map();
const listeners = new Map();
const scrolls = [];
let resize;
let disconnected = 0;
global.requestAnimationFrame = fn => { frames.set(++nextFrame, fn); return nextFrame; };
global.cancelAnimationFrame = id => frames.delete(id);
global.ResizeObserver = class {
  constructor(fn) { resize = fn; }
  observe() {}
  disconnect() { disconnected++; }
};
global.document = { documentElement: { scrollHeight: 300, scrollWidth: 390 }, body: {} };
global.window = {
  innerHeight: 200, innerWidth: 390,
  scrollTo: value => scrolls.push(value),
  setTimeout: () => 1, clearTimeout() {},
  addEventListener: (name, fn) => listeners.set(name, fn),
  removeEventListener: name => listeners.delete(name),
};
function frame() {
  const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn());
}
const cleanup = navigation.restoreBuyerPanelScroll({ x: 0, y: 740 });
frame();
assert.equal(scrolls.at(-1).top, 740);
assert.equal(disconnected, 0, "Restoration waits while content is too short");
document.documentElement.scrollHeight = 1200;
resize(); frame();
assert.equal(disconnected, 1, "Restoration stops after the saved position fits");
assert.equal(listeners.size, 0);
cleanup();
assert.equal(disconnected, 1, "Cleanup is idempotent");

document.documentElement.scrollHeight = 300;
navigation.restoreBuyerPanelScroll({ x: 0, y: 740 });
listeners.get("wheel")();
const previousCount = scrolls.length;
resize(); frame();
assert.equal(scrolls.length, previousCount, "User interaction cancels delayed scroll restoration");
assert.equal(listeners.size, 0);

console.log("Buyer navigation: safe direct/refresh/pop targets, nested Back/Close, checkout query/hash, one-shot scroll and user interruption passed");
