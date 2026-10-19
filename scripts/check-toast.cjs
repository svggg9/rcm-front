/* eslint-disable @typescript-eslint/no-require-imports -- Verify shared notification options without a browser or real actions. */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");
const calls = [];
const sonner = Object.assign(() => {}, Object.fromEntries(
  ["success", "info", "warning", "message", "error", "dismiss"].map(type => [type, (...args) => { calls.push({ type, args }); return 42; }]),
));
const testModule = { exports: {} };
const code = ts.transpileModule(fs.readFileSync("app/components/ui/toast.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function("module", "exports", "require", code)(testModule, testModule.exports, name => {
  assert.equal(name, "sonner"); return { toast: sonner };
});
const { toast, TOAST_DURATION } = testModule.exports;
for (const type of ["error", "success", "warning", "info", "message"]) {
  assert.equal(toast[type]("Сообщение"), 42);
  assert.equal(calls.at(-1).args[1].duration, 4000, `${type} must expire, including validation errors`);
}
assert.equal(TOAST_DURATION, 4000);
toast.error("Ошибка", { id: "cart-add-407", duration: 7000, onDismiss() {} });
assert.equal(calls.at(-1).args[1].id, "cart-add-407");
assert.equal(calls.at(-1).args[1].duration, 7000);
assert.equal(typeof calls.at(-1).args[1].onDismiss, "function");
toast.dismiss("cart-add-407");
assert.deepEqual(calls.at(-1), { type: "dismiss", args: ["cart-add-407"] });
console.log("Toast: errors expire, explicit options and targeted dismissal preserved");
