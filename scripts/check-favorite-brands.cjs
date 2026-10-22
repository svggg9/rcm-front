/* eslint-disable @typescript-eslint/no-require-imports -- Isolated transport, race and UI regression; no real API writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const { renderToStaticMarkup } = require("react-dom/server");

function load(file, imports = {}) {
  const testModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { fileName: file, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  new Function("module", "exports", "require", code)(testModule, testModule.exports, name => {
    assert(name in imports, `Unexpected import ${name}`);
    return imports[name];
  });
  return testModule.exports;
}

const errors = load("app/lib/apiErrors.ts");
const brand = id => ({ id, name: `Бренд ${id}`, slug: `brand-${id}`, country: null, logoUrl: null, images: [] });
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function store(fetch) {
  const events = new EventTarget();
  global.window = events;
  let started = false, subscribed = false, unsubscribe, getSnapshot, user = { id: 1 };
  const loadedStore = load("app/lib/favoriteBrands.ts", {
    react: {
      useEffect(effect) { if (!started) { started = true; effect(); } },
      useSyncExternalStore(subscribe, get) { getSnapshot = get; if (!subscribed) { unsubscribe = subscribe(() => {}); subscribed = true; } return get(); },
    },
    "./api": { API_URL: "", apiFetch: fetch }, "./apiErrors": errors,
    "./authEvents": { AUTH_EVENT: "test-auth" }, "./client-session": { getClientSession: async () => user },
  });
  return { read: loadedStore.useFavoriteBrands, peek: () => getSnapshot(), dispose() { unsubscribe(); started = false; subscribed = false; },
    setSessionUser(id) { user = { id }; },
    changeUser(id) { user = { id }; events.dispatchEvent(new Event("test-auth")); } };
}

async function run() {
  const fallback = "Не удалось выполнить действие";
  for (const response of [Response.json({ message: "SQL private exception" }, { status: 500 }), new Response("<html>private nginx</html>", { status: 502 }),
    new Response("private stack", { status: 400 }), Response.json({ message: "toString" }, { status: 400 })]) {
    assert.equal((await errors.readApiError(response, fallback)).message, fallback);
  }
  assert.equal((await errors.readApiError(Response.json({ code: "BAD_REQUEST", message: "known" }, { status: 400 }), fallback, { known: "Понятная причина" })).message, "Понятная причина");
  assert.equal((await errors.readApiError(new Response("", { status: 401 }), fallback)).status, 401);
  assert.equal(errors.toApiError(new TypeError("Failed to fetch private URL"), fallback).message, fallback);
  assert.equal(errors.toApiError(new DOMException("private", "TimeoutError"), fallback).kind, "timeout");
  assert(errors.isRequestCancelled(new DOMException("cancelled", "AbortError")));

  let response = () => Response.json({ message: "private" }, { status: 500 });
  const saved = store(async () => response());
  await saved.read().reload();
  assert(saved.read().error); assert.equal(saved.read().hasLoaded, false);
  response = () => Response.json([]);
  await saved.read().reload();
  assert.equal(saved.read().error, null); assert.equal(saved.read().hasLoaded, true); assert.deepEqual(saved.read().brands, []);
  response = () => Response.json([brand(1), brand(2)]);
  await saved.read().reload();
  for (const invalid of [{ unexpected: [] }, [{}], [brand(1), brand(1)]]) {
    response = () => Response.json(invalid);
    await saved.read().reload();
    assert.equal(saved.read().error.kind, "invalid-response");
    assert.deepEqual(saved.read().brands.map(item => item.id), [1, 2]);
  }
  response = () => new Response("{broken");
  await saved.read().reload(); assert.equal(saved.read().error.kind, "invalid-response");
  response = () => { throw new TypeError("private network details"); };
  await saved.read().reload(); assert.equal(saved.read().error.kind, "network");
  assert.deepEqual(saved.read().brands.map(item => item.id), [1, 2]);
  response = () => { throw new DOMException("private", "TimeoutError"); };
  await saved.read().reload(); assert.equal(saved.read().error.kind, "timeout");

  const first = deferred(), second = deferred();
  let mutationCalls = 0;
  const parallel = store(async (url, options) => {
    if (!options.method) return Response.json([brand(1), brand(2)]);
    mutationCalls += 1;
    return url.endsWith("/1") ? first.promise : second.promise;
  });
  await parallel.read().reload();
  const failed = parallel.read().toggle(brand(1));
  const passed = parallel.read().toggle(brand(2));
  await parallel.read().toggle(brand(1));
  assert.equal(mutationCalls, 2, "Repeated click on the same brand sends one mutation");
  second.resolve(new Response(null, { status: 204 })); await passed;
  first.resolve(Response.json({ message: "private SQL" }, { status: 500 }));
  await assert.rejects(failed, error => error instanceof errors.ApiRequestError && !error.message.includes("private"));
  assert.deepEqual(parallel.read().brands.map(item => item.id), [1], "A failed mutation must not restore another successful removal");
  assert.deepEqual(parallel.read().pendingIds, []);

  const body = deferred(); let reads = 0;
  const switching = store(async () => ++reads === 1 ? { ok: true, status: 200, json: () => body.promise } : Response.json([brand(9)]));
  switching.read(); await new Promise(setImmediate);
  switching.changeUser(2);
  await switching.read().reload();
  body.resolve([brand(1)]); await new Promise(setImmediate);
  assert.deepEqual(switching.read().brands.map(item => item.id), [9], "Late body from previous account cannot overwrite the current user");

  const pending = deferred(); let count = 0;
  const oldMutation = store(async (url, options) => options.method ? pending.promise : Response.json([brand(++count)]));
  await oldMutation.read().reload();
  const obsolete = oldMutation.read().toggle(brand(1));
  oldMutation.changeUser(2); await oldMutation.read().reload();
  pending.resolve(Response.json({ message: "private" }, { status: 500 })); await obsolete;
  assert.deepEqual(oldMutation.read().brands.map(item => item.id), [2]);
  assert.equal(oldMutation.read().error, null);

  const leaving = store(async (url, options) => {
    if (!options.method) return Response.json([brand(1)]);
    return new Promise((resolve, reject) => options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true }));
  });
  await leaving.read().reload();
  const cancelled = leaving.read().toggle(brand(1));
  leaving.dispose();
  assert.equal(await cancelled, undefined, "Leaving the last consumer aborts silently without a toast error");
  assert.deepEqual(leaving.peek().brands.map(item => item.id), [1]);
  assert.deepEqual(leaving.peek().pendingIds, []);

  let failNewUser = false;
  const changedSession = store(async () => failNewUser ? Response.json({}, { status: 500 }) : Response.json([brand(1)]));
  await changedSession.read().reload();
  changedSession.setSessionUser(2); failNewUser = true;
  await changedSession.read().reload();
  assert(changedSession.read().error);
  assert.deepEqual(changedSession.read().brands, [], "A different session must not retain another user's list even without an auth event");

  const { EmptyState } = load("app/components/ui/EmptyState.tsx", {
    "react/jsx-runtime": jsx, "./Icon": { Icon: () => jsx.jsx("svg", {}) },
  });
  const { Button } = load("app/components/ui/Button.tsx", { "react/jsx-runtime": jsx, "./Button.module.css": { default: {} } });
  const { RequestError } = load("app/components/ui/RequestError.tsx", {
    "react/jsx-runtime": jsx, "./Button": { Button }, "./EmptyState": { EmptyState },
    "./Icon": { Icon: () => jsx.jsx("svg", {}) }, "./RequestError.module.css": { default: {} },
  });
  let state = { brands: [], loading: false, hasLoaded: false, error: new errors.ApiRequestError("Не удалось загрузить сохранённые бренды", "http", 500), pendingIds: [], reload() {}, toggle() {} };
  const { AccountBrandsTab } = load("app/account/components/AccountBrandsTab.tsx", {
    "react/jsx-runtime": jsx, "next/image": { default: () => null }, "next/link": { default: props => jsx.jsx("a", props) },
    "@/app/components/ui/toast": { toast: { error() {}, dismiss() {} } },
    "./AccountSkeleton": { AccountSkeleton: () => jsx.jsx("div", { "data-skeleton": true }) },
    "../../components/ui/RequestError": { RequestError },
    "../../components/ui/EmptyState": { EmptyState }, "../../components/ui/LikeButton": { LikeButton: () => null },
    "../../lib/favoriteBrands": { useFavoriteBrands: () => state }, "./AccountBrandsTab.module.css": { default: {} },
  });
  const html = () => renderToStaticMarkup(jsx.jsx(AccountBrandsTab, {}));
  assert(html().includes('role="alert"')); assert(html().includes("Повторить")); assert(!html().includes("пока нет"));
  state = { ...state, loading: true };
  assert(html().includes('aria-label="Повторить"')); assert(html().includes('data-loading="true"'));
  assert(!html().includes("data-skeleton"), "Retry keeps its error block and button stable");
  state = { ...state, brands: [brand(1)], hasLoaded: true };
  assert(html().includes("Бренд 1")); assert(html().includes("Повторить"));
  state = { ...state, brands: [], loading: false, error: null };
  assert(html().includes("Сохранённых брендов пока нет"));
  console.log("API errors and saved brands: safe messages, invalid payloads, empty/error/retry, preserved data, concurrent mutations and account-switch races passed");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
