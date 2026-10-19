/* eslint-disable @typescript-eslint/no-require-imports -- Exercises real history handlers with a queued browser-history stub. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = fs.readFileSync(path.resolve(__dirname, "../app/components/ui/EditorSurface.tsx"), "utf8");
const ast = ts.createSourceFile("EditorSurface.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let leaveSource;
let listenersSource;
let guardSource;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "leave") {
    leaveSource = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0].getText(ast) : node.initializer.getText(ast);
  }
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect") {
    const callback = node.arguments[0]?.getText(ast);
    if (callback?.includes("window.addEventListener('rcm-editor-completion'")) listenersSource = callback;
    if (callback?.includes("window.history.pushState(")) guardSource = callback;
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(leaveSource && listenersSource && guardSource, "Test the actual EditorSurface handlers");
function compile(callback, context) {
  const code = ts.transpileModule(`const callback = ${callback};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(...Object.keys(context), `${code}\nreturn callback;`)(...Object.values(context));
}

function setup({ dirty = true, busy = true, intercepted = true } = {}) {
  const editorUrl = "/seller/products/4/edit";
  const entries = [{ url: intercepted ? "/seller/products" : "/catalog", state: {} }, { url: editorUrl, state: {} }];
  let index = 1;
  const listeners = new Map();
  const queue = [];
  const navigation = [];
  let confirmations = 0;
  let replacements = 0;
  const history = {
    get state() { return entries[index].state; },
    pushState(state, _, url) { entries.splice(index + 1); entries.push({ state, url }); index++; },
    back() { queue.push(() => move(-1)); },
    forward() { queue.push(() => move(1)); },
  };
  function move(delta) {
    assert.ok(entries[index + delta], "History target exists");
    index += delta;
    const event = { state: entries[index].state, stopped: false, stopImmediatePropagation() { this.stopped = true; } };
    listeners.get("popstate")(event);
    if (!event.stopped) navigation.push(entries[index].url);
  }
  const context = {
    window: { history, addEventListener: (type, callback) => listeners.set(type, callback), removeEventListener() {} },
    document: { addEventListener() {}, removeEventListener() {} },
    location: { get href() { return entries[index].url; } },
    guardNavigation: true, titleId: "editor",
    current: { current: { dirty, busy } }, historyGuard: { current: false }, afterPop: { current: null },
    restoringGuard: { current: false }, completing: { current: false }, queuedCompletion: { current: null },
    leaveAction: { current: null }, setConfirmClose: () => { confirmations++; },
  };
  context.leave = compile(leaveSource, context);
  compile(listenersSource, context)();
  function render(next = {}) {
    if ("dirty" in next) dirty = next.dirty;
    if ("busy" in next) busy = next.busy;
    context.current.current = { dirty, busy };
    compile(guardSource, { ...context, dirty, busy })();
  }
  render();
  function dispatch(type, detail) {
    const event = { detail, prevented: false, preventDefault() { this.prevented = true; } };
    listeners.get(type)(event);
    return event;
  }
  return {
    context, history, navigation, render,
    flushOne() { assert.ok(queue.length); queue.shift()(); },
    flush() { while (queue.length) queue.shift()(); },
    complete() {
      return dispatch("rcm-editor-completion", () => {
        entries[index] = { url: "/seller/products", state: {} };
        replacements++;
      });
    },
    navigate(action) { return dispatch("rcm-editor-navigation", action); },
    url: () => entries[index].url, confirmations: () => confirmations, replacements: () => replacements,
    entries: () => [...entries],
  };
}

for (const intercepted of [true, false]) {
  const normal = setup({ intercepted });
  assert.equal(normal.complete().prevented, true);
  // React may commit setDirty(false) while delete remains busy, before popstate.
  normal.render({ dirty: false });
  assert.equal(normal.entries().length, 3, "Completion cannot add another dirty/busy guard");
  normal.flush();
  assert.equal(normal.url(), "/seller/products");
  assert.equal(normal.replacements(), 1);
  assert.equal(normal.confirmations(), 0, "Successful deletion does not request a second dirty confirmation");
  normal.history.back(); normal.flush();
  assert.equal(normal.url(), intercepted ? "/seller/products" : "/catalog");
  assert.ok(normal.navigation.every(url => !url.endsWith("/edit")), "Back cannot return to the deleted editor");

  const raced = setup({ intercepted });
  raced.history.back(); raced.flushOne();
  assert.equal(raced.context.restoringGuard.current, true);
  raced.complete(); raced.render({ dirty: false });
  assert.equal(raced.replacements(), 0, "Wait until a queued busy-Back bounce returns to the marker");
  raced.flush();
  assert.equal(raced.url(), "/seller/products");
  assert.equal(raced.replacements(), 1);
  assert.equal(raced.confirmations(), 0);
  assert.ok(raced.navigation.every(url => !url.endsWith("/edit")), "The bounce must not expose the deleted editor to the router");
  raced.history.back(); raced.flush();
  assert.equal(raced.url(), intercepted ? "/seller/products" : "/catalog");
}

const busy = setup();
let busyNavigation = 0;
assert.equal(busy.navigate(() => { busyNavigation++; }).prevented, true);
assert.equal(busy.confirmations(), 0);
assert.equal(busyNavigation, 0);
busy.history.back(); busy.flush();
assert.equal(busy.url(), "/seller/products/4/edit", "Back stays in an editor with an in-flight operation");
assert.equal(busy.confirmations(), 0);

const dirty = setup({ busy: false });
let dirtyNavigation = 0;
assert.equal(dirty.navigate(() => { dirtyNavigation++; }).prevented, true);
assert.equal(dirty.confirmations(), 1);
assert.equal(dirtyNavigation, 0);
dirty.context.leave(dirty.context.leaveAction.current); dirty.flush();
assert.equal(dirtyNavigation, 1, "Ordinary dirty navigation still needs explicit discard");

const clean = setup({ dirty: false, busy: false });
clean.complete(); clean.flush();
assert.equal(clean.url(), "/seller/products");
assert.equal(clean.replacements(), 1);
assert.equal(clean.confirmations(), 0);
console.log("Editor completion: intercepted/direct replace, no repeated dirty prompt, busy-Back race, render timing and ordinary dirty/busy guards passed");
