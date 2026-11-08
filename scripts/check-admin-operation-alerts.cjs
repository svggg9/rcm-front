/* eslint-disable @typescript-eslint/no-require-imports -- Offline API/SSR regression; no live mutations. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const React = require("react");
const jsx = require("react/jsx-runtime");
const { renderToStaticMarkup: render } = require("react-dom/server");

function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { fileName: file, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const target = { exports: {} };
  new Function("module", "exports", "require", code)(target, target.exports, name => {
    if (name === "react") return React;
    if (name === "react/jsx-runtime") return jsx;
    assert(name in deps, `Unexpected import ${name}`);
    return deps[name];
  });
  return target.exports;
}

const model = load("app/admin/lib/adminOperationAlerts.ts");
const record = (kind, reason, level, orderId, operationId) => ({
  kind, reason, level, orderId, operationId, status: "PENDING", referenceAt: "2026-11-07T00:00:00Z",
});
const data = { summary: { payments: 1, refunds: 1, deliveries: 1 }, number: 0, size: 10, totalElements: 3, totalPages: 1,
  content: [record("payment", "PAYMENT_REVIEW", "review", 11, null),
    record("refund", "REFUND_SENDING_STALE", "waiting", 12, 33),
    record("delivery", "DELIVERY_FAILED", "error", 13, 44)] };
assert(model.isAdminOperationAlertPage(data));
assert(model.isAdminOperationAlertPage({ ...data, content: [{ ...data.content[0], reason: "NEW_SERVER_REASON" }] }));
for (const bad of [null, {}, { ...data, summary: { ...data.summary, refunds: -1 } },
  { ...data, totalElements: 0 }, { ...data, size: 0 }, { ...data, size: 101 },
  { ...data, content: [{ ...data.content[0], orderId: 0 }] },
  { ...data, content: [{ ...data.content[0], operationId: -1 }] },
  { ...data, content: [{ ...data.content[0], referenceAt: "invalid" }] },
  { ...data, content: [{ ...data.content[0], level: "unexpected" }] }]) {
  assert(!model.isAdminOperationAlertPage(bad), "Malformed data must not be treated as a valid empty queue");
}
assert.equal(model.operationAlertDescription("constructor"), "Операция требует проверки");
assert.equal(model.operationAlertQueue("payment").href, "/admin?tab=orders&orderView=payments");
assert.equal(model.operationAlertQueue("refund").href, "/admin?tab=orders&orderView=refunds");
assert.equal(model.operationAlertQueue("delivery").href, "/admin?tab=delivery&shipmentStatus=ALL");

const css = { default: new Proxy({}, { get: (_, key) => key }) };
const Link = ({ children, ...props }) => jsx.jsx("a", { ...props, children });
let resource = { data, loading: false, refresh() {} };
let requestedPath;
const { AdminOperationAlerts } = load("app/admin/components/AdminOperationAlerts.tsx", {
  "next/link": { default: Link },
  "../../components/ui/Button": { Button: ({ children }) => jsx.jsx("button", { children }) },
  "../../components/ui/StatusBadge": { StatusBadge: ({ children }) => jsx.jsx("span", { children }) },
  "../lib/workspaceApi": { adminDate: value => value, useAdminResource: path => { requestedPath = path; return resource; } },
  "../lib/adminOperationAlerts": model,
  "./AdminWorkspaceControls": { AdminPageControls: () => null,
    AdminResourceState: ({ error }) => error ? jsx.jsx("p", { children: error }) : null },
  "./AdminWorkspace.module.css": css, "./AdminOverview.module.css": css,
});
const html = render(jsx.jsx(AdminOperationAlerts, {}));
assert.equal(requestedPath, "operation-alerts?page=0&size=10");
for (const label of ["Платёж требует сверки", "Отправка возврата долго не подтверждена", "Ошибка оформления доставки",
  'href="/admin?tab=orders&amp;orderId=11"', 'href="/admin?tab=orders&amp;orderView=refunds&amp;refundId=33"', 'href="/admin?tab=delivery&amp;shipmentStatus=ALL&amp;q=13"']) assert(html.includes(label));
assert(!html.includes("Отправить возврат") && !html.includes("Повторить"), "Diagnostic summary must not perform payment actions");
resource = { data: undefined, loading: false, error: "Не удалось загрузить данные админки", refresh() {} };
const errorHtml = render(jsx.jsx(AdminOperationAlerts, {}));
assert(errorHtml.includes("Не удалось загрузить данные админки"));
assert(!errorHtml.includes("Операций, требующих проверки, нет") && !errorHtml.includes("Оплаты: 0"));
resource = { data: { ...data, summary: { payments: 0, refunds: 0, deliveries: 0 }, content: [], totalElements: 0, totalPages: 0 }, loading: false, refresh() {} };
assert(render(jsx.jsx(AdminOperationAlerts, {})).includes("Операций, требующих проверки, нет"));
resource = { data: { ...data, content: [record("delivery", "DELIVERY_NOT_REGISTERED", "waiting", 14, null)] }, loading: false, refresh() {} };
const noShipment = render(jsx.jsx(AdminOperationAlerts, {}));
assert(noShipment.includes('href="/admin?tab=orders&amp;orderId=14"') && !noShipment.includes('shipmentStatus=ALL'));
const preview = render(jsx.jsx(AdminOperationAlerts, { sample: data }));
assert.equal(requestedPath, null, "Design-system preview must not request live admin data");
assert(preview.includes('href="#operation-alerts"') && !preview.includes('/admin?tab='));
console.log("PASS: operation-alert contract, unknown reason safety, correct links, empty/error distinction and read-only UI");
