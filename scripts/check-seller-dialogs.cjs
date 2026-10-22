/* eslint-disable @typescript-eslint/no-require-imports -- Isolated UI checks, no API writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const filename = path.resolve(__dirname, "../app/components/ui/Dialog.tsx");
const effects = [];
let opened = 0;
let closed = 0;
let restored = 0;
const dialog = { showModal() { opened++; }, close() { closed++; } };
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod.require = name => {
  if (name === "react") return { ...React, useRef: () => ({ current: dialog }),
    useId: () => "dialog-title", useEffect: callback => { effects.push(callback); } };
  if (name === "./Icon") return { Icon: props => React.createElement("svg", { "data-icon": props.name, className: props.className }) };
  if (name === "./RcmToaster") return { RcmToaster: () => null };
  if (name === "./toast") return { toast: { getToasts: () => [], dismiss() {} } };
  if (name.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
  if (name === "./modalScrollLock") {
    const dependencyFilename = path.resolve(path.dirname(filename), `${name}.ts`);
    const dependency = new Module(dependencyFilename, mod);
    dependency.filename = dependencyFilename;
    dependency.paths = Module._nodeModulePaths(path.dirname(dependencyFilename));
    dependency._compile(ts.transpileModule(fs.readFileSync(dependencyFilename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText, dependencyFilename);
    return dependency.exports;
  }
  return Module.prototype.require.call(mod, name);
};
mod._compile(compiled, filename);
let dismissals = 0;
let prevented = 0;
let stopped = 0;
const cancelEvent = { preventDefault() { prevented++; }, stopPropagation() { stopped++; } };
const props = { title: "Реквизиты сохранены", success: true, children: "Можно добавить товар",
  actions: React.createElement("button", null, "Позже"), onClose() { dismissals++; } };
const tree = mod.exports.Dialog(props);
const html = renderToStaticMarkup(tree);
assert.match(html, /<dialog[^>]+aria-labelledby="dialog-title"/);
assert.match(html, /id="dialog-title"/);
assert.match(html, /data-icon="check-circle" class="success"/);
tree.props.onCancel(cancelEvent);
assert.equal(dismissals, 1);
const busy = mod.exports.Dialog({ ...props, busy: true });
busy.props.onCancel(cancelEvent);
assert.equal(dismissals, 1, "Escape must not dismiss a pending operation");
assert.equal(prevented, 2);
assert.equal(stopped, 2, "Escape must not propagate to an enclosing editor");
assert.match(renderToStaticMarkup(busy), /aria-label="Закрыть" disabled=""/);
assert.doesNotMatch(html, /class="[^"]*confirmation/);
assert.match(renderToStaticMarkup(mod.exports.Dialog({ ...props, variant: "confirmation" })), /class="[^"]*confirmation/);
global.HTMLElement = class { isConnected = true; focus() { restored++; } };
global.document = { activeElement: new HTMLElement(), body: { style: { overflow: "auto" } } };
const cleanup = effects[0]();
assert.equal(opened, 1);
assert.equal(document.body.style.overflow, "hidden");
cleanup();
assert.equal(closed, 1);
assert.equal(document.body.style.overflow, "auto");
assert.equal(restored, 1);
const editor = fs.readFileSync(path.resolve(__dirname, "../app/seller/products/[id]/edit/ProductEditPageClient.tsx"), "utf8");
assert.doesNotMatch(editor, /window\.confirm/);
assert.match(editor, /if \(confirmationPending\.current\) return/);
console.log("Seller dialogs: semantics, busy Escape, focus/scroll restoration and confirmation guards passed");

function confirmationHarness(props) {
  let cursor = 0;
  const values = [];
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in values)) values[index] = initial;
      return [values[index], next => { values[index] = next; }]; },
    useRef(initial) { const index = cursor++; if (!(index in values)) values[index] = { current: initial }; return values[index]; },
  };
  const errorsModule = { exports: {} };
  const errorCode = ts.transpileModule(fs.readFileSync("app/lib/apiErrors.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("module", "exports", errorCode)(errorsModule, errorsModule.exports);
  const imports = { react: hooks, "react-dom": { createPortal: element => element }, "react/jsx-runtime": require("react/jsx-runtime"),
    "./Button": { Button: "button" }, "./Dialog": { Dialog: "dialog" }, "./RequestError": { RequestError: "error-message" },
    "../../lib/apiErrors": errorsModule.exports };
  const testModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync("app/components/ui/ConfirmActionButton.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("module", "exports", "require", code)(testModule, testModule.exports, name => imports[name]);
  return () => { cursor = 0; return testModule.exports.ConfirmActionButton(props); };
}
function nodes(node, type) {
  if (!node || typeof node !== "object") return [];
  return [...(node.type === type ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap(child => nodes(child, type))];
}
async function confirmations() {
  let calls = 0, finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const render = confirmationHarness({ children: "Открыть", confirmTitle: "Удалить?", confirmText: "Данные будут удалены", onConfirm() { calls++; return pending; } });
  nodes(render(), "button")[0].props.onClick();
  let modal = nodes(render(), "dialog")[0];
  assert.equal(calls, 0, "Opening confirmation never performs the action");
  assert.equal(modal.props.variant, "confirmation");
  nodes(modal.props.actions, "button")[0].props.onClick();
  assert.equal(nodes(render(), "dialog").length, 0, "Cancel closes without a mutation");
  nodes(render(), "button")[0].props.onClick();
  modal = nodes(render(), "dialog")[0];
  const confirm = nodes(modal.props.actions, "button")[1];
  confirm.props.onClick(); confirm.props.onClick();
  assert.equal(calls, 1, "Double confirmation sends one action");
  assert.equal(nodes(render(), "dialog")[0].props.busy, true);
  finish(); await new Promise(setImmediate);
  assert.equal(nodes(render(), "dialog").length, 0);
  const single = confirmationHarness({ children: "Открыть", confirmTitle: "Очистить?", confirmText: "Пример", showCancel: false, onConfirm() {} });
  nodes(single(), "button")[0].props.onClick();
  assert.equal(nodes(nodes(single(), "dialog")[0].props.actions, "button").length, 1, "Cart opts into one primary action; other confirmations retain Cancel");
  const failed = confirmationHarness({ children: "Открыть", confirmTitle: "Удалить?", confirmText: "Пример", onConfirm() { throw new Error("private SQL detail"); } });
  nodes(failed(), "button")[0].props.onClick();
  nodes(nodes(failed(), "dialog")[0].props.actions, "button")[1].props.onClick();
  await new Promise(setImmediate);
  const failure = nodes(nodes(failed(), "dialog")[0], "error-message")[0];
  assert(failure); assert(!failure.props.message.includes("private"));
  console.log("Confirmations: cancel, single-action cart, duplicate guard, busy state and safe failure passed");
}
confirmations().catch(error => { console.error(error); process.exitCode = 1; });
