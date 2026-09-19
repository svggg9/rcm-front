/* eslint-disable @typescript-eslint/no-require-imports -- Read-only TSX render runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
require.extensions[".css"] = module => { module.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }; };
for (const extension of [".ts", ".tsx"]) require.extensions[extension] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
};
const { orderTask, returnTask, productTask, shippingDeadline, getSellerTasks } = require("../app/seller/lib/sellerTasks.ts");
const { SellerTaskRow } = require("../app/seller/components/SellerHomeTasks.tsx");
const { OrderDetailsPanel } = require("../app/seller/components/OrderDetailsPanel.tsx");
const { TextInput } = require("../app/components/ui/TextInput.tsx");
const { Icon } = require("../app/components/ui/Icon.tsx");
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const item = { productId: 1, variantId: 1, productTitle: "Рубашка", brandName: "Бренд", imageUrl: null, size: "M", color: "Чёрный", quantity: 1, price: 990.25, lineTotal: 990.25 };
const order = { id: 10, status: "PROCESSING", paymentStatus: "PAID", deliveryStatus: "READY_FOR_SHIPMENT", paidAt: "2026-09-09T10:00:00+03:00", createdAt: "2026-08-01T00:00:00Z", items: [item], totalAmount: 1040.25, currency: "RUB", recipientName: "Получатель" };
assert.equal(shippingDeadline(order.paidAt), "2026-09-12T07:00:00.000Z");
assert.equal(shippingDeadline(null), undefined);
assert.equal(shippingDeadline("bad"), undefined);
assert.equal(orderTask({ ...order, paidAt: null }).dueAt, undefined); // Never use createdAt as payment time.
for (const status of ["CANCELED", "COMPLETED", "SHIPPED"]) assert.equal(orderTask({ ...order, status }), null);
for (const deliveryStatus of ["CANCELLED", "RETURNED", "IN_TRANSIT", "DELIVERED", "READY_FOR_PICKUP"]) assert.equal(orderTask({ ...order, deliveryStatus }), null);
for (const paymentStatus of ["PENDING", "FAILED", "REFUNDED", "CANCELED"]) assert.equal(orderTask({ ...order, paymentStatus }), null);
assert.equal(orderTask({ ...order, status: "CONFIRMED", deliveryStatus: "PENDING" }), null);
const task = orderTask(order);
assert.match(render(SellerTaskRow, { task, now: Date.parse("2026-09-13T00:00:00Z") }), /Срок отправки истёк/);
assert.doesNotMatch(render(SellerTaskRow, { task, now: Date.parse("2026-09-10T00:00:00Z") }), /Срок отправки истёк/);
assert.match(render(SellerTaskRow, { task: orderTask({ ...order, paidAt: null }), now: 1 }), /срок не рассчитан/);
assert.match(returnTask({ id: 2, status: "RECEIVED", productTitle: "Рубашка" }).href, /returnId=2#return-2/);
for (const status of ["CLOSED", "REFUNDED", "REFUND_PENDING", "INSPECTED", "REJECTED"]) assert.equal(returnTask({ status }), null);
assert.equal(productTask({ id: 3, status: "NEEDS_REVISION", title: "Рубашка" }).title, "Товар на доработке");
for (const status of ["ACTIVE", "DRAFT", "ARCHIVED", "DELETED", "MODERATION"]) assert.equal(productTask({ status }), null);
const details = { ...order, subtotalAmount: 990.25, deliveryAmount: 50, discountAmount: 0, deliveryAddress: "Тестовый адрес", recipientPhone: "+79000000000", deliveryMethod: "PICKUP_POINT", delivery: { cdekNumber: "TEST", trackingUrl: "https://example.com/tracking" } };
const props = { order, details, loading: false, error: false, onRetry() {}, audience: "seller", showDeliveryLabel: true, openButtonLabel: "Открыть заказ" };
const html = render(OrderDetailsPanel, props);
assert.ok(html.indexOf("Товары в заказе") < html.indexOf(">Оплата<"));
assert.ok(html.indexOf(">Оплата<") < html.indexOf('>Доставка</h3>'));
assert.doesNotMatch(html, /1 шт|Количество|[·•]/);
assert.match(html, /990,25/);
assert.match(html, /1 040,25/);
assert.match(html, /delivery-label/);
assert.match(render(OrderDetailsPanel, { ...props, details: { ...details, items: [{ ...item, quantity: 2, lineTotal: 1980.5 }] } }), /2 шт/);
assert.doesNotMatch(render(OrderDetailsPanel, { ...props, audience: "buyer" }), /delivery-label/);
assert.match(render(OrderDetailsPanel, { ...props, details: null, error: true }), /role="alert"/);
assert.match(render(OrderDetailsPanel, { ...props, details: null, error: true }), /Товары<\/dt><dd>—/); // No invented subtotal.
const field = render(TextInput, { label: "Почта", error: "Проверьте адрес" });
assert.match(field, /data-ui="field"/);
assert.match(field, /aria-describedby=/);
assert.match(field, /aria-invalid="true"/);
for (const [name, shape] of [["package", "box"], ["shopping-bag", "receipt-text"], ["shipment-handoff", "truck"]]) {
  assert.match(render(Icon, { name }), new RegExp(`lucide-${shape}`));
  assert.match(render(Icon, { name }), /stroke-width="1.5"/);
}
async function checkQueue() {
  const originalFetch = global.fetch;
  let forbidden = false;
  const requests = [];
  global.fetch = async (url, options) => {
    options.signal.throwIfAborted();
    const parsed = new URL(url);
    assert.equal(options.credentials, "include");
    assert.ok(parsed.pathname.startsWith("/api/seller/"));
    const page = Number(parsed.searchParams.get("page"));
    requests.push(`${parsed.pathname}:${page}`);
    let content;
    if (parsed.pathname === "/api/seller/orders") content = [order, { ...order, id: 11, status: "CANCELED" }];
    else if (parsed.pathname.includes("returns")) content = page ? [{ id: 2, status: "RECEIVED", productTitle: "Рубашка" }] : [{ id: 1, status: "CLOSED" }];
    else content = [{ id: 3, status: "BLOCKED", title: "Рубашка" }, { id: 4, status: "ACTIVE" }];
    return { ok: !forbidden, status: forbidden ? 403 : 200, json: async () => ({ content, totalPages: parsed.pathname.includes("returns") ? 2 : 1 }) };
  };
  try {
    const tasks = await getSellerTasks(new AbortController().signal);
    assert.deepEqual(tasks.map(task => task.id), ["order-10", "return-2", "product-3"]);
    assert.ok(requests.includes("/api/seller/returns/list:1"));
    forbidden = true;
    await assert.rejects(getSellerTasks(new AbortController().signal), /Не удалось загрузить задачи/);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(getSellerTasks(controller.signal), { name: "AbortError" });
  } finally { global.fetch = originalFetch; }
}
checkQueue().then(() => console.log("PASS: paidAt + 72h, task eligibility, pagination/auth/cancellation, detail rows/quantities/money/roles, fields and icons"))
  .catch(error => { console.error(error); process.exitCode = 1; });
