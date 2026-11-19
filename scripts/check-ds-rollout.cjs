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
const { HeaderIcon } = require("../app/components/Header/HeaderIcon.tsx");
const { BuyerNavigationIcon } = require("../app/components/BuyerNavigation/BuyerNavigationIcon.tsx");
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const { adminDemoCategories, adminDemoProduct, adminDemoPayout, payoutExamples } = require("../app/design-system/AdminCoverage.tsx");
const { normalizeCategories } = require("../app/lib/categories.ts");
const { AdminProductDetails } = require("../app/admin/components/AdminProductDetails.tsx");
assert.equal(normalizeCategories(adminDemoCategories)[0].id, adminDemoProduct.categoryId);
const adminDetail = render(AdminProductDetails, {
  product: adminDemoProduct, categories: adminDemoCategories, actionProductId: null, loadDates: false,
  onBack() {}, onAssignCategory: async () => {}, onApprove: async () => {}, onReturnToRevision() {},
  onBlock: async () => {}, onUnblock: async () => {},
});
assert.match(adminDetail, /Основные данные/);
assert.match(adminDetail, /Комментарий модератора/);
const { AdminPayoutDetailContent } = require("../app/admin/components/AdminPayoutRegistry.tsx");
const payoutReview = render(AdminPayoutDetailContent, { detail: {
  payout: { ...adminDemoPayout, status: "REVIEW" }, version: 1, allowedActions: payoutExamples.REVIEW, attempts: [], history: [],
}, loading: false, error: "", busy: false, onAction: async () => {} });
assert.match(payoutReview, /Результат перевода неизвестен/);
assert.match(payoutReview, /Заказы и удержания в выплате/);
assert.match(payoutReview, /Банковские попытки ещё не начаты/);
assert.doesNotMatch(payoutReview, /Подготовить новую попытку|Отменить реестр/);
for (const IconComponent of [HeaderIcon, BuyerNavigationIcon]) {
  for (const [cartCount, level] of [[0, "empty"], [1, "half"], [2, "full"], [20, "full"]]) {
    assert.match(render(IconComponent, { name: "bag", cartCount }), new RegExp(`data-level="${level}"`));
  }
}
const item = { productId: 1, variantId: 1, productTitle: "Рубашка", brandName: "Бренд", imageUrl: null, size: "M", color: "Чёрный", quantity: 1, price: 990.25, lineTotal: 990.25 };
const order = { id: 10, status: "PROCESSING", paymentStatus: "PAID", deliveryStatus: "READY_FOR_SHIPMENT", paidAt: "2026-09-09T10:00:00+03:00", createdAt: "2026-08-01T00:00:00Z", items: [item], totalAmount: 1040.25, currency: "RUB", recipientName: "Получатель" };
assert.equal(shippingDeadline(order.paidAt), "2026-09-12T07:00:00.000Z");
assert.equal(shippingDeadline(null), undefined);
assert.equal(shippingDeadline("bad"), undefined);
const task = { id: "order-10", title: "Новый заказ", object: "Заказ №10", description: "Рубашка", action: "Открыть", href: "/seller/orders?orderId=10", icon: "shopping-bag", tone: "neutral", dueAt: shippingDeadline(order.paidAt) };
assert.match(render(SellerTaskRow, { task, now: Date.parse("2026-09-13T00:00:00Z") }), /Срок отправки истёк/);
assert.doesNotMatch(render(SellerTaskRow, { task, now: Date.parse("2026-09-10T00:00:00Z") }), /Срок отправки истёк/);
assert.match(render(SellerTaskRow, { task: { ...task, dueAt: null }, now: 1 }), /срок не рассчитан/);
const details = { ...order, subtotalAmount: 990.25, deliveryAmount: 50, discountAmount: 0, deliveryAddress: "Тестовый адрес", recipientPhone: "+79000000000", deliveryMethod: "PICKUP_POINT", delivery: { cdekNumber: "TEST", trackingUrl: "https://example.com/tracking" },
  workflow: { version: 1, audience: "SELLER", evaluatedAt: "2026-09-09T10:00:00+03:00", events: [],
    actions: [{ code: "DOWNLOAD_LABEL", allowed: true, reasonCode: null, reason: null, scope: "ORDER", availableUntil: null }] } };
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
const describedField = render(TextInput, { id: "test-email", label: "Почта", hint: "Рабочий адрес", error: "Проверьте адрес",
  "aria-describedby": "external-help external-help", required: true });
assert.match(describedField, /<label\b[^>]*for="test-email"[^>]*>Почта<\/label>/);
assert.match(describedField, /<input[^>]*id="test-email"/);
assert.match(describedField, /aria-describedby="external-help test-email-hint test-email-error"/);
assert.match(describedField, /id="test-email-hint">Рабочий адрес/);
assert.match(describedField, /id="test-email-error">Проверьте адрес/);
assert.match(describedField, /required=""/);
assert.ok([...describedField.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)].every(match => !/<input|Рабочий адрес|Проверьте адрес/.test(match[1])),
  "A field label must not contain its hints, errors or interactive adornments");
const trailingField = render(TextInput, { id: "test-password", label: "Пароль", type: "password", size: "large",
  trailing: React.createElement("button", { type: "button", "aria-label": "Показать пароль" }, "Глаз") });
assert.match(trailingField, /data-field-size="large"/);
assert.match(trailingField, /class="inputShell"/);
assert.match(trailingField, /aria-label="Показать пароль"/);
assert.ok([...trailingField.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)].every(match => !/<button/.test(match[1])),
  "An adornment action is outside the input label");
for (const state of ["readOnly", "disabled"]) {
  const stateField = render(TextInput, { id: `test-${state}`, label: "Значение", defaultValue: "Можно прочитать", [state]: true });
  assert.match(stateField, new RegExp(`${state === "readOnly" ? "readOnly" : "disabled"}=""`));
}
const { FormMultiSelect } = require("../app/components/ui/FormMultiSelect.tsx");
const { FormSelect } = require("../app/components/ui/FormSelect.tsx");
for (const [Component, selection] of [[FormSelect, { value: "a" }], [FormMultiSelect, { values: ["a"] }]]) {
  const dropdown = render(Component, { id: "test-dropdown", label: "Категория", required: true, readOnly: true,
    hint: "Подсказка", error: "Выберите значение", ...selection, options: [{ value: "a", label: "Одежда" }], onChange() {} });
  assert.match(dropdown, /<label\b[^>]*for="test-dropdown"/);
  assert.match(dropdown, /aria-required="true"/);
  assert.match(dropdown, /aria-readonly="true"/);
  assert.match(dropdown, /aria-invalid="true"/);
  assert.match(dropdown, /aria-describedby="test-dropdown-hint test-dropdown-error"/);
  assert.match(dropdown, /aria-hidden="true" inert=""/);
  assert.match(dropdown, /aria-selected="true" tabindex="-1"/);
  assert.match(dropdown, /title="Одежда"/);
}
assert.match(render(FormSelect, { label: "Пустой", value: "", options: [], onChange() {} }), /Нет доступных вариантов/);
assert.match(render(FormMultiSelect, { label: "Пустой", values: [], options: [], onChange() {} }), /Нет доступных вариантов/);
assert.match(render(Icon, { name: "package" }), /lucide-box/);
assert.match(render(Icon, { name: "package" }), /stroke-width="1.5"/);
const { DeliveryTruckIcon } = require("../app/components/ui/DeliveryTruckIcon.tsx");
for (const name of ["shipment-handoff", "delivery-truck"]) {
  assert.equal(render(Icon, { name }), render(DeliveryTruckIcon, { size: 20, strokeWidth: 1.5 }),
    `${name} uses the shared delivery icon`);
}
const { OrderIcon } = require("../app/components/ui/OrderIcon.tsx");
assert.equal(render(Icon, { name: "shopping-bag" }), render(OrderIcon, { size: 20, strokeWidth: 1.5 }),
  "Order actions use the same parcel contour as the shared component");
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
