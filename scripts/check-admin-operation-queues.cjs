/* eslint-disable @typescript-eslint/no-require-imports -- Offline state-transition regression for payment/refund queues; no network or browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' };
const pending = [];
let state, effects, slot, pendingEffects, tree;
const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const react = {
  useState(initial) { const i = slot++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
  useRef(initial) { const i = slot++; if (!(i in state)) state[i] = { current: initial }; return state[i]; },
  useCallback(fn, deps) { const i = slot++; if (!same(effects[i]?.deps, deps)) effects[i] = { deps, fn }; return effects[i].fn; },
  useEffect(fn, deps) { const i = slot++; if (!same(effects[i]?.deps, deps)) pendingEffects.push(() => { effects[i]?.cleanup?.(); effects[i] = { deps, cleanup: fn() }; }); },
};
const button = function Button() {};
const css = { default: {} };
let search = new URLSearchParams();
let confirmation;
const deps = {
  react, 'react/jsx-runtime': jsx, 'next/navigation': { useSearchParams: () => search },
  '../../components/ui/Button': { Button: button }, '../../components/ui/Loader': { Loader: 'loader' },
  '../../components/ui/Textarea': { Textarea: 'textarea' }, '../../components/ui/Dialog': { Dialog: 'dialog' },
  '../../components/ui/ConfirmActionButton': { useConfirmation: () => ({ confirmation: null, confirm: () => new Promise(resolve => { confirmation = resolve; }) }) },
  '../../components/ui/toast': { toast: { success() {}, error() {}, info() {} } },
  '../../lib/api': { API_URL: '', apiFetch: (path, init) => request(path, init) },
  '../../lib/apiRequest': { requestApiResponse: (path, init) => request(path, init) },
  '../../lib/apiErrors': { readApiError: async () => new Error('request failed') },
  '../lib/paymentOperations': { paymentRequest: (path, init) => request(path, init), refundLabel: () => '', operationMoney: () => '100 ₽' },
  './AdminPaymentReview.module.css': css,
};
function request(path, init) { return new Promise((resolve, reject) => pending.push({ path, init, resolve, reject })); }
function load(file, allExports = false) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', output)(mod, mod.exports, name => { assert(name in deps, name); return deps[name]; });
  return allExports ? mod.exports : Object.values(mod.exports)[0];
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function nodes(node, result = []) { if (!node || typeof node !== 'object') return result; if (Array.isArray(node)) { node.forEach(x => nodes(x, result)); return result; } result.push(node); nodes(node.props?.children, result); nodes(node.props?.main, result); nodes(node.props?.aside, result); return result; }
function findButton(text) { const item = nodes(tree).find(node => node.type === button && node.props.children === text); assert(item, `Missing button ${text}`); return item.props; }
function setup(component) {
  state = []; effects = []; pendingEffects = []; pending.length = 0;
  return () => { slot = 0; pendingEffects = []; tree = component({ onOpenOrder() {} }); const todo = pendingEffects; todo.forEach(run => run()); };
}
global.document = { hidden: false };
global.window = { addEventListener() {}, removeEventListener() {}, history: { pushState() {} } };
global.setInterval = () => 0; global.clearInterval = () => {};
const validationCode = ts.transpileModule(fs.readFileSync('app/admin/lib/adminOperationQueueValidation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const validationModule = { exports: {} };
new Function('module', 'exports', validationCode)(validationModule, validationModule.exports);
deps['../lib/adminOperationQueueValidation'] = validationModule.exports;
const payment = load('app/admin/components/AdminPaymentReview.tsx');
const refund = load('app/admin/components/AdminRefundOperations.tsx');
(async () => {
  let render = setup(payment); render();
  assert.equal(pending[0].path, '/api/admin/payment-review?page=0&size=20');
  const review = { orderId: 1, orderGroupId: 'group', status: 'CONFIRMED', paymentStatus: 'PENDING', paymentDueAt: null, reservationReleasedAt: null, initializationPending: true, latePaymentId: null, initializationRecoverable: true };
  pending.shift().resolve({ ok: true, json: async () => ({ content: [review], number: 0, totalPages: 2, totalElements: 2 }) }); await tick(); render();
  assert.equal(findButton('Проверить').disabled, false);
  findButton('Восстановить платёж').onClick();
  findButton('Обновить').onClick(); render();
  assert.equal(findButton('Проверить').disabled, true);
  confirmation(true); await tick(); assert.equal(pending.length, 1, 'refresh during confirmation must not POST');
  pending.shift().reject(new Error('offline')); await tick(); render();
  assert(!nodes(tree).some(n => n.type === button && n.props.children === 'Проверить'), 'failed refresh must remove stale actions');
  findButton('Обновить').onClick(); render();
  pending.shift().resolve({ ok: true, json: async () => ({ content: [review], number: 0, totalPages: 2, totalElements: 2 }) }); await tick(); render();
  findButton('Далее').onClick(); render();
  assert(!nodes(tree).some(n => n.type === button && n.props.children === 'Проверить'), 'old page must not be displayed');
  search = new URLSearchParams('refundId=33'); render = setup(refund); render();
  assert.equal(pending.at(-1).path, '/api/payments/refund-operations/33');
  const row = { id: 33, paymentId: 9, orderId: 12, status: 'PENDING', requestReference: 'ref', dispatchState: 'READY', amount: 100, currency: 'RUB', dispatchAttempts: 0, externalId: null, failureReason: null, dispatchedAt: null, nextDispatchAt: null };
  assert(validationModule.exports.isRefundOperation(row));
  for (const bad of [{ ...row, amount: -1 }, { ...row, dispatchState: 'BROKEN' }, { ...row, externalId: {} }, { ...row, requestReference: 5 }, { ...row, orderId: -1 }, { ...row, dispatchedAt: 'bad' }]) assert(!validationModule.exports.isRefundOperation(bad));
  assert(!validationModule.exports.isPaymentReviewPage({ content: [{ ...review, orderGroupId: '' }], number: 0, totalElements: 1, totalPages: 1 }, 0));
  pending.at(-1).resolve(row); await tick(); render();
  assert.equal(findButton('Отправить возврат').disabled, false);
  findButton('Отправить возврат').onClick();
  findButton('Обновить').onClick(); render();
  assert.equal(findButton('Отправить возврат').disabled, true);
  const count = pending.length; confirmation(true); await tick(); assert.equal(pending.length, count, 'refund refresh during confirmation must not POST');
  pending.at(-1).resolve({ ...row, amount: -1 }); await tick(); render();
  assert(!nodes(tree).some(n => n.type === button && n.props.children === 'Отправить возврат'), 'malformed 200 must clear actions');
  findButton('Обновить').onClick(); render();
  pending.at(-1).resolve(row); await tick(); render();
  findButton('Обновить').onClick(); render();
  pending.at(-1).reject(new Error('403')); await tick(); render();
  assert(!nodes(tree).some(n => n.type === button && n.props.children === 'Отправить возврат'), '403 must clear old data');
  assert(pending.every(item => item.init?.method !== 'POST'), 'all automatic requests must be reads');

  // The nested return block uses the real component and handlers, including lost replies.
  const requestError = function RequestError() {};
  const numericField = function NumericField() {};
  deps['../../components/ui/NumericField'] = { NumericField: numericField };
  deps['../../components/ui/RequestError'] = { RequestError: requestError };
  deps['../../components/ui/StatusBadge'] = { StatusBadge: 'badge' };
  deps['../../components/order-detail/OrderDetail'] = { OrderDetailSection: 'section' };
  deps['../../lib/useFieldValidation'] = load('app/lib/useFieldValidation.ts', true);
  deps['../../lib/formValidation'] = { scrollToFirstValidationError() {} };
  deps['./inputWhitespace'] = load('app/lib/inputWhitespace.ts', true);
  deps['../../lib/numericInput'] = load('app/lib/numericInput.ts', true);
  deps['./AdminReturnRequests.module.css'] = css;
  const returnCalls = [];
  deps['../../lib/returns'] = {
    returnReasonLabels: { DEFECT: 'Брак' }, returnStatusLabels: {},
    getAdminOrderReturns: orderId => { returnCalls.push('GET'); return request(`/returns/${orderId}`, { method: 'GET' }); },
    reviewAdminReturn: (id, decision, comment) => { returnCalls.push('POST'); return request(`/returns/${id}/${decision}`, { method: 'POST', comment }); },
    refundAdminReturn: (id, amount) => { returnCalls.push('POST'); return request(`/returns/${id}/refund`, { method: 'POST', amount }); },
  };
  let poll;
  const listeners = new Map();
  global.setInterval = callback => { poll = callback; return 0; };
  global.window.addEventListener = (name, callback) => listeners.set(name, callback);
  global.window.removeEventListener = (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); };
  global.window.dispatchEvent = event => listeners.get(event.type)?.();
  const returns = load('app/admin/components/AdminReturnRequests.tsx');
  let orderId = 2;
  render = setup(() => returns({ orderId })); render();
  assert(nodes(tree).some(node => node.type === 'loader'), 'Initial return reads show a loading state');
  pending.shift().reject(new Error('offline')); await tick(); render();
  const recovery = () => nodes(tree).find(node => node.type === requestError)?.props;
  assert(recovery()?.message.includes('Не удалось проверить'), 'Initial failure must not look like no returns');
  recovery().onRetry(); render();
  const requested = { id: 60, orderId: 2, status: 'SUBMITTED', reason: 'DEFECT', photoUrls: [], productTitle: 'Товар', quantity: 1 };
  const inspected = { ...requested, id: 61, status: 'INSPECTED', requestedAmount: 100, approvedRefundAmount: 90, refundId: null };
  pending.shift().resolve([requested, inspected]); await tick(); render();
  assert.equal(findButton('Одобрить').disabled, false);
  const amountField = () => nodes(tree).find(node => node.type === numericField)?.props;
  amountField().onChange({ target: { value: '75' } }); render();
  const staleApproval = findButton('Одобрить').onClick;
  poll();
  staleApproval();
  assert.equal(pending.length, 1, 'A GET immediately blocks even a handler captured before the render');
  render();
  assert.equal(findButton('Одобрить').disabled, true);
  assert.equal(findButton('Создать запрос возврата').disabled, true);
  pending.shift().reject(new Error('403')); await tick(); render();
  assert(recovery(), 'Poll failure exposes a recovery action while keeping the confirmed rows');
  staleApproval(); findButton('Создать запрос возврата').onClick();
  assert.equal(pending.length, 0, 'Failed reads cannot submit commands from retained rows');
  recovery().onRetry(); render();
  pending.shift().resolve([requested, inspected]); await tick(); render();
  assert.equal(amountField().value, '75', 'Refreshing permissions preserves the operator amount');
  const refundClick = findButton('Создать запрос возврата').onClick;
  refundClick(); refundClick(); render();
  assert.equal(pending.length, 1, 'Double clicks submit one refund command');
  assert.equal(pending[0].init.amount, 75);
  assert.equal(findButton('Одобрить').disabled, true, 'Other return commands are blocked during a mutation');
  pending.shift().reject(new Error('lost reply')); await tick(); render();
  assert(recovery()?.message.includes('не подтверждён'));
  refundClick(); staleApproval();
  assert.equal(pending.length, 0, 'A lost mutation reply requires a fresh read before another command');
  poll(); render();
  const refundPending = { ...inspected, status: 'REFUND_PENDING', refundId: 90 };
  pending.shift().resolve([requested, refundPending]); await tick(); render();
  assert(!nodes(tree).some(node => node.type === button && node.props.children === 'Создать запрос возврата'), 'Accepted refund is discovered by GET rather than resubmitted');
  assert.equal(returnCalls.filter(method => method === 'POST').length, 1, 'No automatic financial POST');
  findButton('Одобрить').onClick(); render();
  pending.shift().resolve({ ...requested, status: 'APPROVED' }); await tick(); render();
  assert.equal(pending.length, 1, 'Confirmed mutation refreshes the whole return snapshot with GET');
  assert.equal(pending[0].init.method, 'GET');
  pending.shift().resolve([{ ...requested, status: 'APPROVED' }, refundPending]); await tick(); render();
  poll(); render();
  const oldRead = pending.shift();
  orderId = 3; render();
  assert(!nodes(tree).some(node => node.type === button && node.props.children === 'Одобрить'), 'Order navigation cannot expose previous order commands');
  pending.shift().resolve([]); await tick(); render();
  assert.equal(tree, null, 'Only a confirmed empty result may hide the return section');
  oldRead.resolve([requested, inspected]); await tick(); render();
  assert.equal(tree, null, 'Late responses from the previous order must be ignored');

  listeners.clear();
  const orderContract = load('app/lib/order-contract.ts', true);
  deps['./order-contract'] = orderContract;
  deps['../../lib/order-contract'] = orderContract;
  deps['../../lib/useOrderActions'] = load('app/lib/useOrderActions.ts', true);
  deps['../../components/order-detail/OrderWorkflowSummary'] = { OrderWorkflowSummary: 'workflow' };
  deps['../../lib/delivery'] = { formatCdekShipmentStatus: String };
  deps['../../lib/phone'] = { formatRussianPhone: String };
  deps['./AdminReturnRequests'] = { AdminReturnRequests: 'returns' };
  deps['../../components/order-detail/OrderDetail'] = { orderDetailStyles: {}, OrderDetailLayout: 'layout',
    OrderDetailField: 'field', OrderDetailFields: 'fields', OrderDetailPanelFields: 'fields',
    OrderDetailProductList: 'products', OrderDetailSection: 'section', OrderDetailSummary: 'summary' };
  const confirmations = [];
  deps['../../components/ui/ConfirmActionButton'] = {
    useConfirmation: () => ({ confirmation: null, confirm: () => new Promise(resolve => confirmations.push(resolve)) }),
  };
  const details = load('app/admin/components/AdminOrderDetails.tsx');
  const snapshot = (refundAllowed = true, cancelAllowed = true) => ({ id: 2, status: 'CONFIRMED', paymentStatus: 'PAID', deliveryStatus: 'PENDING',
    createdAt: '2026-11-07T00:00:00Z', items: [], workflow: { version: 1, actions: [
      { code: 'REFUND', allowed: refundAllowed }, { code: 'CANCEL_DELIVERY', allowed: cancelAllowed },
    ] } });
  let detailOrder = snapshot();
  const detailProps = { refunding: false, deliveryCancelling: false, formatOrderStatus: String,
    formatPaymentStatus: String, formatDeliveryStatus: String, buildStatusLabel: () => 'Заказ',
    onRefund: () => request('/order/refund', { method: 'POST' }),
    onCancelDelivery: () => request('/order/delivery/cancel', { method: 'POST' }),
    onRefresh: async () => { try { detailOrder = await request('/order', { method: 'GET' }); } catch { /* Parent keeps the old snapshot on GET failure. */ } },
  };
  render = setup(() => details({ ...detailProps, order: detailOrder })); render();
  findButton('Вернуть оплату').onClick(); findButton('Отменить доставку').onClick(); render();
  assert.equal(confirmations.length, 1, 'One shared lock protects both confirmation triggers');
  detailOrder = snapshot(false, true); render();
  confirmations.shift()(true); await tick(); render();
  assert.equal(pending.length, 0, 'A status change during confirmation cancels the old command');
  detailOrder = snapshot(); render();
  const staleCancel = findButton('Отменить доставку').onClick;
  findButton('Вернуть оплату').onClick(); findButton('Вернуть оплату').onClick();
  assert.equal(confirmations.length, 1, 'Double clicks cannot open two confirmations');
  confirmations.shift()(true); await tick(); render();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].init.method, 'POST');
  pending.shift().reject(new Error('lost refund response')); await tick(); render();
  assert(recovery()?.message.includes('не подтверждён'));
  assert.equal(findButton('Вернуть оплату').disabled, true);
  assert.equal(findButton('Отменить доставку').disabled, true);
  staleCancel();
  assert.equal(confirmations.length, 0, 'Captured handlers cannot bypass a lost-result block');
  recovery().onRetry(); render();
  assert.equal(pending[0].init.method, 'GET', 'Recovery only reads the order');
  pending.shift().reject(new Error('failed GET')); await tick(); render();
  assert.equal(findButton('Вернуть оплату').disabled, true, 'A swallowed GET failure must not unblock actions');
  recovery().onRetry(); render();
  pending.shift().resolve(detailOrder); await tick(); render();
  assert.equal(findButton('Отменить доставку').disabled, true, 'A resolved refresh Promise without a new snapshot is insufficient');
  recovery().onRetry(); render();
  pending.shift().resolve(snapshot(false, true)); await tick(); render(); render();
  assert(!recovery());
  assert.equal(findButton('Отменить доставку').disabled, false);
  findButton('Отменить доставку').onClick(); confirmations.shift()(true); await tick(); render();
  pending.shift().reject(new Error('lost cancellation response')); await tick(); render();
  assert.equal(findButton('Отменить доставку').disabled, true);
  recovery().onRetry(); render();
  pending.shift().resolve(snapshot()); await tick(); render(); render();
  findButton('Вернуть оплату').onClick(); confirmations.shift()(true); await tick(); render();
  pending.shift().resolve(); await tick(); render();
  assert(!nodes(tree).some(node => node.type === button && node.props.children === 'Вернуть оплату'), 'Confirmed queued refund retains its one-submit guard');
  assert.equal(findButton('Отменить доставку').disabled, true, 'Successful POST without a fresh follow-up snapshot still needs reconciliation');
  recovery().onRetry(); render();
  pending.shift().resolve(snapshot()); await tick(); render(); render();
  assert(!nodes(tree).some(node => node.type === button && node.props.children === 'Вернуть оплату'), 'Refreshing must not discard the queued refund guard');
  assert.equal(findButton('Отменить доставку').disabled, false);
  assert.equal(pending.length, 0, 'Neither failures nor fresh snapshots automatically repeat POST commands');
  console.log('PASS: queue and order isolation, confirmation races, read/error recovery, stale-action and double-submit guards, preserved input and queued refund, lost-result GET reconciliation, no automatic POST');
})().catch(error => { console.error(error); process.exitCode = 1; });
