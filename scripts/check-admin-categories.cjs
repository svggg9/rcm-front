/* eslint-disable @typescript-eslint/no-require-imports -- Isolated category checks, no API writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");

function compile(relative, overrides = {}, suffix = "") {
  const filename = path.resolve(__dirname, "..", relative);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod.require = (name) => {
    if (name in overrides) return overrides[name];
    if (name.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    if (name.startsWith(".")) {
      const target = path.resolve(path.dirname(filename), name);
      const source = [target + ".ts", target + ".tsx"].find(fs.existsSync);
      if (source) return compile(path.relative(path.resolve(__dirname, ".."), source), overrides);
    }
    return Module.prototype.require.call(mod, name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8") + suffix, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}

function harness(relative, exports) {
  let index = 0;
  const states = [];
  const fakeReact = { ...React, useId: () => "category-test", useMemo: fn => fn(), useRef: value => ({ current: value }),
    useState(initial) {
      const id = index++;
      if (!(id in states)) states[id] = typeof initial === "function" ? initial() : initial;
      return [states[id], next => { states[id] = typeof next === "function" ? next(states[id]) : next; }];
    } };
  const ui = new Proxy({}, { get: (_, name) => name });
  const dependencies = { react: fakeReact };
  for (const component of ["ConfirmActionButton", "Button", "CabinetPanel", "EmptyState", "FormSelect", "StatusBadge", "Dialog", "Icon", "NumericField", "TextInput", "RequestError", "CategoryPicker", "Banner", "Price"]) {
    dependencies[`../../components/ui/${component}`] = ui;
  }
  const component = compile(relative, dependencies, `\nexport { ${exports} };`);
  return { states, render(name, props) { index = 0; return component[name](props); } };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [];
  return [tree, ...nodes(tree.props.children), ...nodes(tree.props.actions)];
}
function find(tree, predicate) { return nodes(tree).find(predicate); }
function category(id, label, parentId = null, extra = {}) {
  return { id, label, name: label, parentId, slug: "category-" + id, sortOrder: id, isActive: true,
    effectiveActive: true, productCount: 0, subtreeProductCount: 0, ...extra };
}

async function main() {
  const adminSource = ts.createSourceFile("AdminPageClient.tsx", fs.readFileSync(path.resolve(__dirname, "../app/admin/AdminPageClient.tsx"), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const name of ["AdminProductDetails", "AdminDictionariesTab"]) {
    assert.ok(adminSource.statements.some(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === `./components/${name}` &&
      node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) &&
      node.importClause.namedBindings.elements.some(binding => binding.name.text === name)), `${name} must retain a direct SSR import alongside the server Suspense boundary`);
    function rejectDynamicDeclaration(node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) assert.fail(`${name} must not reintroduce the dynamic hydration boundary`);
      ts.forEachChild(node, rejectDynamicDeclaration);
    }
    rejectDynamicDeclaration(adminSource);
  }
  const serverReads = [];
  const adminPage = compile("app/admin/page.tsx", {
    "next/navigation": { redirect: () => { throw new Error("Unexpected fixture redirect"); } },
    "../lib/session": { getServerSession: async () => { serverReads.push("session"); return { id: 1, role: "ADMIN" }; } },
    "./AdminPageClient": { AdminPageClient: "AdminPageClient" },
    "../components/ui/CabinetSkeleton": { CabinetPageSkeleton: "CabinetPageSkeleton" },
    "./lib/adminServerApi": { getAdminDictionaryServer: async kind => { serverReads.push(kind); return []; } },
  });
  const serverTree = adminPage.default({ searchParams: Promise.resolve({ tab: "dictionaries" }) });
  assert.equal(serverTree.type, React.Suspense, "The server route must establish a Suspense boundary synchronously, before async auth/data work");
  assert.deepEqual(serverReads, [], "Auth and category reads must not run above the established server boundary");
  assert.equal(serverTree.props.children.type.constructor.name, "AsyncFunction", "Async route data belongs below the server Suspense boundary");
  assert.equal(serverTree.props.fallback.type, "CabinetPageSkeleton");
  const serverContent = await serverTree.props.children.type(serverTree.props.children.props);
  assert.equal(serverContent.type, "AdminPageClient");
  assert.deepEqual(serverReads, ["session", "categories", "sizes"]);
  const clothing = category(1, "Одежда", null, { sortOrder: 2, subtreeProductCount: 7 });
  const shoes = category(2, "Обувь", null, { sortOrder: 1 });
  const shirt = category(3, "Футболки", 1, { name: "Одежда / Футболки", productCount: 7, subtreeProductCount: 7 });
  const offRoot = category(4, "Архив", null, { isActive: false, effectiveActive: false });
  const hiddenChild = category(5, "Скрытая", 4, { name: "Архив / Скрытая", isActive: true, effectiveActive: false });
  const categories = [clothing, shoes, shirt, offRoot, hiddenChild];
  const h = harness("app/admin/components/AdminDictionariesTab.tsx", "CategoryDictionary, CategoryEditor");
  const noop = async () => {};
  let tree = h.render("CategoryDictionary", { items: categories, actionKey: null, onCreate: noop, onUpdate: noop, onDelete: noop });
  const labels = nodes(tree).filter(node => node.type === "strong").map(node => node.props.children);
  assert.ok(labels.indexOf("Обувь") < labels.indexOf("Одежда"), "Backend order determines root order");
  const disabledConfirmation = find(tree, node => node.type === "ConfirmActionButton" && node.props.confirmTitle === "Отключить «Одежда»?");
  assert.match(disabledConfirmation.props.confirmText, /Связанных товаров: 7/);
  assert.match(disabledConfirmation.props.confirmText, /останутся доступны/);
  const hiddenConfirmation = find(tree, node => node.type === "ConfirmActionButton" && node.props.confirmTitle === "Отключить «Скрытая»?");
  assert.equal(hiddenConfirmation.props.children, "Отключить", "A hidden parent must not overwrite child's own enabled flag");
  tree = h.render("CategoryDictionary", { items: categories, actionKey: null, onCreate: noop, onUpdate: async () => { throw new Error("Не удалось включить категорию"); }, onDelete: noop });
  const enable = find(tree, node => node.type === "ConfirmActionButton" && node.props.confirmTitle === "Отключить «Архив»?");
  await assert.rejects(enable.props.onConfirm(), /Не удалось включить/);
  tree = h.render("CategoryDictionary", { items: categories, actionKey: null, onCreate: noop, onUpdate: noop, onDelete: noop });
  assert.equal(find(tree, node => node.type === "RequestError").props.message, "Не удалось включить категорию", "Immediate enabling errors remain visible without an open confirmation dialog");
  find(tree, node => node.type === "TextInput").props.onChange({ target: { value: "Футболки" } });
  tree = h.render("CategoryDictionary", { items: categories, actionKey: null, onCreate: noop, onUpdate: noop, onDelete: noop });
  assert.deepEqual(nodes(tree).filter(node => node.type === "strong").map(node => node.props.children), ["Одежда", "Футболки"], "Search retains matching ancestor context");

  const editor = harness("app/admin/components/AdminDictionariesTab.tsx", "CategoryEditor");
  let saved;
  const editorProps = { item: shirt, parentId: 1, categories, busy: false, onClose() {}, onSave: async payload => { saved = payload; } };
  tree = editor.render("CategoryEditor", editorProps);
  find(tree, node => node.type === "TextInput").props.onChange({ target: { value: "  Майки  " } });
  find(tree, node => node.type === "FormSelect").props.onChange("root");
  tree = editor.render("CategoryEditor", editorProps);
  await find(tree, node => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.deepEqual(saved, { name: "Майки", parentId: null, sortOrder: 3, isActive: true }, "Saving uses a local name and explicit null for a move to root");
  saved = undefined;
  find(tree, node => node.type === "TextInput").props.onChange({ target: { value: "Путь / Название" } });
  tree = editor.render("CategoryEditor", editorProps);
  await find(tree, node => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(saved, undefined, "A manually entered path must never become a category name");

  const duplicateEditor = harness("app/admin/components/AdminDictionariesTab.tsx", "CategoryEditor");
  const duplicateProps = { parentId: 1, categories, busy: false, onClose() {}, onSave: async payload => { saved = payload; } };
  tree = duplicateEditor.render("CategoryEditor", duplicateProps);
  find(tree, node => node.type === "TextInput").props.onChange({ target: { value: "футболки" } });
  tree = duplicateEditor.render("CategoryEditor", duplicateProps);
  assert.match(find(tree, node => node.type === "TextInput").props.error, /уже есть/);
  await find(tree, node => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(saved, undefined, "Same-name siblings cannot be submitted");

  const moderation = harness("app/admin/components/AdminProductDetails.tsx", "");
  let assignment;
  const moderationProps = { product: { id: 90, categoryId: 5, category: hiddenChild.name, suggestedCategoryName: "Сумки через плечо", variants: [], images: [], status: "MODERATION" },
    categories, actionProductId: null, onBack() {}, onApprove() {}, onReturnToRevision() {}, onBlock() {}, onUnblock() {}, onAssignCategory: async payload => { assignment = payload; } };
  tree = moderation.render("AdminProductDetails", moderationProps);
  assert.equal(find(tree, node => node.type === "CategoryPicker").props.allowCustomValue, false);
  assert.equal(find(tree, node => node.type === "Button" && node.props.children === "Создать и привязать").props.disabled, true, "Moderation cannot accidentally create an unclassified root");
  find(tree, node => node.type === "FormSelect").props.onChange("root");
  tree = moderation.render("AdminProductDetails", moderationProps);
  find(tree, node => node.type === "Button" && node.props.children === "Создать и привязать").props.onClick();
  await Promise.resolve();
  assert.deepEqual(assignment, { categoryName: "Сумки через плечо", parentId: null }, "Root creation requires an explicit choice");

  const unavailableModeration = harness("app/admin/components/AdminProductDetails.tsx", "");
  let retriedCategories = 0;
  let blockedWrites = 0;
  const unavailableProps = { ...moderationProps, categories: [], categoryError: "Не удалось загрузить категории", categoryLoading: false,
    onRetryCategories: () => { retriedCategories++; }, onAssignCategory: async () => { blockedWrites++; } };
  tree = unavailableModeration.render("AdminProductDetails", unavailableProps);
  let unavailablePicker = find(tree, node => node.type === "CategoryPicker");
  assert.equal(unavailablePicker.props.currentLabel, hiddenChild.name, "Current category context survives an empty/error dictionary");
  assert.equal(unavailablePicker.props.value, 5);
  assert.equal(unavailablePicker.props.error, "Не удалось загрузить категории");
  assert.equal(unavailablePicker.props.disabled, true);
  unavailablePicker.props.onRetry();
  assert.equal(retriedCategories, 1, "The local picker exposes a category-only retry");
  find(tree, node => node.type === "FormSelect").props.onChange("root");
  tree = unavailableModeration.render("AdminProductDetails", unavailableProps);
  const blockedCreate = find(tree, node => node.type === "Button" && node.props.children === "Создать и привязать");
  assert.equal(blockedCreate.props.disabled, true, "A valid new name/root cannot bypass a failed category dictionary");
  blockedCreate.props.onClick();
  assert.equal(blockedWrites, 0);
  tree = unavailableModeration.render("AdminProductDetails", { ...unavailableProps, categoryError: null, categoryLoading: true, categories });
  unavailablePicker = find(tree, node => node.type === "CategoryPicker");
  assert.equal(unavailablePicker.props.loading, true);
  assert.equal(unavailablePicker.props.disabled, true);
  find(tree, node => node.type === "Button" && node.props.children === "Создать и привязать").props.onClick();
  assert.equal(blockedWrites, 0, "Pending category reads also block category creation");

  const { createCategoryReadCoordinator } = compile("app/admin/lib/categoryReadCoordinator.ts");
  function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
  }
  const gates = [];
  let nextGate = 0;
  let snapshot = ["initial"];
  let loaded = true;
  let readLoading = false;
  let readError = null;
  let readErrors = 0;
  const reader = createCategoryReadCoordinator(() => gates[nextGate++].promise, value => {
    snapshot = value; loaded = true; readError = null; readLoading = false;
  });
  const onError = reason => { loaded = false; readError = reason.message; readErrors++; readLoading = false; };
  const read = options => { readLoading = true; return reader.read(options); };
  const oldGet = deferred(), afterMutation = deferred();
  gates.push(oldGet, afterMutation);
  const beforeMutationRead = read({ onError });
  await Promise.resolve();
  reader.invalidate();
  readLoading = false;
  snapshot = ["confirmed mutation DTO"];
  loaded = false;
  const currentRead = read({ onError });
  await Promise.resolve();
  afterMutation.resolve(["fresh tree"]);
  assert.equal(await currentRead, true);
  oldGet.resolve(["outdated tree"]);
  assert.equal(await beforeMutationRead, false);
  assert.deepEqual(snapshot, ["fresh tree"], "An old tab/ensure GET cannot roll back a confirmed mutation and its newer refresh");
  assert.equal(loaded, true);
  assert.equal(readLoading, false);

  const oldSuccess = deferred(), latestFailure = deferred();
  gates.push(oldSuccess, latestFailure);
  const olderSameRevision = read({ onError });
  const newestSameRevision = read({ onError });
  await Promise.resolve();
  latestFailure.reject(new Error("Refresh failed"));
  assert.equal(await newestSameRevision, false);
  oldSuccess.resolve(["stale result that would hide error"]);
  assert.equal(await olderSameRevision, false);
  assert.deepEqual(snapshot, ["fresh tree"]);
  assert.equal(readError, "Refresh failed", "A stale success must not clear a newer refresh error");
  assert.equal(loaded, false, "A stale success must not mark categories loaded");

  const staleFailure = deferred(), latestSuccess = deferred();
  gates.push(staleFailure, latestSuccess);
  const staleFailingRead = read({ onError });
  await Promise.resolve();
  reader.invalidate();
  readLoading = false;
  const finalRead = read({ onError });
  await Promise.resolve();
  latestSuccess.resolve(["latest tree"]);
  await finalRead;
  staleFailure.reject(new Error("stale network error"));
  assert.equal(await staleFailingRead, false);
  assert.equal(readErrors, 1, "A stale failure must not publish an error or reset loaded state");
  assert.equal(readError, null);
  assert.equal(loaded, true);
  assert.equal(readLoading, false);

  const sharedGate = deferred(), replacementGate = deferred();
  gates.push(sharedGate, replacementGate);
  const shared = read({ reusePending: true, onError });
  assert.equal(read({ reusePending: true, onError }), shared, "Ensure calls deduplicate only the current revision");
  await Promise.resolve();
  reader.invalidate();
  readLoading = false;
  const replacement = read({ reusePending: true, onError });
  assert.notEqual(replacement, shared, "A confirmed mutation cannot reuse a pending GET from the old revision");
  await Promise.resolve();
  sharedGate.resolve(["before invalidate"]);
  await shared;
  assert.equal(readLoading, true, "A stale completion cannot stop the latest category loading indicator");
  replacementGate.resolve(["replacement"]);
  await replacement;
  assert.deepEqual(snapshot, ["replacement"]);

  const responses = [];
  const calls = [];
  const api = compile("app/admin/lib/adminApi.ts", { "../../lib/api": { API_URL: "http://fixture.invalid", apiFetch: async (url, options) => {
    calls.push({ url, options });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next;
  } } });
  responses.push(new Response(JSON.stringify(shirt), { status: 200 }));
  await api.updateAdminDictionaryItem("categories", 3, { name: "Майки", parentId: null });
  assert.deepEqual(JSON.parse(calls.at(-1).options.body), { name: "Майки", parentId: null });
  responses.push(new Response(JSON.stringify({ code: "BAD_REQUEST", message: "В этом разделе уже есть такая категория" }), { status: 409 }));
  await assert.rejects(api.createAdminDictionaryItem("categories", { name: "Футболки", parentId: 1 }), /В этом разделе уже есть/);
  responses.push(new Response('<html>private upstream details</html>', { status: 502 }));
  await assert.rejects(api.deleteAdminDictionaryItem("categories", 3), error => error.message === "Не удалось отключить категорию");
  responses.push(new TypeError("network internal details"));
  await assert.rejects(api.assignProductCategory(9, 3), error => error.message === "Не удалось связаться с сервером — попробуйте ещё раз");
  responses.push(new Response(JSON.stringify({ code: "BAD_REQUEST", message: "Выберите доступную категорию" }), { status: 400 }));
  await assert.rejects(api.approveProduct(9), error => error.message === "Выберите доступную категорию", "Moderation category rules use safe, readable copy");
  responses.push(new Response(JSON.stringify({ code: "BAD_REQUEST", message: "Допустимо уровней категорий: 3" }), { status: 400 }));
  await assert.rejects(api.createAdminDictionaryItem("categories", { name: "Fourth", parentId: 3 }), error => error.message === "Не больше трёх уровней категорий");
  responses.push(new Response(JSON.stringify([{ id: 1, name: "Legacy without tree contract" }]), { status: 200 }));
  await assert.rejects(api.getAdminDictionary("categories"), error => error.message === "Не удалось прочитать категории — попробуйте ещё раз");
  console.log("Admin category checks passed: tree/search, parent writes, moderation/errors and deferred GET/mutation revision races");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
