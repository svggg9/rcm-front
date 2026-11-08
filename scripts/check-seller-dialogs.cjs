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
const sharedDependencies = new Map();
mod.require = name => {
  if (name === "react") return { ...React, useRef: () => ({ current: dialog }),
    useId: () => "dialog-title", useEffect: callback => { effects.push(callback); } };
  if (name === "./Icon") return { Icon: props => React.createElement("svg", { "data-icon": props.name, className: props.className }) };
  if (name === "./Button") return { Button: props => {
    const buttonProps = { ...props };
    delete buttonProps.variant;
    delete buttonProps.iconOnly;
    return React.createElement("button", buttonProps);
  } };
  if (name === "./RcmToaster") return { RcmToaster: () => null };
  if (name === "./toast") return { toast: { getToasts: () => [], dismiss() {} } };
  if (name.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
  if (name === "./useModalDialog" || name === "./modalScrollLock") {
    if (sharedDependencies.has(name)) return sharedDependencies.get(name).exports;
    const dependencyFilename = path.resolve(path.dirname(filename), `${name}.ts`);
    const dependency = new Module(dependencyFilename, mod);
    dependency.filename = dependencyFilename;
    dependency.paths = Module._nodeModulePaths(path.dirname(dependencyFilename));
    dependency.require = mod.require;
    sharedDependencies.set(name, dependency);
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
assert.match(html, /<footer/);
assert.doesNotMatch(renderToStaticMarkup(mod.exports.Dialog({ ...props, actions: undefined })), /<footer/, "Read-only dialogs do not need a footer");
global.HTMLElement = class {
  isConnected = true;
  disabled = false;
  inert = false;
  matches() { return this.disabled || this.inert; }
  closest() { return this.inert ? this : null; }
  focus() { restored++; document.activeElement = this; }
};
global.document = { activeElement: new HTMLElement(), body: { style: { overflow: "auto" } }, documentElement: { style: { overflow: "visible" } } };
const cleanup = effects[0]();
assert.equal(opened, 1);
assert.equal(document.body.style.overflow, "hidden");
assert.equal(document.documentElement.style.overflow, "hidden");
cleanup();
assert.equal(closed, 1);
assert.equal(document.body.style.overflow, "auto");
assert.equal(document.documentElement.style.overflow, "visible");
assert.equal(restored, 1);
for (const reverse of [false, true]) {
  const releases = [effects[0](), effects[0]()];
  if (reverse) releases.reverse();
  releases[0](); releases[0]();
  assert.equal(document.body.style.overflow, "hidden", "A remaining nested dialog keeps the body locked");
  assert.equal(document.documentElement.style.overflow, "hidden", "A remaining nested dialog keeps the root locked");
  releases[1]();
  assert.equal(document.body.style.overflow, "auto");
  assert.equal(document.documentElement.style.overflow, "visible", "The last dialog restores the original root overflow");
}

const { useModalDialog } = mod.require("./useModalDialog");
const previousFocus = new HTMLElement();
const initialFocus = new HTMLElement();
document.activeElement = previousFocus;
effects.length = 0;
useModalDialog({ current: dialog }, { initialFocusRef: { current: initialFocus } });
const closeFocused = effects[0]();
assert.equal(document.activeElement, initialFocus, "Viewer can retain its explicit initial close-button focus");
closeFocused();
assert.equal(document.activeElement, previousFocus, "Closing returns focus to the original trigger");

for (const inaccessible of ["disabled", "inert", "isConnected"]) {
  const trigger = new HTMLElement();
  trigger[inaccessible] = inaccessible !== "isConnected";
  const fallback = new HTMLElement();
  document.activeElement = trigger;
  effects.length = 0;
  useModalDialog({ current: dialog }, { fallbackFocusRef: { current: fallback } });
  const closeWithFallback = effects[0]();
  closeWithFallback();
  assert.equal(document.activeElement, fallback, `A ${inaccessible} trigger cannot receive restored focus`);
}

const disabledTrigger = new HTMLElement();
disabledTrigger.disabled = true;
const originalFallback = new HTMLElement();
const replacementFallback = new HTMLElement();
const changingFallbackRef = { current: originalFallback };
document.activeElement = disabledTrigger;
effects.length = 0;
useModalDialog({ current: dialog }, { fallbackFocusRef: changingFallbackRef });
const closeWithCapturedFallback = effects[0]();
changingFallbackRef.current = replacementFallback;
closeWithCapturedFallback();
assert.equal(document.activeElement, originalFallback, "A changed ref does not redirect focus away from the original dialog context");

document.activeElement = disabledTrigger;
effects.length = 0;
useModalDialog({ current: dialog }, { fallbackFocusRef: { current: originalFallback } });
const closeWithRemovedFallback = effects[0]();
originalFallback.isConnected = false;
const restoredBeforeRemovedFallback = restored;
closeWithRemovedFallback();
assert.equal(restored, restoredBeforeRemovedFallback, "A removed fallback never receives focus during cleanup");

effects.length = 0;
const openedBeforeInactive = opened;
useModalDialog({ current: dialog }, { enabled: false });
assert.equal(effects[0](), undefined);
assert.equal(opened, openedBeforeInactive, "Page and closed-viewer modes never open or lock a dialog");
assert.equal(document.body.style.overflow, "auto");

const backdropTarget = { getBoundingClientRect: () => ({ left: 10, top: 10, right: 110, bottom: 110 }) };
const backdropEvent = (x, y) => ({ target: backdropTarget, currentTarget: backdropTarget, clientX: x, clientY: y });
const backdrop = mod.exports.Dialog({ ...props, closeOnBackdrop: true });
const dismissalsBeforeBackdrop = dismissals;
backdrop.props.onMouseDown(backdropEvent(20, 20));
assert.equal(dismissals, dismissalsBeforeBackdrop, "Dialog padding does not behave as backdrop");
backdrop.props.onMouseDown(backdropEvent(0, 0));
assert.equal(dismissals, dismissalsBeforeBackdrop + 1);
const pendingBackdrop = mod.exports.Dialog({ ...props, closeOnBackdrop: true, busy: true });
pendingBackdrop.props.onMouseDown(backdropEvent(0, 0));
assert.equal(dismissals, dismissalsBeforeBackdrop + 1, "Busy publication cannot dismiss through backdrop");
const editor = fs.readFileSync(path.resolve(__dirname, "../app/seller/products/[id]/edit/ProductEditPageClient.tsx"), "utf8");
assert.doesNotMatch(editor, /window\.confirm/);
assert.match(editor, /if \(confirmationPending\.current\) return/);
console.log("Seller dialogs: semantics, busy Escape, focus/scroll restoration and confirmation guards passed");

function dropdownChecks() {
  const original = { document: global.document, window: global.window, HTMLInputElement: global.HTMLInputElement };
  const frames = new Map();
  const listeners = new Map();
  let frameId = 0;
  global.window = {
    requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  global.document = {
    activeElement: null,
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
  };
  class DropdownElement {
    constructor(name, disabled = false, selected = false) { Object.assign(this, { name, disabled, selected }); }
    matches(selector) { return selector === ":disabled" && this.disabled; }
    getAttribute(name) { return name === "aria-selected" ? String(this.selected) : null; }
    closest() { return null; }
    focus() { document.activeElement = this; }
    scrollIntoView() { this.scrolled = true; }
  }
  global.HTMLInputElement = class extends DropdownElement {};

  function mounted(initial = {}) {
    const slots = [];
    const pending = new Map();
    let cursor = 0, dirty = false, props = initial, api;
    const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
    const hooks = {
      useState(initialValue) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initialValue === "function" ? initialValue() : initialValue;
        return [slots[index], next => {
          const value = typeof next === "function" ? next(slots[index]) : next;
          if (!Object.is(value, slots[index])) { slots[index] = value; dirty = true; }
        }];
      },
      useRef(initialValue) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initialValue }; return slots[index]; },
      useCallback(callback, deps) {
        const index = cursor++;
        if (!same(slots[index]?.deps, deps)) slots[index] = { callback, deps };
        return slots[index].callback;
      },
      useEffect(callback, deps) {
        const index = cursor++;
        if (!same(slots[index]?.deps, deps)) pending.set(index, { callback, deps });
      },
      useLayoutEffect() { cursor++; }, // Position is verified in the real browser, not this lifecycle harness.
    };
    const testModule = { exports: {} };
    const hookCode = ts.transpileModule(fs.readFileSync("app/components/ui/useDropdown.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    new Function("module", "exports", "require", hookCode)(testModule, testModule.exports, name => {
      assert.equal(name, "react"); return hooks;
    });
    const trigger = new DropdownElement("trigger");
    const options = [new DropdownElement("first"), new DropdownElement("disabled", true),
      new DropdownElement("selected", false, true), new DropdownElement("last")];
    const root = { contains: target => target === trigger || options.includes(target) };
    const menu = { querySelectorAll: selector => selector.includes(":not(:disabled)") ? options.filter(option => !option.disabled) : options };
    function render(nextProps) {
      if (nextProps) props = { ...props, ...nextProps };
      for (let attempts = 0; attempts < 10; attempts++) {
        dirty = false; cursor = 0;
        api = testModule.exports.useDropdown(props);
        api.rootRef.current = root; api.controlRef.current = trigger; api.menuRef.current = menu;
        trigger.disabled = Boolean(props.disabled);
        trigger.getAttribute = name => name === "aria-expanded" ? String(api.open) : null;
        if (dirty) continue;
        for (const [index, effect] of pending) {
          slots[index]?.cleanup?.();
          slots[index] = { deps: effect.deps, cleanup: effect.callback() };
        }
        pending.clear();
        if (!dirty) return api;
      }
      throw new Error("Dropdown hook did not settle");
    }
    function press(key, target = trigger) {
      const event = { key, target, prevented: false, stopped: false,
        preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
      api.handleKeyDown(event); render();
      for (const [id, callback] of [...frames]) { frames.delete(id); callback(); }
      return event;
    }
    function dispose() { for (const slot of slots) slot?.cleanup?.(); }
    render();
    return { render, press, trigger, options, root, current: () => api, dispose };
  }

  try {
    let closeCalls = 0;
    const dropdown = mounted({ onClose: () => { closeCalls++; } });
    assert.equal(dropdown.current().open, false);
    assert.equal(dropdown.press("ArrowDown").prevented, true);
    assert.equal(dropdown.current().open, true);
    assert.equal(document.activeElement, dropdown.options[2], "Opening focuses the selected enabled option");
    dropdown.press("Home", dropdown.options[2]);
    assert.equal(document.activeElement, dropdown.options[0]);
    dropdown.press("ArrowDown", dropdown.options[0]);
    assert.equal(document.activeElement, dropdown.options[2], "Arrow navigation skips a disabled option");
    dropdown.press("End", dropdown.options[2]);
    assert.equal(document.activeElement, dropdown.options[3]);
    dropdown.press("ArrowUp", dropdown.options[3]);
    assert.equal(document.activeElement, dropdown.options[2]);
    const escape = dropdown.press("Escape", dropdown.options[2]);
    assert.equal(escape.prevented, true); assert.equal(escape.stopped, true);
    assert.equal(dropdown.current().open, false);
    assert.equal(document.activeElement, dropdown.trigger, "Escape returns focus before an enclosing dialog handles it");
    assert.equal(closeCalls, 1);
    dropdown.press("ArrowUp");
    const tab = dropdown.press("Tab", dropdown.options[2]);
    assert.equal(dropdown.current().open, false);
    assert.equal(document.activeElement, dropdown.trigger, "Tab starts its native next/previous move from the single control tab stop");
    assert.equal(tab.prevented, false, "The browser must perform the actual Tab navigation");
    dropdown.press("ArrowDown");
    dropdown.current().handleBlur({ currentTarget: dropdown.root, relatedTarget: dropdown.options[0] });
    dropdown.render(); assert.equal(dropdown.current().open, true, "Focus inside the list keeps it open");
    dropdown.current().handleBlur({ currentTarget: dropdown.root, relatedTarget: {} });
    dropdown.render(); assert.equal(dropdown.current().open, false, "Leaving the whole control closes the list");
    dropdown.press("ArrowDown");
    dropdown.render({ disabled: true });
    assert.equal(dropdown.current().open, false, "Locking an open field hides its list in the same render");
    dropdown.render({ disabled: false });
    assert.equal(dropdown.current().open, false, "Unlocking does not reopen a stale list");
    dropdown.dispose();

    for (const inactive of [{ disabled: true }, { readOnly: true }]) {
      const locked = mounted(inactive);
      locked.press("ArrowDown"); assert.equal(locked.current().open, false);
      locked.current().setOpen(true); locked.render();
      assert.equal(locked.current().open, false, "Pointer/open requests also respect readonly and disabled");
      locked.render({ disabled: false, readOnly: false });
      locked.press("ArrowDown"); assert.equal(locked.current().open, true);
      locked.render(inactive); assert.equal(locked.current().open, false, "Readonly and disabled both close an already open list");
      locked.dispose();
    }
    assert.equal(listeners.get("pointerdown")?.size ?? 0, 0, "Unmounted controls release their outside-pointer listener");
    assert.equal(frames.size, 0);
    console.log("Dropdowns: arrows, selected focus, disabled skip, Home/End, isolated Escape, Tab, outside blur and lock lifecycle passed");
  } finally {
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) delete global[name]; else global[name] = value;
    }
  }
}
dropdownChecks();

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
  for (const [props, expected] of [
    [{ variant: "danger" }, "danger"],
    [{ variant: "ghost", confirmVariant: "danger" }, "danger"],
    [{ variant: "secondary", confirmLabel: "Сверить" }, "primary"],
  ]) {
    const themed = confirmationHarness({ children: "Открыть", confirmTitle: "Подтвердить?", confirmText: "Пример", onConfirm() {}, ...props });
    const trigger = nodes(themed(), "button")[0];
    assert.equal(trigger.props.confirmVariant, undefined, "Confirmation tone is not forwarded to the trigger DOM");
    trigger.props.onClick();
    assert.equal(nodes(nodes(themed(), "dialog")[0].props.actions, "button")[1].props.variant, expected,
      "Destructive confirmations retain their tone without changing ordinary confirmations");
  }
  const failed = confirmationHarness({ children: "Открыть", confirmTitle: "Удалить?", confirmText: "Пример", onConfirm() { throw new Error("private SQL detail"); } });
  nodes(failed(), "button")[0].props.onClick();
  nodes(nodes(failed(), "dialog")[0].props.actions, "button")[1].props.onClick();
  await new Promise(setImmediate);
  const failure = nodes(nodes(failed(), "dialog")[0], "error-message")[0];
  assert(failure); assert(!failure.props.message.includes("private"));
  console.log("Confirmations: cancel, single-action cart, destructive tone, duplicate guard, busy state and safe failure passed");
}
confirmations().catch(error => { console.error(error); process.exitCode = 1; });
