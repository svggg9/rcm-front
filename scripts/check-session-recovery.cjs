/* eslint-disable @typescript-eslint/no-require-imports -- Isolated session, cart and favorites recovery; no real API or browser storage writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");

function load(file, imports = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  new Function("module", "exports", "require", code)(mod, mod.exports, name => {
    assert(name in imports, `Unexpected import ${name}`); return imports[name];
  });
  return mod.exports;
}
const errors = load("app/lib/apiErrors.ts");
const contract = load("app/lib/sessionContract.ts", { "./apiErrors": errors });
const events = { AUTH_EVENT: "auth-changed", SESSION_IDENTITY_EVENT: "session-identity-changed" };
const user = id => ({ id, username: `user-${id}@example.test`, role: "USER" });
const tick = () => new Promise(setImmediate);
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function sessionStore(transport) {
  global.window = new EventTarget();
  let calls = 0, cleared = 0;
  const api = load("app/lib/client-session.ts", {
    "./api": { API_URL: "", apiFetch: (...args) => { calls++; return transport(...args); } },
    "./authEvents": events, "./auth": { clearStoredUserCartId() { cleared++; } },
    "./apiErrors": errors, "./sessionContract": contract,
  });
  return { ...api, calls: () => calls, cleared: () => cleared, authChanged: () => window.dispatchEvent(new Event(events.AUTH_EVENT)) };
}

function hooks() {
  let cursor = 0; const slots = [], effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) { const index = cursor++; slots[index] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, next => { slots[index].value = typeof next === "function" ? next(slots[index].value) : next; }]; },
    useRef(initial) { const index = cursor++; slots[index] ??= { current: initial }; return slots[index]; },
    useMemo(fn, deps) { const index = cursor++; if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { value: fn(), deps }; return slots[index].value; },
    useEffect(fn, deps) { const index = cursor++; if (!slots[index] || !same(slots[index].deps, deps)) {
      const cleanup = slots[index]?.cleanup; slots[index] = { deps }; effects.push(() => { cleanup?.(); slots[index].cleanup = fn(); });
    } },
    createContext: () => ({ Provider: "Provider" }), useContext: () => null,
  };
  react.useCallback = (fn, deps) => react.useMemo(() => fn, deps);
  return { react, render(fn) { cursor = 0; return fn(); }, async flush(fn) { for (let i = 0; i < 6; i++) {
    this.render(fn); effects.splice(0).forEach(effect => effect()); await tick();
  } return this.render(fn); } };
}

async function checkSession() {
  const variants = [() => Response.json({ message: "private SQL" }, { status: 503 }), () => new Response("private HTML", { status: 502 }),
    () => new Response("", { status: 401 }), () => Response.json({}), () => Response.json([]),
    () => new Response("invalid JSON", { status: 200 }), () => Response.json({ ...user(1), id: -1 })];
  for (const response of variants) {
    const store = sessionStore(async () => response());
    await assert.rejects(store.getClientSession(), error => error instanceof errors.ApiRequestError && !error.message.includes("private"));
    assert.equal(store.getClientSessionSnapshot().hasResolved, false);
    assert.equal(store.cleared(), 0, "A failure must not erase user authority or confirm a guest");
  }
  let response = () => Response.json(user(1));
  const store = sessionStore(async () => response());
  assert.deepEqual(await store.getClientSession(), user(1));
  await store.getClientSession(); assert.equal(store.calls(), 1, "A valid session is cached");
  response = () => Response.json({}, { status: 503 });
  await assert.rejects(store.getClientSession({ force: true }));
  assert.equal(store.getClientSessionSnapshot().user.id, 1, "A refresh failure preserves the displayed identity");
  await assert.rejects(store.getClientSession()); assert.equal(store.calls(), 3, "A failed refresh never authorizes a stale cached session");
  response = () => Response.json(user(1)); await store.getClientSession();
  assert.equal(store.getClientSessionSnapshot().error, null);
  response = () => new Response(null, { status: 204 }); await store.getClientSession({ force: true });
  assert.equal(store.getClientSessionSnapshot().user, null); assert.equal(store.getClientSessionSnapshot().hasResolved, true); assert.equal(store.cleared(), 1);

  const pending = deferred(); const shared = sessionStore(() => pending.promise);
  const first = shared.getClientSession(), second = shared.getClientSession({ force: true });
  assert.equal(first, second); await tick(); assert.equal(shared.calls(), 1);
  pending.resolve(Response.json(user(2))); await first;

  const oldBody = deferred(); let reads = 0;
  const changing = sessionStore(async () => ++reads === 1 ? { status: 200, json: () => oldBody.promise } : Response.json(user(2)));
  const obsolete = changing.getClientSession(); await tick(); changing.authChanged();
  assert.equal(changing.getClientSessionSnapshot().user, null);
  await changing.getClientSession(); oldBody.resolve(user(1));
  assert.equal((await obsolete).id, 2); assert.equal(changing.getClientSessionSnapshot().user.id, 2, "An obsolete body cannot restore another account");

  const network = sessionStore(async () => { throw new TypeError("private URL"); });
  await assert.rejects(network.getClientSession(), error => error.kind === "network");
  const timeout = sessionStore(async () => { throw new DOMException("private", "TimeoutError"); });
  await assert.rejects(timeout.getClientSession(), error => error.kind === "timeout");

  const server = load("app/lib/session.ts", { "next/headers": { cookies: async () => ({ toString: () => "" }) },
    "./config": { API_URL: "" }, "./apiErrors": errors, "./sessionContract": contract });
  const previousFetch = global.fetch;
  try {
    global.fetch = async () => Response.json({}, { status: 503 }); await assert.rejects(server.getServerSession());
    global.fetch = async () => Response.json({}); await assert.rejects(server.getServerSession());
    global.fetch = async () => new Response(null, { status: 204 }); assert.equal(await server.getServerSession(), null);
    global.fetch = async () => Response.json(user(2)); assert.deepEqual(await server.getServerSession(), user(2));
  } finally { global.fetch = previousFetch; }
  console.log("PASS: client/server 200/204, 401/5xx/JSON/network/timeout, cached identity vs authority, single flight, retry and obsolete account body");
}

async function checkCart() {
  let session = user(1), revision = 0, guestId = "guest", guestCreates = 0, remembered = 0, reads = 0;
  let response = () => Response.json({ count: 4 });
  const cart = load("app/lib/cartAuthority.ts", { "./api": { API_URL: "", apiFetch: async () => { reads++; return response(); } },
    "./auth": { ensureGuestCartId: async () => { guestCreates++; return guestId; }, getGuestCartId: () => guestId, rememberUserCartId() { remembered++; } },
    "./client-session": { getClientSession: async () => { if (session instanceof Error) throw session; return session; }, getClientSessionRevision: () => revision }, "./apiErrors": errors });
  session = new errors.ApiRequestError("Не удалось проверить вход", "http", 503);
  await assert.rejects(cart.loadResolvedCart()); await assert.rejects(cart.resolveCartId()); await assert.rejects(cart.loadResolvedCartCount());
  assert.equal(guestCreates, 0); assert.equal(reads, 0); assert.equal(remembered, 0);
  session = user(1); assert.equal(await cart.loadResolvedCartCount(), 4);
  for (const invalid of [() => Response.json({}, { status: 502 }), () => Response.json({ count: -1 }), () => Response.json({ count: 1.5 }), () => Response.json({})]) {
    response = invalid; await assert.rejects(cart.loadResolvedCartCount(), "Unknown is not a confirmed zero");
  }
  response = () => Response.json({ count: 0 }); assert.equal(await cart.loadResolvedCartCount(), 0);
  session = null; guestId = ""; const before = reads; assert.equal(await cart.loadResolvedCartCount(), 0); assert.equal(reads, before);
  guestId = "guest"; response = () => Response.json({}); await assert.rejects(cart.loadResolvedCart());
  const sessionChange = deferred(); session = sessionChange.promise;
  const obsoleteId = cart.resolveCartId(); await tick(); revision++; sessionChange.resolve(user(2));
  await assert.rejects(obsoleteId, error => error.name === "AbortError"); assert.equal(remembered, 0);
  session = user(1); const delayed = deferred(); response = () => ({ ok: true, json: () => delayed.promise });
  const obsolete = cart.loadResolvedCart(); await tick(); revision++; delayed.resolve({ cartId: "user_old", items: [] });
  await assert.rejects(obsolete, error => error.name === "AbortError"); assert.equal(remembered, 0);
  console.log("PASS: unavailable session cannot create/select a guest cart, malformed/failed counts never become zero, stale cart cannot overwrite new identity");
}

async function checkConsumers() {
  global.window = new EventTarget();
  let identity = { ...user(1), loading: false, hasResolved: true, error: null, revision: 0 };
  const h = hooks(); let count = 4, countFailure = false;
  const counter = load("app/lib/useCartCount.ts", { react: h.react, "next/navigation": { usePathname: () => "/catalog" },
    "./cartEvents": { CART_EVENT: "cart-changed" }, "./useCurrentUser": { useCurrentUser: () => identity },
    "./cartAuthority": { loadResolvedCartCount: async () => { if (countFailure) throw new Error(); return count; } } });
  assert.equal(await h.flush(counter.useCartCount), 4);
  countFailure = true; window.dispatchEvent(new Event("cart-changed")); await tick(); assert.equal(h.render(counter.useCartCount), 4);
  identity = { ...identity, error: new Error("unavailable") }; assert.equal(await h.flush(counter.useCartCount), 4);
  identity = { ...identity, revision: 1, loading: true }; assert.equal(await h.flush(counter.useCartCount), 0, "A new identity must not display another user's count");
  identity = { ...identity, loading: false, error: null }; countFailure = false; count = 2; assert.equal(await h.flush(counter.useCartCount), 2);

  global.window = new EventTarget(); const f = hooks(); let sessionFailure = false, apiFailure = false, ids = [7], guestWrites = 0, writes = 0;
  identity = { user: user(1), loading: false, hasResolved: true, error: null, revision: 0 };
  const provider = load("app/lib/FavoritesContext.tsx", { react: f.react, "react/jsx-runtime": jsx, "next/navigation": { usePathname: () => "/catalog" },
    "./useCurrentUser": { useCurrentUser: () => identity }, "./apiErrors": errors,
    "./client-session": { getClientSession: async () => { if (sessionFailure) throw new errors.ApiRequestError("unavailable", "http", 503); return identity.user; }, getClientSessionRevision: () => identity.revision },
    "./api": { API_URL: "", apiFetch: async (_url, options) => { if (options?.method) writes++; return apiFailure ? Response.json({}, { status: 502 }) : Response.json(ids); } },
    "./favorites": { getGuestFavoriteIds: () => [99], addGuestFavorite() { guestWrites++; return [99]; }, removeGuestFavorite() { guestWrites++; return []; },
      FAVORITES_EVENT: "favorites-changed", emitFavoritesChanged() { window.dispatchEvent(new Event("favorites-changed")); } },
  });
  const render = () => provider.FavoritesProvider({ children: null }).props.value;
  let view = await f.flush(render); assert.deepEqual(view.favoriteIds, [7]);
  apiFailure = true; await view.refresh(); view = await f.flush(render); assert.deepEqual(view.favoriteIds, [7]); assert.equal(view.count, 1);
  sessionFailure = true; await assert.rejects(view.toggle(7)); await tick(); assert.equal(guestWrites, 0); assert.equal(writes, 0);
  assert.deepEqual(f.render(render).favoriteIds, [7]);
  identity = { ...identity, user: user(2), revision: 1, loading: true }; assert.deepEqual(f.render(render).favoriteIds, []);
  sessionFailure = false; apiFailure = false; ids = [8]; identity = { ...identity, loading: false };
  view = await f.flush(render); assert.deepEqual(view.favoriteIds, [8]);
  console.log("PASS: cart/favorite counts survive same-user failures, unknown session cannot write guest favorites, account switch clears displayed private state and recovers");
}

(async () => { await checkSession(); await checkCart(); await checkConsumers(); })().catch(error => { console.error(error); process.exitCode = 1; });
