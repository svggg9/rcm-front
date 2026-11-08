/* eslint-disable @typescript-eslint/no-require-imports -- Offline finance presentation and recovery regression. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const { renderToStaticMarkup } = require("react-dom/server");

function load(file, imports = {}, extra = "") {
  const loadedModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8") + extra, {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("module", "exports", "require", code)(loadedModule, loadedModule.exports, name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected fixture import: ${name}`);
    return imports[name];
  });
  return loadedModule.exports;
}

const presentation = load("app/seller/lib/sellerFinancePresentation.ts");
const apiErrors = load("app/lib/apiErrors.ts");
for (const value of [undefined, null, "", "not a date", "2026-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "2026-00-01", "2026-10-00", "2026-10-29T10:00:00Z"]) {
  assert.equal(presentation.formatFinanceDate(value), "—");
  assert.equal(presentation.formatFinanceDate(value, ""), "");
}
assert.equal(presentation.formatFinanceDate("2028-02-29"), "29.02.2028");
assert.equal(presentation.formatFinanceDate("2026-10-29"), "29.10.2026");
for (const value of [undefined, null, "", "not a date", "2026-10-29", "2026-02-30T10:00:00Z", "2026-10-29T24:00:00Z", "2026-10-29T10:60:00Z", "2026-10-29T10:00:60Z", "2026-10-29T10:00:00", "2026-10-29T10:00:00+99:99"]) {
  assert.equal(presentation.formatFinanceDateTime(value), "—");
}
assert.match(presentation.formatFinanceDateTime("2026-10-29T23:30:00Z"), /30\.10\.2026.*02:30/);
assert.match(presentation.formatFinanceDateTime("2026-10-29T23:30:00+03:00"), /29\.10\.2026.*23:30/);
assert.match(presentation.formatFinanceDateTime("2026-10-29T10:00:00.123456789Z"), /29\.10\.2026.*13:00/);

const { EmptyState } = load("app/components/ui/EmptyState.tsx", {
  "react/jsx-runtime": jsx, "./Icon": { Icon: () => jsx.jsx("svg", {}) },
});
const { Button } = load("app/components/ui/Button.tsx", { "react/jsx-runtime": jsx, "./Button.module.css": { default: {} } });
const { RequestError } = load("app/components/ui/RequestError.tsx", {
  "react/jsx-runtime": jsx, "./Button": { Button }, "./EmptyState": { EmptyState },
  "./Icon": { Icon: () => jsx.jsx("svg", {}) }, "./RequestError.module.css": { default: {} },
});
const link = ({ children, ...props }) => jsx.jsx("a", { ...props, children });
const modalLifecycle = load("app/components/ui/useModalDialog.ts", {
  react: require("react"), "./modalScrollLock": load("app/components/ui/modalScrollLock.ts"),
});
const financeImports = {
  "react/jsx-runtime": jsx, react: require("react"), "next/link": { default: link },
  "next/navigation": { useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push() {}, replace() {} }) },
  "../../components/ui/NumericInput": { NumericInput: () => null }, "../../components/ui/Button": { Button },
  "../../components/ui/DataTable": load("app/components/ui/DataTable.tsx", { "react/jsx-runtime": jsx }),
  "../../components/ui/CabinetPanel": { CabinetPanel: ({ children }) => jsx.jsx("div", { children }) },
  "../../components/ui/SectionHeader": { SectionHeader: ({ title }) => jsx.jsx("h1", { children: title }) },
  "../../components/ui/CabinetListLayout.module.css": { default: {} },
  "../../components/ui/CabinetSkeleton": { CabinetSkeleton: () => jsx.jsx("div", { role: "status" }) },
  "../../components/ui/Banner": { Banner: ({ children }) => jsx.jsx("aside", { children }) },
  "../../components/ui/Icon": { Icon: () => jsx.jsx("svg", {}) },
  "../../components/ui/RequestError": { RequestError }, "../../components/ui/useModalDialog": modalLifecycle,
  "../../lib/apiErrors": apiErrors,
  "../lib/sellerFinanceApi": {}, "../lib/sellerFinancePresentation": presentation, "./SellerFinanceTab.module.css": { default: {} },
};
const { SellerFinanceTab } = load("app/seller/components/SellerFinanceTab.tsx", financeImports);
const summary = {
  availableAmount: 1234, processingAmount: 0, inPayoutAmount: 0, failedPayoutAmount: 0, nextPayoutAmount: 1234,
  reconciliationDifference: 0, operations: [], payouts: [], nextPayout: null, nextPayoutDate: null, bankDetailsReady: true,
  paidThisMonthAmount: 0, estimatedBalance: 1234, salesAmount: 1234, commissionAmount: 0, adjustmentsAmount: 0, paidOutAmount: 0,
};
function overview(overrides = {}, props = {}) {
  return renderToStaticMarkup(jsx.jsx(SellerFinanceTab, { finance: { ...summary, ...overrides }, ...props }));
}
const missing = overview();
assert.ok(missing.includes("Дата следующего реестра пока не назначена"));
assert.ok(missing.includes("Сумма и дата могут измениться до формирования выплаты"));
assert.ok(!missing.includes("Invalid Date") && !missing.includes("Ориентир — —"));
assert.ok(overview({ nextPayoutDate: "2026-02-30" }).includes("Дата следующего реестра пока не назначена"));
assert.ok(overview({ nextPayoutDate: "2026-10-29" }).includes("Ориентир — 29.10.2026"));
const actualWithoutDate = overview({ nextPayoutDate: "2026-10-29", nextPayout: { id: 7, status: "READY", payoutAmount: 100, scheduledDate: null, checkingAccount: "test" } });
assert.ok(actualWithoutDate.includes("Плановая дата пока не назначена"));
assert.ok(!actualWithoutDate.includes("29.10.2026"), "An actual payout never borrows an estimated date");
const retained = overview({}, { loading: true, error: jsx.jsx("p", { role: "alert", children: "Не удалось обновить финансовые данные" }) });
assert.ok(retained.includes("Не удалось обновить финансовые данные") && retained.includes("Доступно к выплате"));
assert.ok(retained.includes("1 234,00"), "Confirmed figures remain visible during refresh failure");

const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function verifyHookRecovery() {
  const state = [], effects = [], requests = [];
  let index = 0, pending = [], currentPath = "operations?page=0";
  const hooks = {
    useState(initial) {
      const position = index++;
      if (!(position in state)) state[position] = initial;
      return [state[position], next => { state[position] = typeof next === "function" ? next(state[position]) : next; }];
    },
    useEffect(effect, dependencies) {
      const position = index++, old = effects[position];
      if (!old || dependencies.some((item, i) => item !== old.dependencies[i])) pending.push(() => {
        old?.cleanup?.(); effects[position] = { dependencies, cleanup: effect() };
      });
    },
  };
  const source = load("app/seller/components/SellerFinanceTab.tsx", {
    ...financeImports, react: hooks,
    "../lib/sellerFinanceApi": { getFinanceData: (path, signal) => { const request = { ...deferred(), path, signal }; requests.push(request); return request.promise; } },
  }, "\nexport { useFinanceData };\n");
  function render() { index = 0; pending = []; const result = source.useFinanceData(currentPath); for (const work of pending) work(); return result; }
  const first = render(); assert.equal(first.loading, true);
  const confirmed = { content: [{ id: 51 }], totalElements: 1, totalPages: 1, number: 0 };
  requests[0].resolve(confirmed); await tick();
  let view = render(); assert.equal(view.data, confirmed); assert.equal(view.loading, false);
  view.retry(); view = render(); assert.equal(view.data, confirmed); assert.equal(view.loading, true);
  requests[1].reject(new TypeError("private transport details")); await tick();
  view = render(); assert.equal(view.data, confirmed); assert.equal(view.error, "Не удалось загрузить финансовые данные — попробуйте ещё раз"); assert.equal(view.loading, false);
  view.retry(); render(); const stale = requests[2];
  currentPath = "operations?page=1"; view = render();
  assert.equal(stale.signal.aborted, true); assert.equal(view.data, undefined, "Other filters do not display a previous page as current");
  stale.resolve({ content: [{ id: 999 }] }); await tick();
  requests[3].resolve({ content: [{ id: 52 }], totalElements: 2, totalPages: 2, number: 1 }); await tick();
  view = render(); assert.equal(view.data.content[0].id, 52); assert.equal(view.error, undefined);
  const authorizedData = view.data;
  view.retry(); render();
  requests.at(-1).reject(new apiErrors.ApiRequestError("Сервис временно недоступен", "http", 503)); await tick();
  view = render(); assert.equal(view.data, authorizedData, "A temporary server failure retains confirmed data");
  for (const [status, message] of [[401, "Войдите в аккаунт ещё раз"], [403, "Недостаточно прав для этого действия"]]) {
    view.retry(); render();
    requests.at(-1).reject(new apiErrors.ApiRequestError(message, "http", status)); await tick();
    view = render(); assert.equal(view.data, undefined, `HTTP ${status} clears data that is no longer accessible`);
    assert.equal(view.error, message); assert.equal(view.loading, false);
    view.retry(); render(); requests.at(-1).resolve(authorizedData); await tick();
    view = render(); assert.equal(view.data, authorizedData, "A successful authorized request restores the view");
  }
}

async function verifyApiErrors() {
  const errors = load("app/lib/apiErrors.ts");
  const calls = [];
  let mode = "success";
  const transport = load("app/lib/apiRequest.ts", {
    "./apiErrors": errors,
    "./api": { apiFetch: async (url, options) => {
      calls.push({ url, options });
      if (mode === "network") throw new TypeError("private endpoint and network stack");
      if (mode === "timeout") throw new DOMException("private timeout", "TimeoutError");
      if (mode === "abort") throw new DOMException("cancelled", "AbortError");
      if (mode === "json") return new Response("malformed private body", { status: 200, headers: { "Content-Type": "application/json" } });
      if (mode === "html") return new Response("<html>private upstream stack</html>", { status: 502 });
      if (mode === "404") return Response.json({ message: "private resource detail" }, { status: 404 });
      if (mode === "csv") return new Response("Дата,Сумма\n2026-10-29,100", { headers: { "Content-Type": "text/csv" } });
      if (mode === "blob") { const response = new Response("csv"); response.blob = async () => { throw new TypeError("private stream failure"); }; return response; }
      if (mode === "blob-timeout" || mode === "blob-abort") {
        const response = new Response("csv");
        response.blob = () => new Promise((resolve, reject) => {
          const guard = setTimeout(() => reject(new Error("Fixture abort did not arrive")), 1000);
          const fail = () => { clearTimeout(guard); reject(new DOMException("private body cancellation", "AbortError")); };
          if (options.signal.aborted) fail();
          else options.signal.addEventListener("abort", fail, { once: true });
        });
        return response;
      }
      return Response.json({ content: [], totalElements: 0, totalPages: 0, number: 0 });
    } },
  });
  const api = load("app/seller/lib/sellerFinanceApi.ts", {
    "../../lib/api": { API_URL: "https://fixture.invalid" },
    "../../lib/apiRequest": { requestApiResponse: (url, options, fallback) => transport.requestApiResponse(url, options, fallback, mode === "blob-timeout" ? 1 : 20_000) },
    "../../lib/apiErrors": errors,
  });
  const controller = new AbortController();
  assert.deepEqual(await api.getFinanceData("operations", controller.signal), { content: [], totalElements: 0, totalPages: 0, number: 0 });
  for (const failure of ["network", "timeout", "json", "html", "404"]) {
    mode = failure;
    await assert.rejects(api.getFinanceData("operations", controller.signal), error => {
      assert.ok(error instanceof errors.ApiRequestError);
      assert.ok(!/private|SyntaxError|TypeError|<html>/.test(error.message));
      if (failure === "404") assert.equal(error.status, 404);
      if (failure === "html") assert.equal(error.status, 502);
      if (failure === "json") assert.equal(error.kind, "invalid-response");
      return true;
    });
  }
  for (const failure of ["network", "html", "blob"]) {
    mode = failure;
    await assert.rejects(api.exportFinanceOperations("page=0", controller.signal), error => {
      assert.ok(error instanceof errors.ApiRequestError); assert.ok(!error.message.includes("private")); return true;
    });
  }
  mode = "csv"; assert.equal(await (await api.exportFinanceOperations("page=0", controller.signal)).text(), "Дата,Сумма\n2026-10-29,100");
  mode = "blob-timeout";
  await assert.rejects(api.exportFinanceOperations("page=0", controller.signal), error => error instanceof errors.ApiRequestError && error.kind === "timeout");
  mode = "blob-abort";
  const bodyController = new AbortController();
  const bodyRequest = api.exportFinanceOperations("page=0", bodyController.signal);
  const cancelled = assert.rejects(bodyRequest, error => error.name === "AbortError");
  await tick(); bodyController.abort(); await cancelled;
  mode = "abort"; controller.abort();
  await assert.rejects(api.getFinanceData("operations", controller.signal), error => error.name === "AbortError");
  assert.ok(calls.every(call => !call.options.method || call.options.method === "GET"), "Error handling sends no mutations");
}

async function run() {
  await verifyHookRecovery(); await verifyApiErrors();
  console.log("PASS: finance calendar dates/timestamps, absent payout dates, confirmed data/retry/abort, safe finance GET and CSV errors");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
