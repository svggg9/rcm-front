/* eslint-disable @typescript-eslint/no-require-imports -- Isolated UI tests, no API writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
function load(file, mocks) {
  const filename = path.join(root, file);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = mod.require.bind(mod);
  mod.require = id => Object.hasOwn(mocks, id) ? mocks[id] : originalRequire(id);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
function harness() {
  const slots = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], next => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
  };
  const { LikeButton } = load("app/components/ui/LikeButton.tsx", { react, "./LikeButton.module.css": { button: "button", icon: "icon" } });
  return props => { cursor = 0; return LikeButton(props).props; };
}
async function main() {
  const render = harness();
  let finish;
  let calls = 0;
  const props = { liked: true, onClick: () => { calls++; return new Promise(resolve => { finish = resolve; }); } };
  const event = { stopPropagation() {} };
  const original = render(props);
  const pending = original.onClick(event);
  await original.onClick(event); // Same-frame double click is ignored.
  assert.equal(calls, 1);
  assert.equal(render(props)["aria-pressed"], false); // Unlike immediately, before response.
  assert.equal(render(props)["data-hover-fill-suppressed"], true);
  assert.equal(render(props).disabled, true);
  assert.equal(render(props)["aria-busy"], true);
  finish(); await pending;
  assert.equal(render({ ...props, liked: false })["aria-pressed"], false);
  assert.equal(render({ ...props, liked: false })["data-hover-fill-suppressed"], true);
  render({ ...props, liked: false }).onPointerLeave({});
  assert.equal(render({ ...props, liked: false })["data-hover-fill-suppressed"], undefined);

  const failed = render({ liked: false, onClick: async () => { throw Error("offline"); } }).onClick(event);
  assert.equal(render({ ...props, liked: false })["aria-pressed"], true);
  await assert.rejects(failed, /offline/);
  assert.equal(render({ ...props, liked: false })["aria-pressed"], false);
  assert.equal(render(props)["aria-busy"], undefined);
  await render({ ...props, disabled: true }).onClick(event);
  await render({ ...props, pending: true }).onClick(event);
  assert.equal(calls, 1);

  let request;
  const store = load("app/lib/favoriteBrands.ts", {
    react: { useEffect() {}, useSyncExternalStore: (_, getSnapshot) => getSnapshot() },
    "./api": { API_URL: "https://test.invalid", apiFetch: (...args) => request(...args) },
    "./authEvents": { AUTH_EVENT: "auth" }, "./client-session": { getClientSession: async () => null },
  });
  const brand = { id: 1, name: "Тест", slug: "test", logoUrl: null, country: null };
  request = async () => ({ ok: true });
  await store.useFavoriteBrands().toggle(brand);
  request = async () => { throw Error("offline"); };
  await assert.rejects(store.useFavoriteBrands().toggle(brand), /offline/);
  assert.equal(store.useFavoriteBrands().isFavorite(1), true);
  request = async () => ({ ok: false, text: async () => "forbidden" });
  await assert.rejects(store.useFavoriteBrands().toggle({ ...brand, id: 2 }), /forbidden/);
  assert.equal(store.useFavoriteBrands().isFavorite(2), false);

  // A failed brand must not undo a different brand's successful request.
  let rejectFirst;
  request = url => url.endsWith("/1") ? new Promise((_, reject) => { rejectFirst = reject; }) : Promise.resolve({ ok: true });
  const removal = store.useFavoriteBrands().toggle(brand);
  await store.useFavoriteBrands().toggle({ ...brand, id: 2 });
  rejectFirst(Error("offline"));
  await assert.rejects(removal, /offline/);
  assert.equal(store.useFavoriteBrands().isFavorite(1), true);
  assert.equal(store.useFavoriteBrands().isFavorite(2), true);

  const css = fs.readFileSync(path.join(root, "app/components/ui/LikeButton.module.css"), "utf8");
  assert.match(css, /width: 44px/); assert.match(css, /width: 24px/);
  assert.match(css, /\.button:hover \{ background: var\(--surface-hover\); \}/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /data-hover-fill-suppressed/);
  for (const file of ["app/components/ProductTile/ProductTile.tsx", "app/product/[id]/components/ProductInfoPanel.tsx", "app/brand/[slug]/BrandFavoriteButton.tsx", "app/account/components/AccountBrandsTab.tsx", "app/design-system/DesignSystemClient.tsx"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(source, /<LikeButton/); assert.doesNotMatch(source, /\/icons\/like(?:-filled)?\.svg/);
  }
  console.log("PASS: shared likes, immediate unlike, hover reset, pending/double-click guard, rollback/network errors, independent brands");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
