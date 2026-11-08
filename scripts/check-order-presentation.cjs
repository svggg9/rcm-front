/* eslint-disable @typescript-eslint/no-require-imports -- Offline regression for persisted order projections. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const testModule = { exports: {} };
const code = ts.transpileModule(fs.readFileSync("app/lib/order-presentation.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function("module", "exports", code)(testModule, testModule.exports);
const { buildOrderStatusLabel: label, orderPaymentStatusLabels: paymentLabels } = testModule.exports;
const schema = JSON.parse(fs.readFileSync("contracts/order-api.openapi.json", "utf8"));
assert.deepEqual(Object.keys(paymentLabels).sort(), [...schema.components.schemas.PaymentStatus.enum].sort());
const state = { status: "CONFIRMED", paymentStatus: "PAID", deliveryStatus: "PENDING" };
assert.equal(label({ ...state, status: "CANCELED", paymentStatus: "PENDING" }), "Отменён");
assert.equal(label({ ...state, status: "CANCELED", deliveryStatus: "IN_TRANSIT" }), "Отменён");
assert.equal(label({ ...state, paymentStatus: "REFUNDED", deliveryStatus: "DELIVERED" }), "Деньги возвращены");
assert.equal(label({ ...state, deliveryStatus: "CANCELLED" }), "Доставка отменена");
assert.equal(label({ ...state, deliveryStatus: "RETURNED" }), "Возвращён");
assert.equal(label({ ...state, paymentStatus: "PENDING" }), "Ожидает оплаты");
assert.equal(label(state), "Оформление доставки");
assert.equal(label({ ...state, deliveryStatus: "READY_FOR_SHIPMENT" }, "К отправке"), "К отправке");
assert.equal(label({ ...state, deliveryStatus: "READY_FOR_PICKUP" }), "Ожидает получения");
assert.equal(label({ ...state, deliveryStatus: "IN_TRANSIT" }), "В пути");
assert.equal(label({ ...state, deliveryStatus: "DELIVERED" }), "Доставлен");
console.log("PASS: cancelled unpaid order, completed refund, terminal delivery, fulfillment labels, payment filter enum parity");
