/* eslint-disable @typescript-eslint/no-require-imports -- Offline transport regression. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(path, deps = {}) {
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, name => { assert(name in deps, name); return deps[name]; });
  return mod.exports;
}
const errors = load('app/lib/apiErrors.ts');
let handler, calls = 0;
const fetch = async (...args) => { calls++; return handler(...args); };
const request = load('app/lib/apiRequest.ts', { './api': { apiFetch: fetch }, './apiErrors': errors });
const validation = load('app/admin/lib/adminOperationQueueValidation.ts');
const { paymentRequest } = load('app/admin/lib/paymentOperations.ts', {
  '../../lib/api': { API_URL: '' }, '../../lib/apiErrors': errors, '../../lib/apiRequest': request,
  './adminOperationQueueValidation': validation,
});
const row = { id: 33, paymentId: 9, orderId: 12, status: 'PENDING', requestReference: 'ref', dispatchState: 'READY', amount: 100, currency: 'RUB', dispatchAttempts: 0, externalId: null, failureReason: null, dispatchedAt: null, nextDispatchAt: null };
const path = '/api/payments/refund-operations/33/execute';
async function fail(h, expected) {
  handler = h; calls = 0;
  await assert.rejects(paymentRequest(path, { method: 'POST' }), err => { assert(expected.test(err.message), err.message); assert(!err.message.includes('SERVER_SECRET')); return true; });
  assert.equal(calls, 1, 'Transport must not retry');
}
(async () => {
  await fail(() => { throw new TypeError('Failed to fetch SERVER_SECRET'); }, /неизвестен.*сверьте/);
  await fail(() => { throw new DOMException('timeout', 'TimeoutError'); }, /неизвестен.*сверьте/);
  await fail(() => new Response('not json', { status: 200 }), /неизвестен.*сверьте/);
  await fail(() => Response.json({ ...row, amount: -1 }), /неизвестен.*сверьте/);
  await fail(() => Response.json({ ...row, id: 34 }), /неизвестен.*сверьте/);
  await fail(() => Response.json({ message: 'SERVER_SECRET' }, { status: 500 }), /неизвестен.*сверьте/);
  await fail(() => Response.json({ message: 'SERVER_SECRET' }, { status: 409 }), /изменилось.*обновите/i);
  await fail(() => Response.json({ message: 'SERVER_SECRET' }, { status: 403 }), /прав/);
  handler = () => Response.json({ ...row, paymentId: 10 }); calls = 0;
  await assert.rejects(paymentRequest('/api/admin/payment-review/12/late-refund?paymentId=9', { method: 'POST' }), /неизвестен.*сверьте/);
  assert.equal(calls, 1);
  handler = () => Response.json(row); calls = 0;
  assert.equal((await paymentRequest(path, { method: 'POST' })).id, 33); assert.equal(calls, 1);
  handler = () => Response.json({ content: [] });
  assert.deepEqual(await paymentRequest('/api/payments/refund-operations?page=0'), { content: [] });
  console.log('PASS: safe unknown-result messages, malformed responses, authorization/conflict, single request');
})().catch(error => { console.error(error); process.exitCode = 1; });
