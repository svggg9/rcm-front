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
const { shippingDeadline, getSellerTasks } = require("../app/seller/lib/sellerTasks.ts");
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
const task = { id: "order-10", title: "Новый заказ", object: "Заказ №10", description: "Рубашка", action: "Открыть", href: "/seller/orders?orderId=10", icon: "shopping-bag", tone: "neutral", dueAt: shippingDeadline(order.paidAt) };
assert.match(render(SellerTaskRow, { task, now: Date.parse("2026-09-13T00:00:00Z") }), /Срок отправки истёк/);
assert.doesNotMatch(render(SellerTaskRow, { task, now: Date.parse("2026-09-10T00:00:00Z") }), /Срок отправки истёк/);
assert.match(render(SellerTaskRow, { task: { ...task, dueAt: null }, now: 1 }), /срок не рассчитан/);
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
    assert.equal(parsed.pathname, "/api/seller/dashboard/tasks");
    assert.equal(parsed.searchParams.get("category"), "product");
    assert.equal(parsed.searchParams.get("size"), "20");
    assert.equal(page, 2);
    return { ok: !forbidden, status: forbidden ? 403 : 200, json: async () => ({ content: [task], number: 2, hasNext: false }) };
  };
  try {
    const result = await getSellerTasks(new AbortController().signal, "product", 2);
    assert.deepEqual(result.content.map(task => task.id), ["order-10"]);
    assert.equal(requests.length, 1);

    forbidden = true;
    await assert.rejects(getSellerTasks(new AbortController().signal, "product", 2), /Не удалось загрузить задачи/);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(getSellerTasks(controller.signal), { name: "AbortError" });
  } finally { global.fetch = originalFetch; }
}
checkQueue().then(() => console.log("PASS: paidAt + 72h, server task pagination/auth/cancellation, detail rows/quantities/money/roles, fields and icons"))
  .catch(error => { console.error(error); process.exitCode = 1; });
