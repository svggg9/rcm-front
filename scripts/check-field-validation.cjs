/* eslint-disable @typescript-eslint/no-require-imports -- Isolated field lifecycle and visible focus regression, no API writes. */
const fs = require("node:fs"), assert = require("node:assert/strict"), ts = require("typescript");
function load(file, imports = {}) {
  const mod = { exports: {} };
  new Function("module", "exports", "require", ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(mod, mod.exports, name => imports[name]); return mod.exports;
}
let cursor = 0; const slots = [];
const react = { useCallback: fn => fn, useState(initial) {
  const index = cursor++; if (!(index in slots)) slots[index] = initial;
  return [slots[index], update => { slots[index] = typeof update === "function" ? update(slots[index]) : update; }];
} };
const { useFieldValidation } = load("app/lib/useFieldValidation.ts", { react });
let values = { email: "", password: "", confirmation: "" };
const validate = draft => ({
  ...(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email) ? { email: "Проверьте почту" } : {}),
  ...(draft.password.length < 8 ? { password: "От 8 символов" } : {}),
  ...(draft.password !== draft.confirmation ? { confirmation: "Пароли не совпадают" } : {}),
});
const render = () => { cursor = 0; return useFieldValidation(values, validate); };
let form = render(); assert.deepEqual(form.errors, {});
values.email = "a"; form = render(); assert.deepEqual(form.errors, {}, "First keystroke stays neutral");
form.touch("email"); assert.equal(render().errors.email, "Проверьте почту");
values.email = "ab"; form.changed("email"); assert.equal(render().errors.email, "Проверьте почту", "One invalid edit does not dismiss an error");
values.email = "buyer@example.test"; assert.equal(render().errors.email, undefined);
values.email = "bad"; assert.equal(render().errors.email, "Проверьте почту", "Visited field revalidates");
form = render(); assert.equal(form.validate().password, "От 8 символов");
assert.equal(render().errors.password, "От 8 символов");
values = { email: "buyer@example.test", password: "test-password", confirmation: "test-password" };
assert.deepEqual(render().errors, {});
values.password = "different-password"; assert.equal(render().errors.confirmation, "Пароли не совпадают", "Dependent field revalidates without another submit");
form = render(); form.setErrors({ email: "Этот адрес недоступен" }); assert.equal(render().errors.email, "Этот адрес недоступен");
form.changed("password"); assert.equal(render().errors.email, "Этот адрес недоступен", "Another field must not hide a server rejection");
form.changed("email"); assert.equal(render().errors.email, undefined);
form.reset(); values = { email: "", password: "", confirmation: "" }; assert.deepEqual(render().errors, {}, "Reset starts a neutral form");

let nextFrame = 0; const frames = new Map(); let reduced = false; const focused = [], scrolled = [];
global.window = { requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; },
  cancelAnimationFrame: id => frames.delete(id), matchMedia: () => ({ matches: reduced }) };
const { scrollToFirstValidationError: scroll } = load("app/lib/formValidation.ts");
function node(name, { hidden = false, disabled = false, readOnly = false, container = false, children = [] } = {}) {
  return { name, getClientRects: () => hidden ? [] : [{}], closest: () => hidden ? {} : null,
    matches: selector => selector.startsWith(":disabled") ? disabled || readOnly : !container && !disabled && !readOnly,
    querySelectorAll: () => children, scrollIntoView: options => scrolled.push({ name, options }), focus: options => focused.push({ name, options }) };
}
const root = { querySelectorAll: () => [node("hidden", { hidden: true }), node("disabled", { disabled: true }), node("readonly", { readOnly: true }), node("email")] };
scroll({ root }); scroll({ root }); assert.equal(frames.size, 1, "Boundary and form share one pending focus");
frames.values().next().value(); frames.clear();
assert.equal(focused.at(-1).name, "email"); assert.equal(scrolled.at(-1).options.behavior, "smooth");
assert.equal(focused.at(-1).options.preventScroll, true);
reduced = true;
const selectRoot = { querySelectorAll: () => [node("select", { container: true, children: [node("hidden option", { hidden: true }), node("trigger")] })] };
scroll({ root: selectRoot }); frames.values().next().value(); frames.clear();
assert.equal(focused.at(-1).name, "trigger"); assert.equal(scrolled.at(-1).options.behavior, "auto");
let committed = [];
const delayed = { querySelectorAll: () => committed };
scroll({ root: delayed }); committed = [node("committed error")]; frames.values().next().value(); frames.clear();
assert.equal(focused.at(-1).name, "committed error", "Focus uses errors after React commit");
console.log("Field validation: neutral first edit, blur/submit, invalid-to-invalid, corrected/dependent fields, server rejection/reset, visible scoped focus and frame deduplication passed");
