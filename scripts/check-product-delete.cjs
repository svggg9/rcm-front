/* eslint-disable @typescript-eslint/no-require-imports -- Runs deletion handlers against an isolated API mock. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
};
const { productActionBlockedReason, productActionResponseError } = require("../app/seller/lib/sellerProductActions.ts");
const source = fs.readFileSync("app/seller/products/[id]/edit/ProductEditPageClient.tsx", "utf8");
const ast = ts.createSourceFile("editor.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && ["deleteProduct", "canDeleteProduct", "productListHref"].includes(node.name?.text)) functions.push(node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const code = ts.transpileModule(functions.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;

const listHref = new Function("window", "URLSearchParams", `${functions.find(value => value.startsWith("function productListHref"))}; return productListHref();`);
const returnPath = target => listHref({ location: { search: `?returnTo=${encodeURIComponent(target)}` } }, URLSearchParams);
assert.equal(returnPath("/seller/products?q=test&status=DRAFT"), "/seller/products?q=test&status=DRAFT");
for (const target of ["https://example.com", "//example.com", "/seller/products/1/edit", "javascript:alert(1)"]) {
  assert.equal(returnPath(target), "/seller/products", "Return destinations stay in the seller product list");
}

function setup(status, { failure = false, transport = false, busy = null, hold = false } = {}) {
  const calls = [], notifications = [], routes = [], navigationOptions = [];
  const timeouts = [];
  let navigationChanges = 0;
  const state = { dirty: true, error: null, confirmation: null, deleting: false };
  const confirmationPending = { current: false };
  let finish;
  const pendingResponse = hold ? new Promise(resolve => { finish = resolve; }) : null;
  const context = {
    deleting: busy === "deleting", publishing: busy === "publishing", archiving: busy === "archiving",
    saving: busy === "saving", uploading: busy === "uploading", reordering: busy === "reordering",
    mediaActionPending: busy === "mediaActionPending", product: { id: 135, status }, productId: 135, API_URL: "",
    confirmationPending, productActionBlockedReason, productActionResponseError,
    emitSellerNavigationChanged: () => { navigationChanges++; },
    AbortSignal: { timeout: milliseconds => { timeouts.push(milliseconds); return new AbortController().signal; } },
    setConfirmationError: value => { state.error = value; },
    setConfirmation: value => { state.confirmation = value; },
    setDeleting: value => { state.deleting = value; }, setDirty: value => { state.dirty = value; },
    globalToast: { success: message => notifications.push(message) },
    router: { replace: path => routes.push(path) },
    requestEditorNavigation: (action, options) => { navigationOptions.push(options); action(); },
    apiFetch: async (url, options) => {
      calls.push({ url, ...options });
      if (pendingResponse) await pendingResponse;
      if (transport) throw new DOMException("Failed to fetch", "TimeoutError");
      return failure ? new Response(JSON.stringify({ detail: "Товар заблокирован — обратитесь в поддержку" }), { status: 403 })
        : new Response(null, { status: 200 });
    },
  };
  const handlers = new Function(...Object.keys(context), `${code}\nreturn {deleteProduct};`)(...Object.values(context));
  return { ...handlers, calls, state, routes, notifications, navigationOptions, confirmationPending, timeouts,
    navigationChanges: () => navigationChanges, finish: () => finish?.() };
}

(async () => {
  for (const status of ["DRAFT", "NEEDS_REVISION", "ARCHIVED", "ACTIVE", "MODERATION"]) {
    const test = setup(status);
    await test.deleteProduct();
    assert.equal(test.calls.length, 0, "Opening confirmation must not mutate the product");
    assert.equal(test.state.confirmation, "delete");
    await test.deleteProduct(true);
    assert.deepEqual(test.calls.map(({ url, method }) => ({ url, method })), [{ url: "/api/seller/products/135/delete", method: "POST" }], "One direct deletion request, no archive request");
    assert.deepEqual(test.timeouts, [20000]);
    assert.ok(test.calls[0].signal instanceof AbortSignal);
    assert.deepEqual(test.routes, ["/seller/products"]);
    assert.equal(test.state.dirty, false);
    assert.equal(test.navigationChanges(), 1);
    assert.deepEqual(test.navigationOptions, [{ completed: true }], "Successful deletion consumes editor history guard without another confirmation");
    assert.deepEqual(test.notifications, ["Товар удалён"]);
  }
  for (const status of ["BLOCKED", "DELETED", undefined]) {
    const test = setup(status); await test.deleteProduct(true);
    assert.equal(test.calls.length, 0);
    assert.equal(test.routes.length, 0);
  }
  for (const busy of ["deleting", "publishing", "archiving", "saving", "uploading", "reordering", "mediaActionPending"]) {
    const test = setup("ACTIVE", { busy }); await test.deleteProduct(true);
    assert.equal(test.calls.length, 0);
  }
  const duplicate = setup("MODERATION", { hold: true });
  const first = duplicate.deleteProduct(true);
  await duplicate.deleteProduct(true);
  assert.equal(duplicate.calls.length, 1);
  duplicate.finish(); await first;
  const failed = setup("ACTIVE", { failure: true }); await failed.deleteProduct(true);
  assert.equal(failed.state.error, "Товар заблокирован — обратитесь в поддержку");
  assert.equal(failed.state.dirty, true);
  assert.equal(failed.state.deleting, false);
  assert.equal(failed.confirmationPending.current, false);
  assert.deepEqual(failed.routes, []);
  assert.equal(failed.navigationChanges(), 0);
  assert.deepEqual(failed.notifications, []);
  await failed.deleteProduct(true);
  assert.equal(failed.calls.length, 2, "A failed request remains retryable");
  const uncertain = setup("ACTIVE", { transport: true }); await uncertain.deleteProduct(true);
  assert.equal(uncertain.state.error, "Не получено подтверждение от сервера — обновите список и проверьте статус перед повтором");
  assert.equal(uncertain.state.deleting, false);
  assert.equal(uncertain.state.dirty, true);
  assert.equal(uncertain.confirmationPending.current, false);
  assert.equal(uncertain.calls.length, 1, "Unknown outcomes must not be automatically retried");
  assert.deepEqual(uncertain.routes, []);
  assert.equal(uncertain.navigationChanges(), 0);
  assert.deepEqual(uncertain.notifications, []);
  console.log("PASS: editor direct deletion, one confirmation/request, blocked/busy/duplicate guards, failure retry and completed navigation");
})().catch(error => { console.error(error); process.exitCode = 1; });
