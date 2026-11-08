/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser transport and handler regression. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const result = { exports: {} };
  new Function("module", "exports", "require", code)(result, result.exports, name => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  });
  return result.exports;
}

async function run() {
  const items = new Map();
  global.window = {};
  global.localStorage = {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: key => items.delete(key),
  };
  const events = [];
  const draft = load("app/checkout/lib/checkoutDraft.ts", {});
  const auth = load("app/lib/auth.ts", {
    "./authEvents": { emitAuthChanged: () => events.push("auth") },
    "./cartEvents": { emitCartChanged: () => events.push("cart") },
    "./config": { API_URL: "https://fixture" },
    "../checkout/lib/checkoutDraft": draft,
  });
  const reset = () => {
    items.clear(); events.length = 0;
    items.set("user_cart_id", "user_test");
    items.set("checkout_draft_v1:user_test", "personal data");
    items.set("checkout_draft_v1", "old personal data");
    items.set("checkout_draft_v1:other", "another cart");
  };
  for (const result of [() => new Response(null, { status: 503 }), () => new Response(null, { status: 200 }), () => { throw new Error("network"); }]) {
    reset(); global.fetch = async () => result();
    await assert.rejects(auth.logout());
    assert.equal(items.get("user_cart_id"), "user_test");
    assert.equal(items.get("checkout_draft_v1:user_test"), "personal data");
    assert.deepEqual(events, []);
  }
  reset();
  global.fetch = async (url, options) => {
    assert.equal(url, "https://fixture/api/auth/logout");
    assert.equal(options.method, "POST"); assert.equal(options.credentials, "include");
    assert.equal(options.redirect, "error"); assert(options.signal instanceof AbortSignal);
    return new Response(null, { status: 204 });
  };
  assert.deepEqual(await auth.logout(), { storageCleared: true });
  assert.equal(items.has("user_cart_id"), false);
  assert.equal(items.has("checkout_draft_v1:user_test"), false);
  assert.equal(items.has("checkout_draft_v1"), false);
  assert.equal(items.get("checkout_draft_v1:other"), "another cart");
  assert.deepEqual(events, ["auth", "cart"]);
  reset();
  const originalRemove = global.localStorage.removeItem;
  global.localStorage.removeItem = key => { if (key === "checkout_draft_v1") throw new Error("denied"); originalRemove(key); };
  assert.deepEqual(await auth.logout(), { storageCleared: false });
  assert.equal(items.has("user_cart_id"), false);
  global.localStorage.removeItem = originalRemove;

  const messages = [], navigation = [];
  let pending, calls = 0, cursor = 0;
  const hooks = [];
  const react = {
    useRef(value) { const i = cursor++; return hooks[i] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in hooks)) hooks[i] = value; return [hooks[i], v => { hooks[i] = v; }]; },
  };
  const { AccountFrame } = load("app/account/components/AccountFrame.tsx", {
    react, "react/jsx-runtime": require("react/jsx-runtime"),
    "next/navigation": { useRouter: () => ({ replace: path => navigation.push(path), refresh: () => navigation.push("refresh") }) },
    "lucide-react": { Copy: "Copy" },
    "../../lib/auth": { logout: () => { calls++; return new Promise((resolve, reject) => { pending = { resolve, reject }; }); } },
    "../../components/ui/toast": { toast: { warning: message => messages.push(message), error: message => messages.push(message) } },
    "./AccountSidebar": { AccountSidebar: "Sidebar", accountTabTitles: {} },
    "../AccountPageClient.module.css": { default: {} },
    "./AccountCommerce.module.css": { default: {} },
  });
  function sidebar() {
    cursor = 0; const root = AccountFrame({ currentTab: "home", children: null });
    return root.props.children.props.children.props.children[0];
  }
  let node = sidebar(); node.props.onLogout(); node.props.onLogout();
  assert.equal(calls, 1); assert.equal(sidebar().props.logoutPending, true);
  pending.reject(new Error("unknown")); await new Promise(resolve => setImmediate(resolve));
  assert.equal(sidebar().props.logoutPending, false); assert.equal(navigation.length, 0);
  assert.match(messages.at(-1), /Не удалось подтвердить выход/);
  sidebar().props.onLogout(); pending.resolve({ storageCleared: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(navigation, ["/", "refresh"]);
  console.log("PASS: logout success, failures, draft cleanup, storage failure, retry and duplicate click");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
