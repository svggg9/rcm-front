/* eslint-disable @typescript-eslint/no-require-imports -- Offline contract/UI regression, no integrations or data writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const jsx = require("react/jsx-runtime");
const { renderToStaticMarkup } = require("react-dom/server");
function load(file, imports = {}) {
  const testModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { fileName: file, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  new Function("module", "exports", "require", code)(testModule, testModule.exports, name => {
    if (name === "react") return React;
    if (name === "react/jsx-runtime") return jsx;
    if (name.endsWith(".css")) return { default: {} };
    if (name in imports) return imports[name];
    throw Error(`Unexpected dependency ${name} in ${file}`);
  });
  return testModule.exports;
}
const contract = load("app/lib/order-contract.ts");
const hooks = load("app/lib/useOrderActions.ts", { "./order-contract": contract });
const action = (code, allowed, extra = {}) => ({ code, allowed, reason: allowed ? null : "Проверка оплаты", reasonCode: allowed ? null : "PAYMENT_REVIEW", scope: "ORDER", availableUntil: null, ...extra });
const workflow = actions => ({ version: 1, audience: "BUYER", evaluatedAt: new Date().toISOString(), events: [], actions });
const base = { id: 1, orderGroupId: "group", status: "NEW", paymentStatus: "PENDING", deliveryStatus: "PENDING", items: [], totalAmount: 100, createdAt: new Date().toISOString(), deliveryMethod: "PICKUP_POINT", currency: "RUB" };
assert.equal(contract.orderAction(base, "PAY").allowed, false);
assert.equal(contract.orderAction({ workflow: { ...workflow([]), version: 2 } }, "PAY").allowed, false);
assert.equal(contract.orderAction({ workflow: workflow([]) }, "REFUND").allowed, false);
for (const until of ["2026-11-07T12:00:00Z", "invalid"]) {
  assert.equal(contract.orderAction({ workflow: workflow([action("PAY", true, { availableUntil: until })]) }, "PAY", Date.parse("2026-11-07T12:00:00Z")).allowed, false);
}
assert.equal(contract.orderAction({ workflow: workflow([action("PAY", true, { availableUntil: "2026-11-07T12:00:01Z" })]) }, "PAY", Date.parse("2026-11-07T12:00:00Z")).allowed, true);
assert.equal(contract.orderAction({ ...base, workflow: workflow([action("PAY", false)]) }, "PAY").allowed, false);

const button = ({ children, onClick, disabled }) => jsx.jsx("button", { onClick, disabled, children });
const wrapper = ({ children }) => jsx.jsx("div", { children });
const shared = {
  "../../lib/useOrderActions": hooks,
  "../../components/ui/Button": { Button: button },
  "../../components/order-detail/OrderWorkflowSummary": { OrderWorkflowSummary: () => null },
  "../../lib/delivery": { formatCdekShipmentStatus: String },
  "../../lib/phone": { formatRussianPhone: String },
};
const admin = load("app/admin/components/AdminOrderDetails.tsx", { ...shared,
  "../../components/ui/ConfirmActionButton": { useConfirmation: () => ({ confirm: async () => true, confirmation: null }) },
  "../../components/ui/StatusBadge": { StatusBadge: wrapper },
  "../../components/ui/RequestError": { RequestError: wrapper },
  "../../lib/order-contract": contract,
  "../../components/order-detail/OrderDetail": { orderDetailStyles: {}, OrderDetailField: wrapper, OrderDetailFields: wrapper,
    OrderDetailLayout: ({ main, aside }) => jsx.jsxs("div", { children: [main, aside] }), OrderDetailPanelFields: wrapper, OrderDetailProductList: wrapper, OrderDetailSection: wrapper, OrderDetailSummary: wrapper },
  "./AdminReturnRequests": { AdminReturnRequests: () => null },
});
const props = { refunding: false, deliveryCancelling: false, onRefund: async () => {}, onCancelDelivery: async () => {},
  formatOrderStatus: String, formatPaymentStatus: String, formatDeliveryStatus: String, buildStatusLabel: () => "Заказ" };
const renderAdmin = actions => renderToStaticMarkup(jsx.jsx(admin.AdminOrderDetails, { ...props, order: { ...base, paymentStatus: "PAID", workflow: workflow(actions) } }));
assert(!renderAdmin([action("REFUND", false), action("CANCEL_DELIVERY", false)]).includes("Вернуть оплату"));
const allowedAdmin = renderAdmin([action("REFUND", true), action("CANCEL_DELIVERY", true)]);
assert(allowedAdmin.includes("Вернуть оплату"));
const panel = load("app/seller/components/OrderDetailsPanel.tsx", { ...shared,
  "next/image": { default: () => null }, "../../components/ui/Banner": { Banner: wrapper },
  "../../components/ui/CabinetSkeleton": { CabinetSkeleton: () => null },
  "../../components/ui/DesignSystemIcon": { DesignSystemIcon: () => null },
  "../../components/ui/StatusBadge": { StatusBadge: wrapper }, "../../lib/api": { API_URL: "" },
  "../lib/sellerTasks": { shippingDeadline: () => undefined },
});
const renderSeller = actions => renderToStaticMarkup(jsx.jsx(panel.OrderDetailsPanel, {
  order: base, details: { ...base, delivery: { requestId: "uuid" }, workflow: workflow(actions) }, audience: "seller", showDeliveryLabel: true,
}));
assert(!renderSeller([action("DOWNLOAD_LABEL", false)]).includes("delivery-label"));
assert(renderSeller([action("DOWNLOAD_LABEL", true)]).includes("/api/seller/orders/1/delivery-label"));

const backend = path.resolve("../../rcm/contracts/order-api.openapi.json");
if (fs.existsSync(backend)) assert.equal(fs.readFileSync(backend, "utf8"), fs.readFileSync("contracts/order-api.openapi.json", "utf8"));
console.log("PASS: absent/unknown contract fails closed, deadlines and malformed dates, server denial overrides status, operator refund and seller label gates, backend schema parity");
