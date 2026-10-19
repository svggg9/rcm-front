/* eslint-disable @typescript-eslint/no-require-imports -- Isolated input events and source coverage; no API writes. */
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), ts = require("typescript");
const jsx = require("react/jsx-runtime");
function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const testModule = { exports: {} };
  new Function("module", "exports", "require", code)(testModule, testModule.exports, name => {
    if (!(name in imports)) throw Error("Unexpected import: " + name); return imports[name];
  }); return testModule.exports;
}
const whitespace = load("app/lib/inputWhitespace.ts", {});
const { InputControl } = load("app/components/ui/InputControl.tsx", { "react/jsx-runtime": jsx, "../../lib/inputWhitespace": whitespace });
assert.equal(whitespace.stripInputWhitespace(" \t12\u00a034\u202f5\u200b6\r\n"), "123456");
for (const type of ["email", "tel", "number", "url"]) assert.equal(whitespace.resolveInputSpacePolicy({ type }), "remove");
for (const inputMode of ["numeric", "decimal", "email", "tel", "url"]) assert.equal(whitespace.resolveInputSpacePolicy({ inputMode }), "remove");
for (const props of [{ type: "text" }, { type: "search" }, { type: "password" }, { type: "text", autoComplete: "current-password" },
  { type: "text", autoComplete: "new-password" }, { type: "date" }, { type: "number", spacePolicy: "allow" }]) {
  assert.equal(whitespace.resolveInputSpacePolicy(props), "allow");
}
class Input {
  constructor(value = "", maxLength = -1) { this.text = value; this.selectionStart = this.selectionEnd = value.length; this.maxLength = maxLength; }
  get value() { return this.text; }
  set value(value) { this.text = value; this.selectionStart = this.selectionEnd = value.length; }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  dispatchEvent(event) { this.onInput?.({ target: this, currentTarget: this, nativeEvent: event }); }
}
global.HTMLInputElement = Input;
function event(input, extra = {}) { return { target: input, currentTarget: input, nativeEvent: {}, defaultPrevented: false,
  preventDefault() { this.defaultPrevented = true; }, ...extra }; }
let observed;
const control = InputControl({ inputMode: "decimal", onChange: e => { observed = e.target.value; } });
const input = new Input("12 34"); input.setSelectionRange(3, 5);
control.props.onChange(event(input));
assert.equal(observed, "1234"); assert.equal(input.value, "1234"); assert.deepEqual([input.selectionStart, input.selectionEnd], [2, 4]);
for (const key of [" ", "\u00a0"]) { const e = event(input, { key }); control.props.onKeyDown(e); assert(e.defaultPrevented); }
for (const key of ["Tab", "Enter", "ArrowLeft", "Backspace"]) { const e = event(input, { key }); control.props.onKeyDown(e); assert(!e.defaultPrevented); }
const shortcut = event(input, { key: " ", ctrlKey: true }); control.props.onKeyDown(shortcut); assert(!shortcut.defaultPrevented);
const before = event(input, { nativeEvent: { data: "\u202f" } }); control.props.onBeforeInput(before); assert(before.defaultPrevented);
const composing = event(input, { key: " ", nativeEvent: { isComposing: true } }); control.props.onKeyDown(composing); assert(!composing.defaultPrevented);
input.value = "12 3"; input.onInput = control.props.onChange;
control.props.onChange(event(input, { nativeEvent: { isComposing: true } })); assert.equal(input.value, "12 3");
control.props.onCompositionEnd(event(input)); assert.equal(observed, "123");
input.value = "1234"; input.maxLength = 6; input.setSelectionRange(1, 3);
const paste = event(input, { clipboardData: { getData: () => " 5\u00a06\n" } });
control.props.onPaste(paste); assert(paste.defaultPrevented); assert.equal(observed, "1564"); assert.equal(input.selectionStart, 3);
const emptyPaste = event(input, { clipboardData: { getData: () => " \n\t" } });
control.props.onPaste(emptyPaste); assert.equal(input.value, "1564", "Whitespace-only paste must not delete the selected value");
input.value = "12"; input.maxLength = 6;
control.props.onPaste(event(input, { clipboardData: { getData: () => " 3456789 " } }));
assert.equal(observed, "123456", "Cleaned paste respects maxLength");
for (const props of [{ readOnly: true }, { disabled: true }]) {
  const passive = InputControl({ type: "email", ...props });
  const e = event(input, { key: " " }); passive.props.onKeyDown(e); assert(!e.defaultPrevented);
}
const native = new Input("x"); native.selectionStart = native.selectionEnd = null;
let inserted;
native.ownerDocument = { execCommand: (command, ui, text) => { inserted = { command, ui, text }; return true; } };
const email = InputControl({ type: "email" });
email.props.onPaste(event(native, { clipboardData: { getData: () => " a @b.test " } }));
assert.deepEqual(inserted, { command: "insertText", ui: false, text: "a@b.test" });
for (const props of [{ type: "text" }, { type: "password" }, { type: "text", autoComplete: "current-password" }, { type: "search" }]) {
  const free = InputControl({ ...props, onChange: e => { observed = e.target.value; } });
  input.value = "Два слова"; free.props.onChange(event(input)); assert.equal(observed, "Два слова");
  const e = event(input, { key: " " }); free.props.onKeyDown(e); assert(!e.defaultPrevented);
}
const { PhoneInput } = load("app/components/ui/PhoneInput.tsx", {
  react: { useId: () => "phone", useCallback: fn => fn, useRef: value => ({ current: value }), useLayoutEffect() {} },
  "react/jsx-runtime": jsx, "./Field": { Field: "Field" }, "./InputControl": { InputControl },
  "../../lib/phone": load("app/lib/phone.ts", {}),
});
global.window = { requestAnimationFrame() {} };
function find(node, predicate) { if (!node || typeof node !== "object") return null; if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const match = find(child, predicate); if (match) return match; } return null; }
let phoneValue = "";
let phone = find(PhoneInput({ value: "", onChange: e => { phoneValue = e.target.value; } }), node => node.type === InputControl);
const phoneControl = InputControl(phone.props), phoneElement = new Input(); phoneElement.onInput = phoneControl.props.onChange;
phoneControl.props.onPaste(event(phoneElement, { clipboardData: { getData: () => " +7 (999) 123 45-67 " } }));
assert.equal(phoneValue, "+79991234567");
phone = find(PhoneInput({ value: phoneValue, onChange() {} }), node => node.type === InputControl);
assert.equal(phone.props.value, "(999) 123 45-67", "Automatic phone-mask spaces remain visible");

// Prevent future native fields from bypassing the shared rule.
const missed = []; let nativeFields = 0;
function audit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) { audit(filePath); continue; }
    if (!filePath.endsWith(".tsx")) continue;
    const source = ts.createSourceFile(filePath, fs.readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(source) === "input") {
        nativeFields++;
        const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
        const get = name => attrs.find(attr => attr.name.getText(source) === name)?.initializer?.getText(source)?.replaceAll('"', "");
        if (["email", "tel", "url", "number"].includes(get("type")) || ["numeric", "decimal", "email", "tel", "url"].includes(get("inputMode"))) {
          missed.push(filePath + ":" + (source.getLineAndCharacterOfPosition(node.pos).line + 1));
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
audit("app"); assert.deepEqual(missed, [], "Restricted native inputs must use InputControl");
console.log(`Input whitespace: keyboard/beforeinput/paste/autofill/IME/caret, phone mask, free text/passwords and native-input coverage (${nativeFields} inputs audited) passed`);
