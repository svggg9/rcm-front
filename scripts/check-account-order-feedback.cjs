/* eslint-disable @typescript-eslint/no-require-imports -- Isolated React lifecycle regression; no network or database writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");

function load(file, imports) {
  const testModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("module", "exports", "require", code)(testModule, testModule.exports, name => {
    assert(name in imports, `Unexpected import ${name}`);
    return imports[name];
  });
  return testModule.exports;
}

function account(query) {
  let search = new URLSearchParams(query), cursor = 0, dirty = true, tree, effects = [], refreshes = 0;
  const hooks = [], requests = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) {
      const index = cursor++;
      hooks[index] ??= { value: typeof initial === "function" ? initial() : initial };
      return [hooks[index].value, value => {
        const next = typeof value === "function" ? value(hooks[index].value) : value;
        if (!Object.is(next, hooks[index].value)) { hooks[index].value = next; dirty = true; }
      }];
    },
    useRef(initial) { const index = cursor++; hooks[index] ??= { current: initial }; return hooks[index]; },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!hooks[index] || !same(hooks[index].deps, deps)) hooks[index] = { value: callback, deps };
      return hooks[index].value;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!hooks[index] || !same(hooks[index].deps, deps)) {
        const cleanup = hooks[index]?.cleanup;
        hooks[index] = { deps };
        effects.push(() => { cleanup?.(); hooks[index].cleanup = effect(); });
      }
    },
  };
  react.useLayoutEffect = react.useEffect;
  const placeholder = () => null;
  const RequestError = () => null;
  const cache = load("app/lib/useSessionResourceCache.ts", { react });
  const client = load("app/account/AccountPageClient.tsx", {
    react, "react/jsx-runtime": jsx,
    "next/navigation": { useSearchParams: () => search, useRouter: () => ({ refresh() { refreshes++; }, push() {}, replace() {} }) },
    "next/dynamic": { default: () => placeholder },
    "@/app/components/ui/toast": { toast: { error() {}, success() {} } },
    "../lib/api": { API_URL: "", apiFetch: (url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject })) },
    "../lib/auth": { logout: async () => {} }, "../lib/useSessionResourceCache": cache,
    "../components/ui/RequestError": { RequestError },
    "./components/AccountFrame": { AccountFrame: placeholder },
    "./components/AccountSkeleton": { AccountSkeleton: placeholder },
    "./lib/presentation": { accountApiError: async (_response, fallback) => fallback },
    "../components/ui/EditorSurface": { requestEditorNavigation: callback => callback() },
    "./components/AccountProfileTab": { AccountProfileTab: placeholder },
    "./components/AccountOrdersTab": { AccountOrdersTab: placeholder },
    "./components/AccountInfoTab": { AccountInfoTab: placeholder },
    "./AccountPageClient.module.css": { default: {} },
  });
  const props = { initialMe: { id: 1 }, initialOrders: { content: [], totalElements: 0, number: 0 },
    initialOrdersLoaded: false, initialSelectedOrder: null };
  global.window = { scrollY: 0, scrollTo() {} };
  function render() {
    for (let guard = 0; dirty && guard < 20; guard++) {
      dirty = false; cursor = 0; effects = [];
      const root = client.AccountPageClient(props);
      tree = root.type(root.props);
      effects.forEach(effect => effect());
    }
    assert(!dirty, "Rendering must settle");
  }
  function find(predicate, node) {
    if (!node || typeof node !== "object" || node.props?.hidden) return null;
    if (Array.isArray(node)) return node.map(child => find(predicate, child)).find(Boolean) ?? null;
    if (predicate(node)) return node;
    return find(predicate, node.props?.children);
  }
  render();
  return {
    requests, error: () => find(node => node.type === RequestError, tree),
    order: () => find(node => node.props?.order, tree), refreshes: () => refreshes,
    navigate(query) { search = new URLSearchParams(query); dirty = true; render(); },
    async flush() { await new Promise(setImmediate); render(); },
  };
}

async function run() {
  const serverApi = load("app/account/lib/accountServerApi.ts", {
    "next/headers": { cookies: async () => ({ toString: () => "" }) }, "../../lib/config": { API_URL: "" },
  });
  const previousFetch = global.fetch;
  try {
    global.fetch = async () => Response.json({}, { status: 502 });
    assert.equal(await serverApi.getAccountOrdersServer(), null, "An SSR API failure must not become an empty order list");
    global.fetch = async () => { throw new TypeError("Disconnected"); };
    assert.equal(await serverApi.getAccountOrdersServer(), null);
    global.fetch = async () => Response.json({ content: [], totalElements: 0 });
    assert.deepEqual(await serverApi.getAccountOrdersServer(), { content: [], totalElements: 0 }, "A confirmed empty list remains a successful response");
  } finally { global.fetch = previousFetch; }
  const page = load("app/account/page.tsx", {
    "react/jsx-runtime": jsx, "next/navigation": { redirect() { assert.fail("An authenticated user must stay in their account"); } },
    "./AccountPageClient": { AccountPageClient: () => null }, "../lib/session": { getServerSession: async () => ({ id: 1 }) },
    "./lib/accountServerApi": { getAccountMeServer: async () => ({ id: 1 }), getAccountOrdersServer: async () => null, getAccountOrderServer: async () => null },
  });
  const serverPage = await page.default({ searchParams: Promise.resolve({ tab: "orders" }) });
  assert.equal(serverPage.props.initialOrdersLoaded, false, "A failed SSR list must be retried on the client");

  const detail = account("tab=orders&orderId=702");
  assert.deepEqual(detail.requests.map(request => request.url), ["/api/orders/702"], "A detail load does not start a competing list request");
  detail.requests[0].resolve(Response.json({ message: "private failure" }, { status: 502 })); await detail.flush();
  assert.equal(detail.error().props.message, "Не удалось загрузить заказ");
  detail.error().props.onRetry(); await detail.flush();
  assert.equal(detail.requests.length, 2, "Retry sends a fresh order GET without refreshing the route");
  assert.equal(detail.error().props.loading, true, "The error block stays visible while retrying");
  detail.requests[1].resolve(Response.json({}, { status: 502 })); await detail.flush();
  assert.equal(detail.error().props.loading, false, "A second failure leaves an enabled retry");
  detail.error().props.onRetry(); await detail.flush();
  detail.requests[2].resolve(Response.json({ id: 702 })); await detail.flush();
  assert.equal(detail.error(), null); assert.equal(detail.order().props.order.id, 702); assert.equal(detail.refreshes(), 0);

  const stale = account("tab=orders&orderId=702");
  stale.navigate("tab=orders&orderId=703");
  stale.requests[0].resolve(Response.json({}, { status: 502 })); await stale.flush();
  assert.equal(stale.error(), null, "An obsolete failure cannot replace the new order loading state");
  stale.requests[1].resolve(Response.json({}, { status: 502 })); await stale.flush();
  assert(stale.error()); stale.navigate("tab=profile"); assert.equal(stale.error(), null, "Order errors are scoped to their section");

  const list = account("tab=orders");
  list.requests[0].resolve(Response.json({}, { status: 502 })); await list.flush();
  assert.equal(list.error().props.message, "Не удалось загрузить заказы");
  list.error().props.onRetry(); list.error().props.onRetry(); await list.flush();
  assert.equal(list.requests.length, 2, "Repeated retry clicks do not duplicate the list request");
  assert.equal(list.error().props.loading, true);
  list.requests[1].resolve(Response.json({ content: [{ id: 703 }], totalElements: 1, number: 0 })); await list.flush();
  assert.equal(list.error(), null); assert.equal(list.refreshes(), 0);
  const disconnected = account("tab=orders");
  disconnected.requests[0].reject(new TypeError("private network detail")); await disconnected.flush();
  assert.equal(disconnected.error().props.message, "Не удалось загрузить заказы", "Network errors use safe interface copy");
  console.log("Account order feedback: SSR error vs empty list, fresh retry, retained busy/error state, repeated failure/recovery, obsolete response isolation, section scope and duplicate-click guard passed");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
