/* eslint-disable @typescript-eslint/no-require-imports -- Profile/draft regression with disposable browser storage. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file) {
  const testModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("module", "exports", code)(testModule, testModule.exports);
  return testModule.exports;
}
const { buildCheckoutPrefill } = load("app/checkout/lib/checkoutPrefill.ts");
const old = { email: "old@example.test", fullName: "Старый Получатель", phone: "+79990000001",
  selectedCity: { code: 44, fullName: "Москва", countryCode: "RU" } };
const profile = { email: "new@example.test", firstName: " Андрей ", lastName: " Новый ",
  displayName: "Устаревшее имя", phone: "+79990000002" };
const current = buildCheckoutPrefill({ me: profile, existing: old });
assert.equal(current.fullName, "Андрей Новый");
assert.equal(current.phone, profile.phone);
assert.equal(current.email, profile.email);
assert.deepEqual(current.selectedCity, old.selectedCity, "Delivery choices are independent of recipient contacts");
const empty = buildCheckoutPrefill({ me: { ...profile, firstName: null, lastName: null, email: null, phone: null }, existing: old });
assert.equal(empty.fullName, ""); assert.equal(empty.phone, ""); assert.equal(empty.email, "");
assert.equal(buildCheckoutPrefill({ me: { displayName: "Прежний контракт", phone: null } }).fullName, "Прежний контракт");
const data = new Map();
global.window = {};
global.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
data.set("user_cart_id", "user_fixture");
data.set("checkout_draft_v1:user_fixture", JSON.stringify({ ...old, selectedAddressId: "44-1",
  selectedCityCode: 44, selectedCityName: "Москва", paymentMethod: "CARD" }));
const drafts = load("app/checkout/lib/checkoutDraft.ts");
const draft = drafts.loadCheckoutDraft();
for (const field of ["email", "fullName", "phone"]) assert(!Object.hasOwn(draft, field), `Legacy ${field} must not be restored`);
assert.equal(draft.selectedAddressId, "44-1"); assert.equal(draft.selectedCityCode, 44);
drafts.saveCheckoutDraft(draft);
const saved = JSON.parse(data.get("checkout_draft_v1:user_fixture"));
for (const field of ["email", "fullName", "phone"]) assert(!Object.hasOwn(saved, field));
console.log("Checkout prefill: current profile, cleared contacts, name parts, legacy draft migration and delivery choices passed");
